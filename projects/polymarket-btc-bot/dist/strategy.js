export class TradingStrategy {
    config;
    constructor(config) {
        this.config = config;
    }
    createSession(market, btcOpenPrice) {
        const bets = this.config.betSchedule.map((b) => ({
            minute: b.minute,
            amount: b.amount,
            executed: false,
        }));
        return {
            marketId: market.marketId,
            side: null,
            lockedAt: null,
            btcOpenPrice,
            bets,
            totalInvested: 0,
            totalShares: 0,
            result: 'PENDING',
            payout: 0,
            profit: 0,
        };
    }
    /**
     * Decide which side to take based on:
     * 1. BTC price movement from open
     * 2. Market probabilities
     */
    decideSide(priceTracker, odds) {
        const priceChange = priceTracker.getPriceChange();
        const movementStrength = priceTracker.getMovementStrength();
        // Need at least some movement to decide
        if (movementStrength < 0.1) {
            console.log('⏳ Waiting for stronger price movement...');
            return null;
        }
        const isUp = priceChange > 0;
        const preferredSide = isUp ? 'UP' : 'DOWN';
        const preferredProb = isUp ? odds.upProbability : odds.downProbability;
        // Check if our preferred side meets minimum probability
        if (preferredProb >= this.config.minProbability) {
            console.log(`📈 Deciding ${preferredSide} - BTC ${isUp ? '+' : ''}$${priceChange.toFixed(2)}, ` +
                `Prob: ${(preferredProb * 100).toFixed(1)}%`);
            return preferredSide;
        }
        // If preferred side doesn't meet threshold, check the other side
        const otherProb = isUp ? odds.downProbability : odds.upProbability;
        if (otherProb >= this.config.minProbability) {
            console.log(`🔄 Market disagrees - going with ${isUp ? 'DOWN' : 'UP'} at ` +
                `${(otherProb * 100).toFixed(1)}%`);
            return isUp ? 'DOWN' : 'UP';
        }
        console.log('⚠️ Neither side meets probability threshold');
        return null;
    }
    /**
     * Check if we should place a bet at the current minute
     */
    shouldBet(session, minutesSinceStart) {
        for (const bet of session.bets) {
            if (!bet.executed && bet.minute <= minutesSinceStart) {
                return bet;
            }
        }
        return null;
    }
    /**
     * Check if probability still meets our threshold
     */
    meetsThreshold(session, odds) {
        if (!session.side)
            return false;
        const currentProb = session.side === 'UP' ? odds.upProbability : odds.downProbability;
        return currentProb >= this.config.minProbability;
    }
    /**
     * Calculate optimal order price (maker price)
     * We want to be on the maker side to avoid fees
     */
    calculateMakerPrice(session, odds) {
        if (!session.side)
            return 0;
        // Get current market price
        const marketPrice = session.side === 'UP' ? odds.upPrice : odds.downPrice;
        // Place order slightly below market to ensure maker status
        // But not too far to miss fills
        const makerPrice = Math.max(0.01, marketPrice - 0.01);
        return makerPrice;
    }
    /**
     * Calculate expected value of a bet
     */
    calculateEV(price, probability) {
        // EV = (probability of win * payout) - (probability of loss * stake)
        // Payout for winning share = $1
        // If we buy at price P, our profit if win = 1 - P
        // If we lose, we lose P
        const winEV = probability * (1 - price);
        const lossEV = (1 - probability) * price;
        return winEV - lossEV;
    }
    /**
     * Update session after market resolves
     */
    resolveSession(session, btcClosePrice) {
        const btcWentUp = btcClosePrice > session.btcOpenPrice;
        const wePickedUp = session.side === 'UP';
        const won = btcWentUp === wePickedUp;
        session.result = won ? 'WIN' : 'LOSS';
        session.payout = won ? session.totalShares : 0;
        session.profit = session.payout - session.totalInvested;
        return session;
    }
    /**
     * Generate session summary
     */
    getSummary(session) {
        const lines = [
            `\n${'='.repeat(50)}`,
            `📊 SESSION SUMMARY`,
            `${'='.repeat(50)}`,
            `Market: ${session.marketId}`,
            `Side: ${session.side || 'NONE'}`,
            `BTC Open: $${session.btcOpenPrice.toLocaleString()}`,
            '',
            `💰 BETS:`,
        ];
        for (const bet of session.bets) {
            const status = bet.executed
                ? `✅ ${bet.shares} shares @ $${bet.price?.toFixed(2)}`
                : '❌ Not executed';
            lines.push(`  Min ${bet.minute}: $${bet.amount} - ${status}`);
        }
        lines.push('');
        lines.push(`Total Invested: $${session.totalInvested.toFixed(2)}`);
        lines.push(`Total Shares: ${session.totalShares}`);
        if (session.result !== 'PENDING') {
            lines.push('');
            lines.push(`Result: ${session.result === 'WIN' ? '🎉 WIN' : '😢 LOSS'}`);
            lines.push(`Payout: $${session.payout.toFixed(2)}`);
            lines.push(`Profit: ${session.profit >= 0 ? '+' : ''}$${session.profit.toFixed(2)}`);
        }
        lines.push(`${'='.repeat(50)}\n`);
        return lines.join('\n');
    }
}
//# sourceMappingURL=strategy.js.map