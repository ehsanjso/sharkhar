/**
 * Multi-Asset Polymarket Trading Bot
 * Supports BTC, ETH across multiple timeframes
 */
import { PolymarketClient } from './polymarket';
import { getPriceTracker } from './multi-price-tracker';
import { getNewsService } from './news-research';
import { discoverAllMarkets } from './market-discovery';
import { createDefaultConfig, timeframeToDuration, } from './types-multi';
export class MultiAssetBot {
    config;
    polymarket;
    priceTracker;
    newsService;
    // Active sessions per market
    sessions = new Map();
    // Monitoring intervals
    marketScanInterval = null;
    tradingInterval = null;
    // Stats
    stats = {
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
    constructor(config) {
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
    async start() {
        console.log(`
╔════════════════════════════════════════════════════════╗
║  🚀 MULTI-ASSET POLYMARKET BOT                         ║
║  ${this.config.dryRun ? '🔸 DRY RUN MODE' : '💰 LIVE TRADING'}                                   ║
╠════════════════════════════════════════════════════════╣
║  Assets: ${this.config.assets.join(', ').padEnd(43)}║
║  Timeframes: ${this.config.timeframes.join(', ').padEnd(39)}║
╚════════════════════════════════════════════════════════╝
    `);
        // Initialize
        await this.polymarket.initialize();
        await this.priceTracker.connect();
        // Load any manual markets
        this.loadManualMarkets();
        // Start monitoring
        this.startMarketScanning();
        this.startTradingLoop();
        console.log('\n✅ Bot started! Monitoring for markets...\n');
    }
    loadManualMarkets() {
        for (const manual of this.config.manualMarkets) {
            const market = {
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
            this.startSession(market);
        }
    }
    startMarketScanning() {
        // Scan for new markets every 30 seconds
        this.marketScanInterval = setInterval(async () => {
            await this.scanForMarkets();
        }, 30 * 1000);
        // Initial scan
        this.scanForMarkets();
    }
    async scanForMarkets() {
        try {
            console.log('🔍 Scanning for markets...');
            const discovered = await discoverAllMarkets(this.config.assets, this.config.timeframes);
            for (const market of discovered) {
                // Skip if already in a session
                if (this.sessions.has(market.slug))
                    continue;
                // Check if market is currently live and not too close to ending
                const now = Date.now();
                const endTime = market.endTime.getTime();
                const minutesRemaining = (endTime - now) / 60000;
                // Only join markets with at least 3 minutes remaining
                if (minutesRemaining < 3)
                    continue;
                // Convert to our CandleMarket format
                const candleMarket = {
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
                this.startSession(candleMarket);
            }
            if (discovered.length > 0) {
                console.log(`  Found ${discovered.length} markets, ${this.sessions.size} active sessions`);
            }
        }
        catch (error) {
            console.error('Market scan error:', error);
        }
    }
    getAssetName(asset) {
        const names = {
            'BTC': 'Bitcoin',
            'ETH': 'Ethereum',
            'SOL': 'Solana',
        };
        return names[asset];
    }
    startSession(market) {
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
        const bets = schedule.map(s => ({
            minute: Math.floor(s.pctTime * market.durationMinutes),
            amount: s.pctBudget * budget,
            executed: false,
        }));
        // Create session
        const session = {
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
        // Fetch news (async)
        this.fetchNewsForSession(session);
    }
    async fetchNewsForSession(session) {
        if (!this.config.useNewsResearch)
            return;
        try {
            const query = `${session.market.asset} ${this.getAssetName(session.market.asset)} price movement today`;
            const report = await this.newsService.searchBitcoinNews(query);
            session.newsSentiment = report.sentiment;
            session.newsConfidence = report.confidence;
            const emoji = { BULLISH: '🟢', BEARISH: '🔴', NEUTRAL: '⚪' };
            console.log(`  ${emoji[report.sentiment]} ${session.market.asset} News: ${report.sentiment}`);
        }
        catch {
            // Continue without news
        }
    }
    startTradingLoop() {
        // Check every 10 seconds
        this.tradingInterval = setInterval(async () => {
            await this.tradingTick();
        }, 10 * 1000);
    }
    async tradingTick() {
        const now = Date.now();
        const sessionsArray = Array.from(this.sessions.entries());
        for (const [marketId, session] of sessionsArray) {
            const { market } = session;
            // Calculate time into market
            const marketStart = market.startTime.getTime();
            const minutesSinceStart = (now - marketStart) / (60 * 1000);
            // Update prices
            market.currentPrice = this.priceTracker.getPrice(market.asset);
            // Check if market ended
            if (minutesSinceStart >= market.durationMinutes) {
                await this.endSession(session);
                continue;
            }
            // Update market odds (if we have a way to fetch them)
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
    }
    async updateMarketOdds(session) {
        try {
            const odds = await this.polymarket.getBTCMarketOdds(session.market);
            session.market.upProbability = odds.upProbability;
            session.market.downProbability = odds.downProbability;
        }
        catch {
            // Use price-based estimate
            const change = this.priceTracker.getPriceChangePct(session.market.asset);
            const momentum = Math.tanh(change);
            session.market.upProbability = 0.5 + momentum * 0.15;
            session.market.downProbability = 1 - session.market.upProbability;
        }
    }
    decideSide(session) {
        const { market } = session;
        const priceChange = this.priceTracker.getPriceChange(market.asset);
        const strength = this.priceTracker.getMovementStrength(market.asset);
        if (strength < 0.1)
            return; // Wait for clearer signal
        const side = priceChange > 0 ? 'UP' : 'DOWN';
        // News confirmation
        if (session.newsSentiment && session.newsConfidence && session.newsConfidence > 0.6) {
            if ((session.newsSentiment === 'BULLISH' && side === 'DOWN') ||
                (session.newsSentiment === 'BEARISH' && side === 'UP')) {
                console.log(`  ⚠️ ${market.asset}: News conflicts with price (proceeding anyway)`);
            }
        }
        session.side = side;
        session.lockedAt = new Date();
        console.log(`\n🔒 ${market.asset} ${market.timeframe}: LOCKED ${side}`);
    }
    async checkAndPlaceBets(session, minutesSinceStart) {
        const { market, bets } = session;
        for (const bet of bets) {
            if (bet.executed)
                continue;
            if (bet.minute > minutesSinceStart)
                continue;
            // Check probability threshold
            const prob = session.side === 'UP' ? market.upProbability : market.downProbability;
            if (prob < this.config.minProbability) {
                console.log(`  ⏭️ ${market.asset}: Skip bet at min ${bet.minute} (prob ${(prob * 100).toFixed(0)}% < threshold)`);
                bet.executed = true;
                continue;
            }
            // Place bet
            await this.placeBet(session, bet);
        }
    }
    async placeBet(session, bet) {
        const { market } = session;
        const tokenId = session.side === 'UP' ? market.upTokenId : market.downTokenId;
        const price = session.side === 'UP' ? market.upProbability : market.downProbability;
        console.log(`  💸 ${market.asset}: $${bet.amount.toFixed(2)} on ${session.side} @ ${(price * 100).toFixed(0)}%`);
        if (this.config.dryRun) {
            // Simulate
            const shares = bet.amount / price;
            bet.executed = true;
            bet.shares = shares;
            bet.price = price;
            bet.timestamp = new Date();
            session.totalInvested += bet.amount;
            session.totalShares += shares;
            console.log(`  ✅ [DRY RUN] ${shares.toFixed(1)} shares`);
        }
        else {
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
            }
            else {
                console.error(`  ❌ Order failed: ${result.error}`);
            }
        }
    }
    logSessionStatus(session, minute) {
        const { market } = session;
        const change = this.priceTracker.getPriceChange(market.asset);
        const pct = this.priceTracker.getPriceChangePct(market.asset);
        process.stdout.write(`\r${market.asset} ${market.timeframe} | ` +
            `Min ${minute.toFixed(1)}/${market.durationMinutes} | ` +
            `$${market.currentPrice.toLocaleString()} (${change >= 0 ? '+' : ''}${pct.toFixed(2)}%) | ` +
            `${session.side || 'DECIDING'}   `);
    }
    async endSession(session) {
        const { market } = session;
        // Determine result
        const closePrice = this.priceTracker.getPrice(market.asset);
        const wentUp = closePrice > market.openPrice;
        const wePickedUp = session.side === 'UP';
        const won = wentUp === wePickedUp;
        session.result = won ? 'WIN' : 'LOSS';
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
Side: ${session.side} | Actual: ${wentUp ? 'UP' : 'DOWN'}
Open: $${market.openPrice.toLocaleString()} → Close: $${closePrice.toLocaleString()}
Invested: $${session.totalInvested.toFixed(2)} | Shares: ${session.totalShares.toFixed(1)}
Payout: $${session.payout.toFixed(2)} | P&L: ${session.profit >= 0 ? '+' : ''}$${session.profit.toFixed(2)}
═══════════════════════════════════════════════════
    `);
        // Remove session
        this.sessions.delete(market.marketId);
    }
    updateStats(session) {
        const { market, result, totalInvested, profit } = session;
        const { asset, timeframe } = market;
        // Overall
        this.stats.overall.totalMarkets++;
        if (result === 'WIN')
            this.stats.overall.wins++;
        if (result === 'LOSS')
            this.stats.overall.losses++;
        this.stats.overall.totalWagered += totalInvested;
        this.stats.overall.totalPnL += profit;
        // By asset
        if (!this.stats.byAsset[asset]) {
            this.stats.byAsset[asset] = { markets: 0, wins: 0, losses: 0, pnl: 0 };
        }
        this.stats.byAsset[asset].markets++;
        if (result === 'WIN')
            this.stats.byAsset[asset].wins++;
        if (result === 'LOSS')
            this.stats.byAsset[asset].losses++;
        this.stats.byAsset[asset].pnl += profit;
        // By timeframe
        if (!this.stats.byTimeframe[timeframe]) {
            this.stats.byTimeframe[timeframe] = { markets: 0, wins: 0, losses: 0, pnl: 0 };
        }
        this.stats.byTimeframe[timeframe].markets++;
        if (result === 'WIN')
            this.stats.byTimeframe[timeframe].wins++;
        if (result === 'LOSS')
            this.stats.byTimeframe[timeframe].losses++;
        this.stats.byTimeframe[timeframe].pnl += profit;
    }
    getStats() {
        return this.stats;
    }
    printStats() {
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
    addManualMarket(asset, timeframe, upTokenId, downTokenId) {
        const market = {
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
        this.startSession(market);
    }
    stop() {
        if (this.marketScanInterval)
            clearInterval(this.marketScanInterval);
        if (this.tradingInterval)
            clearInterval(this.tradingInterval);
        this.priceTracker.disconnect();
        this.printStats();
        console.log('\n👋 Bot stopped');
    }
}
//# sourceMappingURL=multi-bot.js.map