/**
 * Multi-Asset Polymarket Trading Bot
 * Supports BTC, ETH across multiple timeframes
 * 
 * Fixed issues:
 * - Thread-safe session management with mutex
 * - Proper cleanup of stale sessions
 * - Better error boundaries
 * - Memory leak prevention
 */

import { PolymarketClient } from './polymarket';
import { MultiPriceTracker, getPriceTracker } from './multi-price-tracker';
import { getNewsService, NewsResearchService, ResearchReport } from './news-research';
import { discoverAllMarkets, DiscoveredMarket, watchForNewMarkets } from './market-discovery';
import { shouldEnterMarket, checkProfitability, logProfitabilityCheck, PROFITABILITY_DEFAULTS } from './profitability';
import {
  CryptoAsset,
  Timeframe,
  CandleMarket,
  MultiAssetSession,
  MultiAssetConfig,
  MultiAssetStats,
  BetRecord,
  createDefaultConfig,
  timeframeToDuration,
} from './types-multi';

// Simple mutex for session operations
class SessionMutex {
  private locked = false;
  private queue: (() => void)[] = [];

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    } else {
      this.locked = false;
    }
  }
}

const SESSION_STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export class MultiAssetBot {
  private config: MultiAssetConfig;
  private polymarket: PolymarketClient;
  private priceTracker: MultiPriceTracker;
  private newsService: NewsResearchService;
  
  // Active sessions per market (with mutex protection)
  private sessions: Map<string, MultiAssetSession> = new Map();
  private sessionMutex = new SessionMutex();
  
  // Monitoring intervals
  private marketScanInterval: NodeJS.Timeout | null = null;
  private tradingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // Track if we're processing to prevent overlapping ticks
  private tradingTickInProgress = false;
  private scanInProgress = false;
  
  // Stats
  private stats: MultiAssetStats = {
    byAsset: {},
    byTimeframe: {},
    overall: {
      totalMarkets: 0,
      wins: 0,
      losses: 0,
      totalWagered: 0,
      totalPnL: 0,
    },
  };

  constructor(config?: Partial<MultiAssetConfig>) {
    this.config = { ...createDefaultConfig(), ...config };
    
    this.polymarket = new PolymarketClient({
      privateKey: process.env.PRIVATE_KEY || '',
      dryRun: this.config.dryRun,
      totalBudget: 100, // Not used directly
      minProbability: this.config.minProbability,
      betSchedule: [],
      chainId: 137,
      polymarketHost: 'https://clob.polymarket.com',
      gammaApi: 'https://gamma-api.polymarket.com',
      wsUrl: 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
    });
    
    this.priceTracker = getPriceTracker(this.config.assets);
    this.newsService = getNewsService(process.env.TAVILY_API_KEY);
  }

  async start(): Promise<void> {
    console.log(`
╔════════════════════════════════════════════════════════╗
║  🚀 MULTI-ASSET POLYMARKET BOT                         ║
║  ${this.config.dryRun ? '🔸 DRY RUN MODE' : '💰 LIVE TRADING'}                                   ║
╠════════════════════════════════════════════════════════╣
║  Assets: ${this.config.assets.join(', ').padEnd(43)}║
║  Timeframes: ${this.config.timeframes.join(', ').padEnd(39)}║
╚════════════════════════════════════════════════════════╝
    `);

    try {
      // Initialize
      await this.polymarket.initialize();
      await this.priceTracker.connect();

      // Load any manual markets
      await this.loadManualMarkets();

      // Start monitoring
      this.startMarketScanning();
      this.startTradingLoop();
      this.startCleanupLoop();

      console.log('\n✅ Bot started! Monitoring for markets...\n');
    } catch (error: any) {
      console.error('❌ Failed to start bot:', error.message);
      throw error;
    }
  }

  private async loadManualMarkets(): Promise<void> {
    for (const manual of this.config.manualMarkets) {
      const market: CandleMarket = {
        marketId: `manual-${manual.asset}-${manual.timeframe}-${Date.now()}`,
        asset: manual.asset,
        timeframe: manual.timeframe,
        upTokenId: manual.upTokenId,
        downTokenId: manual.downTokenId,
        startTime: new Date(),
        endTime: new Date(Date.now() + timeframeToDuration(manual.timeframe) * 60000),
        durationMinutes: timeframeToDuration(manual.timeframe),
        openPrice: this.priceTracker.getPrice(manual.asset),
        currentPrice: this.priceTracker.getPrice(manual.asset),
        upProbability: 0.5,
        downProbability: 0.5,
        question: manual.question || `${manual.asset} ${manual.timeframe} up or down?`,
        source: 'manual',
      };
      
      await this.startSession(market);
    }
  }

  private startMarketScanning(): void {
    // Scan for new markets every 30 seconds
    this.marketScanInterval = setInterval(async () => {
      if (this.scanInProgress) {
        console.log('⏳ Market scan still in progress, skipping...');
        return;
      }
      await this.scanForMarkets();
    }, 30 * 1000);

    // Initial scan
    this.scanForMarkets();
  }

  private async scanForMarkets(): Promise<void> {
    if (this.scanInProgress) return;
    this.scanInProgress = true;
    
    try {
      console.log('🔍 Scanning for markets...');
      
      const discovered = await discoverAllMarkets(
        this.config.assets,
        this.config.timeframes
      );
      
      for (const market of discovered) {
        // Skip if already in a session (thread-safe check)
        if (await this.hasSession(market.slug || market.eventId)) continue;
        
        // Check if market is currently live and not too close to ending
        const now = Date.now();
        const endTime = market.endTime.getTime();
        const minutesRemaining = (endTime - now) / 60000;
        
        // Only join markets with at least 3 minutes remaining
        if (minutesRemaining < 3) continue;
        
        // Convert to our CandleMarket format
        const candleMarket: CandleMarket = {
          marketId: market.eventId,
          asset: market.asset,
          timeframe: market.timeframe,
          upTokenId: market.upTokenId,
          downTokenId: market.downTokenId,
          startTime: market.startTime,
          endTime: market.endTime,
          durationMinutes: timeframeToDuration(market.timeframe),
          openPrice: this.priceTracker.getPrice(market.asset),
          currentPrice: this.priceTracker.getPrice(market.asset),
          upProbability: market.upPrice,
          downProbability: market.downPrice,
          question: market.title,
          slug: market.slug,
          source: 'auto',
        };
        
        await this.startSession(candleMarket);
      }
      
      const sessionCount = await this.getSessionCount();
      if (discovered.length > 0) {
        console.log(`  Found ${discovered.length} markets, ${sessionCount} active sessions`);
      }
    } catch (error: any) {
      console.error('Market scan error:', error.message);
    } finally {
      this.scanInProgress = false;
    }
  }

  /**
   * Thread-safe check for existing session
   */
  private async hasSession(key: string): Promise<boolean> {
    await this.sessionMutex.acquire();
    try {
      return this.sessions.has(key);
    } finally {
      this.sessionMutex.release();
    }
  }

  /**
   * Thread-safe session count
   */
  private async getSessionCount(): Promise<number> {
    await this.sessionMutex.acquire();
    try {
      return this.sessions.size;
    } finally {
      this.sessionMutex.release();
    }
  }

  /**
   * Thread-safe session snapshot (for iteration)
   */
  private async getSessionSnapshot(): Promise<[string, MultiAssetSession][]> {
    await this.sessionMutex.acquire();
    try {
      return Array.from(this.sessions.entries());
    } finally {
      this.sessionMutex.release();
    }
  }

  private getAssetName(asset: CryptoAsset): string {
    const names: Record<CryptoAsset, string> = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'SOL': 'Solana',
    };
    return names[asset];
  }

  private async startSession(market: CandleMarket): Promise<void> {
    await this.sessionMutex.acquire();
    try {
      // Double-check not already in session
      if (this.sessions.has(market.marketId)) {
        return;
      }

      console.log(`
┌─────────────────────────────────────────────────┐
│ 📈 NEW SESSION: ${market.asset} ${market.timeframe}
├─────────────────────────────────────────────────┤
│ Market: ${market.marketId.substring(0, 30)}...
│ ${market.asset} Open: $${market.openPrice.toLocaleString()}
│ Budget: $${this.config.budgetPerMarket[market.timeframe]}
└─────────────────────────────────────────────────┘
      `);

      // Set open price
      this.priceTracker.setOpenPrice(market.asset);

      // Create bet schedule
      const schedule = this.config.betSchedules[market.timeframe];
      const budget = this.config.budgetPerMarket[market.timeframe];
      
      const bets: BetRecord[] = schedule.map(s => ({
        minute: Math.floor(s.pctTime * market.durationMinutes),
        amount: s.pctBudget * budget,
        executed: false,
      }));

      // Create session
      const session: MultiAssetSession = {
        market,
        side: null,
        lockedAt: null,
        bets,
        totalInvested: 0,
        totalShares: 0,
        result: 'PENDING',
        payout: 0,
        profit: 0,
      };

      this.sessions.set(market.marketId, session);
    } finally {
      this.sessionMutex.release();
    }

    // Fetch news (async, outside mutex)
    const session = this.sessions.get(market.marketId);
    if (session) {
      this.fetchNewsForSession(session);
    }
  }

  private async fetchNewsForSession(session: MultiAssetSession): Promise<void> {
    if (!this.config.useNewsResearch) return;

    try {
      const query = `${session.market.asset} ${this.getAssetName(session.market.asset)} price movement today`;
      const report = await this.newsService.searchBitcoinNews(query);
      
      session.newsSentiment = report.sentiment;
      session.newsConfidence = report.confidence;
      
      const emoji = { BULLISH: '🟢', BEARISH: '🔴', NEUTRAL: '⚪' };
      console.log(`  ${emoji[report.sentiment]} ${session.market.asset} News: ${report.sentiment}`);
    } catch {
      // Continue without news
    }
  }

  private startTradingLoop(): void {
    // Check every 10 seconds
    this.tradingInterval = setInterval(async () => {
      if (this.tradingTickInProgress) {
        return; // Skip if previous tick still running
      }
      await this.tradingTick();
    }, 10 * 1000);
  }

  /**
   * Start cleanup loop to remove stale sessions
   */
  private startCleanupLoop(): void {
    // Clean up stale sessions every 5 minutes
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupStaleSessions();
    }, 5 * 60 * 1000);
  }

  /**
   * Remove sessions that are stuck or too old
   */
  private async cleanupStaleSessions(): Promise<void> {
    await this.sessionMutex.acquire();
    try {
      const now = Date.now();
      const toRemove: string[] = [];
      
      for (const [marketId, session] of this.sessions) {
        const sessionAge = now - session.market.startTime.getTime();
        const expectedDuration = session.market.durationMinutes * 60 * 1000;
        
        // Remove if session is way past its expected end time
        if (sessionAge > expectedDuration + SESSION_STALE_THRESHOLD_MS) {
          console.log(`🧹 Cleaning up stale session: ${marketId}`);
          toRemove.push(marketId);
        }
      }
      
      for (const marketId of toRemove) {
        this.sessions.delete(marketId);
      }
      
      if (toRemove.length > 0) {
        console.log(`🧹 Cleaned up ${toRemove.length} stale sessions`);
      }
    } finally {
      this.sessionMutex.release();
    }
  }

  private async tradingTick(): Promise<void> {
    if (this.tradingTickInProgress) return;
    this.tradingTickInProgress = true;
    
    try {
      const now = Date.now();
      
      // Get snapshot of sessions (thread-safe)
      const sessionsArray = await this.getSessionSnapshot();

      for (const [marketId, session] of sessionsArray) {
        try {
          await this.processSession(session, now);
        } catch (error: any) {
          console.error(`Error processing session ${marketId}:`, error.message);
        }
      }
    } finally {
      this.tradingTickInProgress = false;
    }
  }

  /**
   * Process a single session (extracted for better error handling)
   */
  private async processSession(session: MultiAssetSession, now: number): Promise<void> {
    const { market } = session;
    
    // Calculate time into market
    const marketStart = market.startTime.getTime();
    const minutesSinceStart = (now - marketStart) / (60 * 1000);

    // Update prices
    const currentPrice = this.priceTracker.getPrice(market.asset);
    if (currentPrice > 0) {
      market.currentPrice = currentPrice;
    }

    // Check if market ended
    if (minutesSinceStart >= market.durationMinutes) {
      await this.endSession(session);
      return;
    }

    // Update market odds
    await this.updateMarketOdds(session);

    // Decide side if not locked
    if (!session.side && minutesSinceStart >= 1) {
      this.decideSide(session);
    }

    // Place bets
    if (session.side) {
      await this.checkAndPlaceBets(session, minutesSinceStart);
    }

    // Log status
    this.logSessionStatus(session, minutesSinceStart);
  }

  private async updateMarketOdds(session: MultiAssetSession): Promise<void> {
    try {
      const odds = await this.polymarket.getBTCMarketOdds(session.market as any);
      if (odds && typeof odds.upProbability === 'number') {
        session.market.upProbability = odds.upProbability;
        session.market.downProbability = odds.downProbability;
      }
    } catch {
      // Use price-based estimate as fallback
      const change = this.priceTracker.getPriceChangePct(session.market.asset);
      const momentum = Math.tanh(change);
      session.market.upProbability = 0.5 + momentum * 0.15;
      session.market.downProbability = 1 - session.market.upProbability;
    }
  }

  private decideSide(session: MultiAssetSession): void {
    const { market } = session;
    const priceChange = this.priceTracker.getPriceChange(market.asset);
    const strength = this.priceTracker.getMovementStrength(market.asset);

    if (strength < 0.1) return; // Wait for clearer signal

    const side: 'UP' | 'DOWN' = priceChange > 0 ? 'UP' : 'DOWN';
    
    // News confirmation
    if (session.newsSentiment && session.newsConfidence && session.newsConfidence > 0.6) {
      if (
        (session.newsSentiment === 'BULLISH' && side === 'DOWN') ||
        (session.newsSentiment === 'BEARISH' && side === 'UP')
      ) {
        console.log(`  ⚠️ ${market.asset}: News conflicts with price (proceeding anyway)`);
      }
    }

    session.side = side;
    session.lockedAt = new Date();
    console.log(`\n🔒 ${market.asset} ${market.timeframe}: LOCKED ${side}`);
  }

  private async checkAndPlaceBets(session: MultiAssetSession, minutesSinceStart: number): Promise<void> {
    const { market, bets } = session;

    for (const bet of bets) {
      if (bet.executed) continue;
      if (bet.minute > minutesSinceStart) continue;

      // Check probability threshold
      const prob = session.side === 'UP' ? market.upProbability : market.downProbability;
      if (prob < this.config.minProbability) {
        console.log(`  ⏭️ ${market.asset}: Skip bet at min ${bet.minute} (prob ${(prob*100).toFixed(0)}% < threshold)`);
        bet.executed = true;
        continue;
      }

      // PROFITABILITY CHECK: Only bet if expected value > costs
      const profitCheck = shouldEnterMarket(prob, prob, bet.amount);
      
      if (!profitCheck.enter) {
        console.log(`  💸❌ ${market.asset}: Skip bet - ${profitCheck.reason}`);
        bet.executed = true;
        continue;
      }

      // Adjust bet amount if profitability suggests different size
      if (profitCheck.suggestedBet > 0 && profitCheck.suggestedBet !== bet.amount) {
        const adjustedBet = Math.min(profitCheck.suggestedBet, bet.amount);
        if (adjustedBet < PROFITABILITY_DEFAULTS.minBetSize) {
          console.log(`  💸❌ ${market.asset}: Adjusted bet $${adjustedBet.toFixed(2)} below minimum`);
          bet.executed = true;
          continue;
        }
        bet.amount = adjustedBet;
      }

      // Place bet
      await this.placeBet(session, bet);
    }
  }

  private async placeBet(session: MultiAssetSession, bet: BetRecord): Promise<void> {
    const { market } = session;
    
    if (!session.side) {
      console.log(`  ⚠️ ${market.asset}: Cannot place bet, no side selected`);
      return;
    }
    
    const tokenId = session.side === 'UP' ? market.upTokenId : market.downTokenId;
    const price = session.side === 'UP' ? market.upProbability : market.downProbability;

    // Validate token ID exists
    if (!tokenId) {
      console.log(`  ⚠️ ${market.asset}: Missing token ID for ${session.side}`);
      bet.executed = true;
      return;
    }

    console.log(`  💸 ${market.asset}: $${bet.amount.toFixed(2)} on ${session.side} @ ${(price*100).toFixed(0)}%`);

    if (this.config.dryRun) {
      // Simulate
      const shares = price > 0 ? bet.amount / price : 0;
      bet.executed = true;
      bet.shares = shares;
      bet.price = price;
      bet.timestamp = new Date();

      session.totalInvested += bet.amount;
      session.totalShares += shares;
      
      console.log(`  ✅ [DRY RUN] ${shares.toFixed(1)} shares`);
    } else {
      try {
        // Real order
        const result = await this.polymarket.placeMakerOrder(tokenId, price, bet.amount);
        
        if (result.success) {
          bet.executed = true;
          bet.orderId = result.orderId;
          bet.shares = result.shares;
          bet.price = result.price;
          bet.timestamp = new Date();

          session.totalInvested += bet.amount;
          session.totalShares += result.shares || 0;
          
          console.log(`  ✅ Order placed: ${result.shares} shares`);
        } else {
          console.error(`  ❌ Order failed: ${result.error}`);
          // Mark as executed to prevent infinite retries
          bet.executed = true;
        }
      } catch (error: any) {
        console.error(`  ❌ Order error: ${error.message}`);
        bet.executed = true;
      }
    }
  }

  private logSessionStatus(session: MultiAssetSession, minute: number): void {
    const { market } = session;
    const change = this.priceTracker.getPriceChange(market.asset);
    const pct = this.priceTracker.getPriceChangePct(market.asset);
    
    process.stdout.write(
      `\r${market.asset} ${market.timeframe} | ` +
      `Min ${minute.toFixed(1)}/${market.durationMinutes} | ` +
      `$${market.currentPrice.toLocaleString()} (${change >= 0 ? '+' : ''}${pct.toFixed(2)}%) | ` +
      `${session.side || 'DECIDING'}   `
    );
  }

  private async endSession(session: MultiAssetSession): Promise<void> {
    const { market } = session;
    
    // Determine result
    const closePrice = this.priceTracker.getPrice(market.asset);
    const wentUp = closePrice > market.openPrice;
    const wePickedUp = session.side === 'UP';
    const won = session.side !== null && (wentUp === wePickedUp);

    session.result = session.side === null ? 'LOSS' : (won ? 'WIN' : 'LOSS');
    session.payout = won ? session.totalShares : 0;
    session.profit = session.payout - session.totalInvested;

    // Update stats
    this.updateStats(session);

    // Print summary
    console.log(`
═══════════════════════════════════════════════════
📊 SESSION ENDED: ${market.asset} ${market.timeframe}
═══════════════════════════════════════════════════
Result: ${session.result === 'WIN' ? '🎉 WIN' : '😢 LOSS'}
Side: ${session.side || 'NONE'} | Actual: ${wentUp ? 'UP' : 'DOWN'}
Open: $${market.openPrice.toLocaleString()} → Close: $${closePrice.toLocaleString()}
Invested: $${session.totalInvested.toFixed(2)} | Shares: ${session.totalShares.toFixed(1)}
Payout: $${session.payout.toFixed(2)} | P&L: ${session.profit >= 0 ? '+' : ''}$${session.profit.toFixed(2)}
═══════════════════════════════════════════════════
    `);

    // Remove session (thread-safe)
    await this.sessionMutex.acquire();
    try {
      this.sessions.delete(market.marketId);
    } finally {
      this.sessionMutex.release();
    }
  }

  private updateStats(session: MultiAssetSession): void {
    const { market, result, totalInvested, profit } = session;
    const { asset, timeframe } = market;

    // Overall
    this.stats.overall.totalMarkets++;
    if (result === 'WIN') this.stats.overall.wins++;
    if (result === 'LOSS') this.stats.overall.losses++;
    this.stats.overall.totalWagered += totalInvested;
    this.stats.overall.totalPnL += profit;

    // By asset
    if (!this.stats.byAsset[asset]) {
      this.stats.byAsset[asset] = { markets: 0, wins: 0, losses: 0, pnl: 0 };
    }
    this.stats.byAsset[asset]!.markets++;
    if (result === 'WIN') this.stats.byAsset[asset]!.wins++;
    if (result === 'LOSS') this.stats.byAsset[asset]!.losses++;
    this.stats.byAsset[asset]!.pnl += profit;

    // By timeframe
    if (!this.stats.byTimeframe[timeframe]) {
      this.stats.byTimeframe[timeframe] = { markets: 0, wins: 0, losses: 0, pnl: 0 };
    }
    this.stats.byTimeframe[timeframe]!.markets++;
    if (result === 'WIN') this.stats.byTimeframe[timeframe]!.wins++;
    if (result === 'LOSS') this.stats.byTimeframe[timeframe]!.losses++;
    this.stats.byTimeframe[timeframe]!.pnl += profit;
  }

  getStats(): MultiAssetStats {
    return this.stats;
  }

  printStats(): void {
    const { overall, byAsset, byTimeframe } = this.stats;
    
    const winRate = overall.totalMarkets > 0 
      ? ((overall.wins / overall.totalMarkets) * 100).toFixed(1)
      : '0.0';

    console.log(`
╔═════════════════════════════════════════════════════════╗
║                    📊 OVERALL STATS                     ║
╠═════════════════════════════════════════════════════════╣
║  Markets: ${String(overall.totalMarkets).padEnd(10)} Win Rate: ${winRate}%               ║
║  Record: ${overall.wins}W / ${overall.losses}L                                   
║  Wagered: $${overall.totalWagered.toFixed(2).padEnd(10)} P&L: ${overall.totalPnL >= 0 ? '+' : ''}$${overall.totalPnL.toFixed(2)}
╠═════════════════════════════════════════════════════════╣
║  BY ASSET:                                              ║`);
    
    for (const [asset, stats] of Object.entries(byAsset)) {
      if (stats) {
        console.log(`║    ${asset}: ${stats.wins}W/${stats.losses}L  P&L: ${stats.pnl >= 0 ? '+' : ''}$${stats.pnl.toFixed(2)}`);
      }
    }
    
    console.log(`╠═════════════════════════════════════════════════════════╣
║  BY TIMEFRAME:                                          ║`);
    
    for (const [tf, stats] of Object.entries(byTimeframe)) {
      if (stats) {
        console.log(`║    ${tf}: ${stats.wins}W/${stats.losses}L  P&L: ${stats.pnl >= 0 ? '+' : ''}$${stats.pnl.toFixed(2)}`);
      }
    }
    
    console.log(`╚═════════════════════════════════════════════════════════╝`);
  }

  // Add a manual market on the fly
  async addManualMarket(asset: CryptoAsset, timeframe: Timeframe, upTokenId: string, downTokenId: string): Promise<void> {
    const market: CandleMarket = {
      marketId: `manual-${asset}-${timeframe}-${Date.now()}`,
      asset,
      timeframe,
      upTokenId,
      downTokenId,
      startTime: new Date(),
      endTime: new Date(Date.now() + timeframeToDuration(timeframe) * 60000),
      durationMinutes: timeframeToDuration(timeframe),
      openPrice: this.priceTracker.getPrice(asset),
      currentPrice: this.priceTracker.getPrice(asset),
      upProbability: 0.5,
      downProbability: 0.5,
      question: `${asset} ${timeframe} up or down?`,
      source: 'manual',
    };
    
    await this.startSession(market);
  }

  stop(): void {
    if (this.marketScanInterval) clearInterval(this.marketScanInterval);
    if (this.tradingInterval) clearInterval(this.tradingInterval);
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.priceTracker.disconnect();
    this.printStats();
    console.log('\n👋 Bot stopped');
  }
}
