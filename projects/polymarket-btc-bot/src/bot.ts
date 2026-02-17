/**
 * Polymarket BTC Bot
 * Single-asset trading bot for BTC 15-minute markets
 * 
 * Fixed issues:
 * - Better error boundaries
 * - Proper null checks
 * - Safe condition ID handling
 * - Memory leak prevention
 */

import { PolymarketClient } from './polymarket';
import { BTCPriceTracker } from './btc-price';
import { TradingStrategy } from './strategy';
import { BotConfig, TradingSession, BTCMarket } from './types';
import { getNewsService, NewsResearchService, ResearchReport } from './news-research';
import { RedemptionService } from './redemption';
import { shouldEnterMarket, checkProfitability, PROFITABILITY_DEFAULTS } from './profitability';

export class PolymarketBTCBot {
  private config: BotConfig;
  private polymarket: PolymarketClient;
  private priceTracker: BTCPriceTracker;
  private strategy: TradingStrategy;
  private newsService: NewsResearchService;
  private redemptionService: RedemptionService;
  private currentSession: TradingSession | null = null;
  private currentMarket: BTCMarket | null = null;
  private marketCheckInterval: NodeJS.Timeout | null = null;
  private tradingInterval: NodeJS.Timeout | null = null;
  private redemptionInterval: NodeJS.Timeout | null = null;
  private latestResearch: ResearchReport | null = null;
  
  // Budget management
  private initialBudget: number;
  private currentBudget: number;
  private lockedProfit: number = 0;
  private profitLockTriggered: boolean = false;
  
  // Prevent concurrent operations
  private isCheckingMarket = false;
  private isCheckingRedemptions = false;
  
  private stats = {
    totalMarkets: 0,
    wins: 0,
    losses: 0,
    totalWagered: 0,
    totalPnL: 0,
    totalRedeemed: 0,
  };

  constructor(config: BotConfig) {
    this.config = config;
    this.initialBudget = config.totalBudget;
    this.currentBudget = config.totalBudget;
    this.polymarket = new PolymarketClient(config);
    this.priceTracker = new BTCPriceTracker(config.wsUrl);
    this.strategy = new TradingStrategy(config);
    this.newsService = getNewsService(process.env.TAVILY_API_KEY);
    this.redemptionService = new RedemptionService(config.privateKey);
  }

  async start(): Promise<void> {
    console.log(`
╔══════════════════════════════════════════════════╗
║     🤖 POLYMARKET BTC 15-MINUTE BOT              ║
║     ${this.config.dryRun ? '🔸 DRY RUN MODE' : '💰 LIVE TRADING'}                          ║
╚══════════════════════════════════════════════════╝
    `);

    try {
      // Initialize Polymarket client
      await this.polymarket.initialize();

      // Connect to BTC price feed
      await this.priceTracker.connect();

      // Check for pending redemptions on startup
      await this.checkAndRedeemPositions();

      // Start periodic redemption checks (every 5 minutes)
      this.startRedemptionMonitoring();

      // Start monitoring for new markets
      this.startMarketMonitoring();

      console.log('\n🚀 Bot started! Waiting for markets...\n');
    } catch (error: any) {
      console.error('❌ Failed to start bot:', error.message);
      throw error;
    }
  }

  /**
   * Check and redeem any resolved positions, update budget
   */
  private async checkAndRedeemPositions(): Promise<void> {
    // Prevent concurrent redemption checks
    if (this.isCheckingRedemptions) {
      return;
    }
    
    this.isCheckingRedemptions = true;
    
    try {
      console.log('\n💰 Checking for redeemable positions...');
      
      const result = await this.redemptionService.redeemAllPending();
      
      if (result.totalRedeemed > 0) {
        this.stats.totalRedeemed += result.totalRedeemed;
        console.log(`\n🎉 Redeemed $${result.totalRedeemed.toFixed(2)} total!`);
      }
      
      // Get total wallet balance
      const walletBalance = result.newBalance;
      
      // Check profit protection
      this.checkProfitProtection(walletBalance);
      
      // Update current budget
      const previousBudget = this.currentBudget;
      this.currentBudget = Math.max(0, walletBalance - this.lockedProfit);
      
      if (Math.abs(this.currentBudget - previousBudget) > 0.01) {
        console.log(`💵 Trading budget: $${previousBudget.toFixed(2)} → $${this.currentBudget.toFixed(2)}`);
      }
      
      console.log(`📊 Wallet: $${walletBalance.toFixed(2)} | Trading: $${this.currentBudget.toFixed(2)} | Locked: $${this.lockedProfit.toFixed(2)}\n`);
    } catch (error: any) {
      console.error('❌ Redemption check failed:', error.message);
    } finally {
      this.isCheckingRedemptions = false;
    }
  }

  /**
   * Profit protection: When we hit 3x initial budget, lock 2x and trade with 1x
   */
  private checkProfitProtection(walletBalance: number): void {
    const triggerThreshold = this.initialBudget * 3;
    
    if (!this.profitLockTriggered && walletBalance >= triggerThreshold) {
      const profitToLock = this.initialBudget * 2;
      this.lockedProfit = profitToLock;
      this.profitLockTriggered = true;
      
      console.log(`
╔══════════════════════════════════════════════════════════╗
║  🎉 PROFIT PROTECTION TRIGGERED!                         ║
╠══════════════════════════════════════════════════════════╣
║  💰 Hit 3x initial budget ($${triggerThreshold.toFixed(2)})
║  🔒 Locking $${profitToLock.toFixed(2)} profit (2x initial)
║  📈 Continuing with $${this.initialBudget.toFixed(2)} (1x initial)
║  ✅ Initial investment SECURED!
╚══════════════════════════════════════════════════════════╝
      `);
    }
  }

  /**
   * Start periodic redemption monitoring
   */
  private startRedemptionMonitoring(): void {
    // Check every 5 minutes
    this.redemptionInterval = setInterval(async () => {
      // Don't check during active trading session
      if (this.currentSession && this.currentSession.result === 'PENDING') {
        return;
      }
      await this.checkAndRedeemPositions();
    }, 5 * 60 * 1000);
  }

  private startMarketMonitoring(): void {
    // Check for new markets every 30 seconds
    this.marketCheckInterval = setInterval(async () => {
      await this.checkForNewMarket();
    }, 30 * 1000);

    // Also check immediately
    this.checkForNewMarket();
  }

  private async checkForNewMarket(): Promise<void> {
    // Don't check if we're already in a session
    if (this.currentSession && this.currentSession.result === 'PENDING') {
      return;
    }
    
    // Prevent concurrent checks
    if (this.isCheckingMarket) {
      return;
    }
    
    this.isCheckingMarket = true;
    
    try {
      const market = await this.polymarket.findActiveBTCMarket();

      if (market && market.marketId && market.marketId !== this.currentMarket?.marketId) {
        console.log(`\n🎯 New BTC market found: ${market.marketId}`);
        await this.startTradingSession(market);
      }
    } catch (error: any) {
      console.error('Error checking for market:', error.message);
    } finally {
      this.isCheckingMarket = false;
    }
  }

  private async startTradingSession(market: BTCMarket): Promise<void> {
    this.currentMarket = market;

    // Set BTC open price
    this.priceTracker.setOpenPrice();
    const btcOpenPrice = this.priceTracker.getOpenPrice();

    if (btcOpenPrice === 0) {
      console.error('❌ Cannot start session: no BTC price available');
      return;
    }

    // Create new session
    this.currentSession = this.strategy.createSession(market, btcOpenPrice);

    const lockedInfo = this.lockedProfit > 0 ? ` (🔒 $${this.lockedProfit.toFixed(2)} locked)` : '';
    console.log(`
┌─────────────────────────────────────────┐
│ 📈 NEW TRADING SESSION                  │
├─────────────────────────────────────────┤
│ Market: ${market.marketId.substring(0, 20)}...
│ BTC Open: $${btcOpenPrice.toLocaleString()}
│ Budget: $${this.currentBudget.toFixed(2)}${lockedInfo}
│ Min Prob: ${(this.config.minProbability * 100).toFixed(0)}%
└─────────────────────────────────────────┘
    `);

    // Fetch news research (non-blocking)
    this.fetchNewsResearch();

    // Start the trading loop
    this.startTradingLoop();
  }

  private async fetchNewsResearch(): Promise<void> {
    try {
      console.log('📰 Fetching market news...');
      this.latestResearch = await this.newsService.searchBitcoinNews();
      
      if (this.latestResearch) {
        const sentimentEmoji = {
          'BULLISH': '🟢',
          'BEARISH': '🔴',
          'NEUTRAL': '⚪'
        };
        
        const emoji = sentimentEmoji[this.latestResearch.sentiment] || '⚪';
        console.log(`\n${emoji} News Sentiment: ${this.latestResearch.sentiment} (${(this.latestResearch.confidence * 100).toFixed(0)}%)`);
        console.log(`📝 ${this.latestResearch.answer.substring(0, 150)}...\n`);
      }
    } catch (error) {
      console.log('⚠️ Could not fetch news research');
    }
  }

  private startTradingLoop(): void {
    // Clear any existing interval
    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
    }

    // Check every 10 seconds
    this.tradingInterval = setInterval(async () => {
      await this.tradingTick();
    }, 10 * 1000);

    // Run first tick after 60 seconds (entry time)
    setTimeout(async () => {
      await this.tradingTick();
    }, 60 * 1000);
  }

  private async tradingTick(): Promise<void> {
    if (!this.currentSession || !this.currentMarket) return;

    try {
      const now = Date.now();
      const marketStart = this.currentMarket.startTime.getTime();
      const minutesSinceStart = (now - marketStart) / (60 * 1000);

      // Update market data
      this.currentMarket.minutesSinceStart = minutesSinceStart;
      const currentPrice = this.priceTracker.getPrice();
      if (currentPrice > 0) {
        this.currentMarket.currentPrice = currentPrice;
      }

      // Check if market ended (15 minutes)
      if (minutesSinceStart >= 15) {
        await this.endSession();
        return;
      }

      // Get current odds
      const odds = await this.polymarket.getBTCMarketOdds(this.currentMarket);
      this.currentMarket.upProbability = odds.upProbability;
      this.currentMarket.downProbability = odds.downProbability;

      // If we haven't decided a side yet, try to decide
      if (!this.currentSession.side && minutesSinceStart >= 1) {
        const side = this.strategy.decideSide(this.priceTracker, odds);
        if (side) {
          // Consider news sentiment as a confirming signal
          if (this.latestResearch && this.latestResearch.confidence > 0.6) {
            const newsSentiment = this.latestResearch.sentiment;
            if (newsSentiment === 'BULLISH' && side === 'DOWN') {
              console.log('⚠️ News sentiment bullish but price says DOWN - proceeding with caution');
            } else if (newsSentiment === 'BEARISH' && side === 'UP') {
              console.log('⚠️ News sentiment bearish but price says UP - proceeding with caution');
            } else if (newsSentiment !== 'NEUTRAL') {
              console.log(`✅ News sentiment confirms ${side} direction`);
            }
          }
          
          this.currentSession.side = side;
          this.currentSession.lockedAt = new Date();
          console.log(`\n🔒 LOCKED IN: ${side}`);
        }
      }

      // If we have a side, check for bet opportunities
      if (this.currentSession.side) {
        const betToPlace = this.strategy.shouldBet(
          this.currentSession,
          minutesSinceStart
        );

        if (betToPlace && !betToPlace.executed) {
          if (this.strategy.meetsThreshold(this.currentSession, odds)) {
            // PROFITABILITY CHECK: Only bet if expected value > costs
            const prob = this.currentSession.side === 'UP' 
              ? odds.upProbability 
              : odds.downProbability;
            const profitCheck = shouldEnterMarket(prob, prob, betToPlace.amount);
            
            if (!profitCheck.enter) {
              console.log(`💸❌ Skipping bet - ${profitCheck.reason}`);
              betToPlace.executed = true;
            } else {
              // Adjust bet if needed
              if (profitCheck.suggestedBet > 0 && profitCheck.suggestedBet < betToPlace.amount) {
                betToPlace.amount = Math.max(profitCheck.suggestedBet, PROFITABILITY_DEFAULTS.minBetSize);
              }
              await this.placeBet(betToPlace, odds);
            }
          } else {
            console.log(
              `⏭️ Skipping bet at minute ${betToPlace.minute} - prob below threshold`
            );
            betToPlace.executed = true;
          }
        }
      }

      // Log status
      this.logStatus(minutesSinceStart, odds);
    } catch (error: any) {
      console.error('Error in trading tick:', error.message);
    }
  }

  private async placeBet(
    bet: any,
    odds: any
  ): Promise<void> {
    if (!this.currentSession || !this.currentMarket) return;

    const tokenId =
      this.currentSession.side === 'UP'
        ? this.currentMarket.upTokenId
        : this.currentMarket.downTokenId;

    if (!tokenId) {
      console.error('❌ Cannot place bet: missing token ID');
      bet.executed = true;
      return;
    }

    const price = this.strategy.calculateMakerPrice(this.currentSession, odds);

    console.log(
      `\n💸 Placing bet: $${bet.amount} on ${this.currentSession.side} @ $${price.toFixed(2)}`
    );

    try {
      const result = await this.polymarket.placeMakerOrder(
        tokenId,
        price,
        bet.amount
      );

      if (result.success) {
        bet.executed = true;
        bet.orderId = result.orderId;
        bet.shares = result.shares;
        bet.price = result.price;

        this.currentSession.totalInvested += bet.amount;
        this.currentSession.totalShares += result.shares || 0;

        console.log(
          `✅ Order placed: ${result.shares} shares @ $${price.toFixed(2)}`
        );
      } else {
        console.error(`❌ Order failed: ${result.error}`);
        bet.executed = true; // Prevent infinite retries
      }
    } catch (error: any) {
      console.error(`❌ Order error: ${error.message}`);
      bet.executed = true;
    }
  }

  private logStatus(minute: number, odds: any): void {
    const btcChange = this.priceTracker.getPriceChange();
    const btcPrice = this.priceTracker.getPrice();

    process.stdout.write(
      `\r⏱️ Min ${minute.toFixed(1)} | ` +
        `BTC: $${btcPrice.toLocaleString()} (${btcChange >= 0 ? '+' : ''}$${btcChange.toFixed(2)}) | ` +
        `UP: ${(odds.upProbability * 100).toFixed(1)}% | ` +
        `DOWN: ${(odds.downProbability * 100).toFixed(1)}% | ` +
        `Side: ${this.currentSession?.side || 'DECIDING'}   `
    );
  }

  private async endSession(): Promise<void> {
    if (!this.currentSession || !this.currentMarket) return;

    console.log('\n\n⏰ Market ended!');

    // Clear trading interval
    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
      this.tradingInterval = null;
    }

    // Resolve session
    const btcClosePrice = this.priceTracker.getPrice();
    this.currentSession = this.strategy.resolveSession(
      this.currentSession,
      btcClosePrice
    );

    // Update stats
    this.stats.totalMarkets++;
    if (this.currentSession.result === 'WIN') {
      this.stats.wins++;
    } else if (this.currentSession.result === 'LOSS') {
      this.stats.losses++;
    }
    this.stats.totalWagered += this.currentSession.totalInvested;
    this.stats.totalPnL += this.currentSession.profit;

    // Record bet for redemption tracking
    if (this.currentSession.totalInvested > 0 && this.currentSession.side) {
      try {
        const tokenId = this.currentSession.side === 'UP' 
          ? this.currentMarket.upTokenId 
          : this.currentMarket.downTokenId;
        
        if (tokenId) {
          const conditionId = await this.polymarket.getConditionId(this.currentMarket.marketId);
          
          if (conditionId) {
            await this.redemptionService.addBetRecord({
              conditionId,
              tokenId,
              marketSlug: `btc-${this.currentSession.side.toLowerCase()}-${this.currentMarket.marketId.substring(0, 8)}`,
              side: this.currentSession.side,
              timestamp: Date.now(),
            });
          }
        }
      } catch (error: any) {
        console.error('Failed to record bet:', error.message);
      }
    }

    // Print summary
    console.log(this.strategy.getSummary(this.currentSession));
    this.printStats();

    // Wait a bit for market to resolve, then try redemption
    console.log('\n⏳ Waiting 60s for market resolution...');
    setTimeout(async () => {
      await this.checkAndRedeemPositions();
    }, 60 * 1000);

    // Reset for next market
    this.currentSession = null;
    this.currentMarket = null;
  }

  private printStats(): void {
    const winRate =
      this.stats.totalMarkets > 0
        ? ((this.stats.wins / this.stats.totalMarkets) * 100).toFixed(1)
        : '0.0';

    const totalValue = this.currentBudget + this.lockedProfit;
    const roi = this.initialBudget > 0 
      ? ((totalValue - this.initialBudget) / this.initialBudget * 100).toFixed(1)
      : '0.0';

    console.log(`
📊 OVERALL STATS
────────────────
Markets: ${this.stats.totalMarkets}
Win Rate: ${winRate}% (${this.stats.wins}W / ${this.stats.losses}L)
Total Wagered: $${this.stats.totalWagered.toFixed(2)}
Total P&L: ${this.stats.totalPnL >= 0 ? '+' : ''}$${this.stats.totalPnL.toFixed(2)}
Redeemed: $${this.stats.totalRedeemed.toFixed(2)}
────────────────
Initial Budget: $${this.initialBudget.toFixed(2)}
Trading Budget: $${this.currentBudget.toFixed(2)}
Locked Profit: $${this.lockedProfit.toFixed(2)} 🔒
Total Value: $${totalValue.toFixed(2)} (${roi}% ROI)
${this.profitLockTriggered ? '✅ Initial investment secured!' : `⏳ ${((totalValue / this.initialBudget) * 100).toFixed(0)}% to profit lock (need 300%)`}
    `);
  }

  stop(): void {
    if (this.marketCheckInterval) {
      clearInterval(this.marketCheckInterval);
      this.marketCheckInterval = null;
    }
    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
      this.tradingInterval = null;
    }
    if (this.redemptionInterval) {
      clearInterval(this.redemptionInterval);
      this.redemptionInterval = null;
    }
    this.priceTracker.disconnect();
    console.log('\n👋 Bot stopped');
  }

  /**
   * Get current available budget
   */
  getBudget(): number {
    return this.currentBudget;
  }
}
