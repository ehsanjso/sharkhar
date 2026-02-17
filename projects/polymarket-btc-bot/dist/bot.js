import { PolymarketClient } from './polymarket';
import { BTCPriceTracker } from './btc-price';
import { TradingStrategy } from './strategy';
import { getNewsService } from './news-research';
import { RedemptionService } from './redemption';
export class PolymarketBTCBot {
    config;
    polymarket;
    priceTracker;
    strategy;
    newsService;
    redemptionService;
    currentSession = null;
    currentMarket = null;
    marketCheckInterval = null;
    tradingInterval = null;
    redemptionInterval = null;
    latestResearch = null;
    // Budget management
    initialBudget; // Original starting budget
    currentBudget; // Active trading budget
    lockedProfit = 0; // Profit locked away (not used for trading)
    profitLockTriggered = false; // Whether 3x trigger has fired
    stats = {
        totalMarkets: 0,
        wins: 0,
        losses: 0,
        totalWagered: 0,
        totalPnL: 0,
        totalRedeemed: 0,
    };
    constructor(config) {
        this.config = config;
        this.initialBudget = config.totalBudget;
        this.currentBudget = config.totalBudget;
        this.polymarket = new PolymarketClient(config);
        this.priceTracker = new BTCPriceTracker(config.wsUrl);
        this.strategy = new TradingStrategy(config);
        this.newsService = getNewsService(process.env.TAVILY_API_KEY);
        this.redemptionService = new RedemptionService(config.privateKey);
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
        // Check for pending redemptions on startup
        await this.checkAndRedeemPositions();
        // Start periodic redemption checks (every 5 minutes)
        this.startRedemptionMonitoring();
        // Start monitoring for new markets
        this.startMarketMonitoring();
        console.log('\n🚀 Bot started! Waiting for markets...\n');
    }
    /**
     * Check and redeem any resolved positions, update budget
     */
    async checkAndRedeemPositions() {
        try {
            console.log('\n💰 Checking for redeemable positions...');
            const result = await this.redemptionService.redeemAllPending();
            if (result.totalRedeemed > 0) {
                this.stats.totalRedeemed += result.totalRedeemed;
                console.log(`\n🎉 Redeemed $${result.totalRedeemed.toFixed(2)} total!`);
            }
            // Get total wallet balance
            const walletBalance = result.newBalance;
            // Check profit protection: if total balance >= 3x initial budget
            // Lock 2x as profit and continue trading with 1x
            this.checkProfitProtection(walletBalance);
            // Update current budget (wallet balance minus locked profit)
            const previousBudget = this.currentBudget;
            this.currentBudget = walletBalance - this.lockedProfit;
            if (this.currentBudget !== previousBudget) {
                console.log(`💵 Trading budget: $${previousBudget.toFixed(2)} → $${this.currentBudget.toFixed(2)}`);
            }
            console.log(`📊 Wallet: $${walletBalance.toFixed(2)} | Trading: $${this.currentBudget.toFixed(2)} | Locked: $${this.lockedProfit.toFixed(2)}\n`);
        }
        catch (error) {
            console.error('❌ Redemption check failed:', error.message);
        }
    }
    /**
     * Profit protection: When we hit 3x initial budget, lock 2x and trade with 1x
     * This ensures we always recoup our initial investment and play with house money
     */
    checkProfitProtection(walletBalance) {
        const triggerThreshold = this.initialBudget * 3;
        // Only trigger once - when we first hit 3x
        if (!this.profitLockTriggered && walletBalance >= triggerThreshold) {
            // Lock 2x initial budget as profit
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
    startRedemptionMonitoring() {
        // Check every 5 minutes
        this.redemptionInterval = setInterval(async () => {
            // Don't check during active trading session
            if (this.currentSession && this.currentSession.result === 'PENDING') {
                return;
            }
            await this.checkAndRedeemPositions();
        }, 5 * 60 * 1000);
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
        if (!this.currentSession || !this.currentMarket)
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
        // Record bet for redemption tracking
        if (this.currentSession.totalInvested > 0 && this.currentSession.side) {
            const tokenId = this.currentSession.side === 'UP'
                ? this.currentMarket.upTokenId
                : this.currentMarket.downTokenId;
            // Get condition ID from market (we'll need to add this to market data)
            const conditionId = await this.polymarket.getConditionId(this.currentMarket.marketId);
            if (conditionId) {
                this.redemptionService.addBetRecord({
                    conditionId,
                    tokenId,
                    marketSlug: `btc-${this.currentSession.side.toLowerCase()}-${this.currentMarket.marketId.substring(0, 8)}`,
                    side: this.currentSession.side,
                    timestamp: Date.now(),
                });
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
    printStats() {
        const winRate = this.stats.totalMarkets > 0
            ? ((this.stats.wins / this.stats.totalMarkets) * 100).toFixed(1)
            : '0.0';
        const totalValue = this.currentBudget + this.lockedProfit;
        const roi = ((totalValue - this.initialBudget) / this.initialBudget * 100).toFixed(1);
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
    stop() {
        if (this.marketCheckInterval) {
            clearInterval(this.marketCheckInterval);
        }
        if (this.tradingInterval) {
            clearInterval(this.tradingInterval);
        }
        if (this.redemptionInterval) {
            clearInterval(this.redemptionInterval);
        }
        this.priceTracker.disconnect();
        console.log('\n👋 Bot stopped');
    }
    /**
     * Get current available budget
     */
    getBudget() {
        return this.currentBudget;
    }
}
//# sourceMappingURL=bot.js.map