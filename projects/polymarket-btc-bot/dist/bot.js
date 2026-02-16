import { PolymarketClient } from './polymarket';
import { BTCPriceTracker } from './btc-price';
import { TradingStrategy } from './strategy';
import { getNewsService } from './news-research';
export class PolymarketBTCBot {
    config;
    polymarket;
    priceTracker;
    strategy;
    newsService;
    currentSession = null;
    currentMarket = null;
    marketCheckInterval = null;
    tradingInterval = null;
    latestResearch = null;
    stats = {
        totalMarkets: 0,
        wins: 0,
        losses: 0,
        totalWagered: 0,
        totalPnL: 0,
    };
    constructor(config) {
        this.config = config;
        this.polymarket = new PolymarketClient(config);
        this.priceTracker = new BTCPriceTracker(config.wsUrl);
        this.strategy = new TradingStrategy(config);
        this.newsService = getNewsService(process.env.TAVILY_API_KEY);
    }
    async start() {
        console.log(`
╔══════════════════════════════════════════════════╗
║     🤖 POLYMARKET BTC 15-MINUTE BOT              ║
║     ${this.config.dryRun ? '🔸 DRY RUN MODE' : '💰 LIVE TRADING'}                          ║
╚══════════════════════════════════════════════════╝
    `);
        // Initialize Polymarket client
        await this.polymarket.initialize();
        // Connect to BTC price feed
        await this.priceTracker.connect();
        // Start monitoring for new markets
        this.startMarketMonitoring();
        console.log('\n🚀 Bot started! Waiting for markets...\n');
    }
    startMarketMonitoring() {
        // Check for new markets every 30 seconds
        this.marketCheckInterval = setInterval(async () => {
            await this.checkForNewMarket();
        }, 30 * 1000);
        // Also check immediately
        this.checkForNewMarket();
    }
    async checkForNewMarket() {
        // Don't check if we're already in a session
        if (this.currentSession && this.currentSession.result === 'PENDING') {
            return;
        }
        const market = await this.polymarket.findActiveBTCMarket();
        if (market && market.marketId !== this.currentMarket?.marketId) {
            console.log(`\n🎯 New BTC market found: ${market.marketId}`);
            await this.startTradingSession(market);
        }
    }
    async startTradingSession(market) {
        this.currentMarket = market;
        // Set BTC open price
        this.priceTracker.setOpenPrice();
        const btcOpenPrice = this.priceTracker.getOpenPrice();
        // Create new session
        this.currentSession = this.strategy.createSession(market, btcOpenPrice);
        console.log(`
┌─────────────────────────────────────────┐
│ 📈 NEW TRADING SESSION                  │
├─────────────────────────────────────────┤
│ Market: ${market.marketId.substring(0, 20)}...
│ BTC Open: $${btcOpenPrice.toLocaleString()}
│ Budget: $${this.config.totalBudget}
│ Min Prob: ${(this.config.minProbability * 100).toFixed(0)}%
└─────────────────────────────────────────┘
    `);
        // Fetch news research (non-blocking)
        this.fetchNewsResearch();
        // Start the trading loop
        this.startTradingLoop();
    }
    async fetchNewsResearch() {
        try {
            console.log('📰 Fetching market news...');
            this.latestResearch = await this.newsService.searchBitcoinNews();
            const sentimentEmoji = {
                'BULLISH': '🟢',
                'BEARISH': '🔴',
                'NEUTRAL': '⚪'
            };
            console.log(`\n${sentimentEmoji[this.latestResearch.sentiment]} News Sentiment: ${this.latestResearch.sentiment} (${(this.latestResearch.confidence * 100).toFixed(0)}%)`);
            console.log(`📝 ${this.latestResearch.answer.substring(0, 150)}...\n`);
        }
        catch (error) {
            console.log('⚠️ Could not fetch news research');
        }
    }
    startTradingLoop() {
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
    async tradingTick() {
        if (!this.currentSession || !this.currentMarket)
            return;
        const now = Date.now();
        const marketStart = this.currentMarket.startTime.getTime();
        const minutesSinceStart = (now - marketStart) / (60 * 1000);
        // Update market data
        this.currentMarket.minutesSinceStart = minutesSinceStart;
        this.currentMarket.currentPrice = this.priceTracker.getPrice();
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
                let finalSide = side;
                if (this.latestResearch && this.latestResearch.confidence > 0.6) {
                    const newsSentiment = this.latestResearch.sentiment;
                    if (newsSentiment === 'BULLISH' && side === 'DOWN') {
                        console.log('⚠️ News sentiment bullish but price says DOWN - proceeding with caution');
                    }
                    else if (newsSentiment === 'BEARISH' && side === 'UP') {
                        console.log('⚠️ News sentiment bearish but price says UP - proceeding with caution');
                    }
                    else if (newsSentiment !== 'NEUTRAL') {
                        console.log(`✅ News sentiment confirms ${side} direction`);
                    }
                }
                this.currentSession.side = finalSide;
                this.currentSession.lockedAt = new Date();
                console.log(`\n🔒 LOCKED IN: ${finalSide}`);
            }
        }
        // If we have a side, check for bet opportunities
        if (this.currentSession.side) {
            const betToPlace = this.strategy.shouldBet(this.currentSession, minutesSinceStart);
            if (betToPlace && !betToPlace.executed) {
                // Check if probability still meets threshold
                if (this.strategy.meetsThreshold(this.currentSession, odds)) {
                    await this.placeBet(betToPlace, odds);
                }
                else {
                    console.log(`⏭️ Skipping bet at minute ${betToPlace.minute} - prob below threshold`);
                    betToPlace.executed = true; // Mark as executed (skipped)
                }
            }
        }
        // Log status
        this.logStatus(minutesSinceStart, odds);
    }
    async placeBet(bet, odds) {
        if (!this.currentSession || !this.currentMarket)
            return;
        const tokenId = this.currentSession.side === 'UP'
            ? this.currentMarket.upTokenId
            : this.currentMarket.downTokenId;
        const price = this.strategy.calculateMakerPrice(this.currentSession, odds);
        console.log(`\n💸 Placing bet: $${bet.amount} on ${this.currentSession.side} @ $${price.toFixed(2)}`);
        const result = await this.polymarket.placeMakerOrder(tokenId, price, bet.amount);
        if (result.success) {
            bet.executed = true;
            bet.orderId = result.orderId;
            bet.shares = result.shares;
            bet.price = result.price;
            this.currentSession.totalInvested += bet.amount;
            this.currentSession.totalShares += result.shares || 0;
            console.log(`✅ Order placed: ${result.shares} shares @ $${price.toFixed(2)}`);
        }
        else {
            console.error(`❌ Order failed: ${result.error}`);
        }
    }
    logStatus(minute, odds) {
        const btcChange = this.priceTracker.getPriceChange();
        const btcPrice = this.priceTracker.getPrice();
        process.stdout.write(`\r⏱️ Min ${minute.toFixed(1)} | ` +
            `BTC: $${btcPrice.toLocaleString()} (${btcChange >= 0 ? '+' : ''}$${btcChange.toFixed(2)}) | ` +
            `UP: ${(odds.upProbability * 100).toFixed(1)}% | ` +
            `DOWN: ${(odds.downProbability * 100).toFixed(1)}% | ` +
            `Side: ${this.currentSession?.side || 'DECIDING'}   `);
    }
    async endSession() {
        if (!this.currentSession)
            return;
        console.log('\n\n⏰ Market ended!');
        // Clear trading interval
        if (this.tradingInterval) {
            clearInterval(this.tradingInterval);
        }
        // Resolve session
        const btcClosePrice = this.priceTracker.getPrice();
        this.currentSession = this.strategy.resolveSession(this.currentSession, btcClosePrice);
        // Update stats
        this.stats.totalMarkets++;
        if (this.currentSession.result === 'WIN') {
            this.stats.wins++;
        }
        else if (this.currentSession.result === 'LOSS') {
            this.stats.losses++;
        }
        this.stats.totalWagered += this.currentSession.totalInvested;
        this.stats.totalPnL += this.currentSession.profit;
        // Print summary
        console.log(this.strategy.getSummary(this.currentSession));
        this.printStats();
        // Reset for next market
        this.currentSession = null;
        this.currentMarket = null;
    }
    printStats() {
        const winRate = this.stats.totalMarkets > 0
            ? ((this.stats.wins / this.stats.totalMarkets) * 100).toFixed(1)
            : '0.0';
        console.log(`
📊 OVERALL STATS
────────────────
Markets: ${this.stats.totalMarkets}
Win Rate: ${winRate}% (${this.stats.wins}W / ${this.stats.losses}L)
Total Wagered: $${this.stats.totalWagered.toFixed(2)}
Total P&L: ${this.stats.totalPnL >= 0 ? '+' : ''}$${this.stats.totalPnL.toFixed(2)}
    `);
    }
    stop() {
        if (this.marketCheckInterval) {
            clearInterval(this.marketCheckInterval);
        }
        if (this.tradingInterval) {
            clearInterval(this.tradingInterval);
        }
        this.priceTracker.disconnect();
        console.log('\n👋 Bot stopped');
    }
}
//# sourceMappingURL=bot.js.map