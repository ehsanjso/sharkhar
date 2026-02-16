import { BTCMarket, TradingSession, BetSchedule, MarketOdds, BotConfig } from './types';
import { BTCPriceTracker } from './btc-price';
export declare class TradingStrategy {
    private config;
    constructor(config: BotConfig);
    createSession(market: BTCMarket, btcOpenPrice: number): TradingSession;
    /**
     * Decide which side to take based on:
     * 1. BTC price movement from open
     * 2. Market probabilities
     */
    decideSide(priceTracker: BTCPriceTracker, odds: MarketOdds): 'UP' | 'DOWN' | null;
    /**
     * Check if we should place a bet at the current minute
     */
    shouldBet(session: TradingSession, minutesSinceStart: number): BetSchedule | null;
    /**
     * Check if probability still meets our threshold
     */
    meetsThreshold(session: TradingSession, odds: MarketOdds): boolean;
    /**
     * Calculate optimal order price (maker price)
     * We want to be on the maker side to avoid fees
     */
    calculateMakerPrice(session: TradingSession, odds: MarketOdds): number;
    /**
     * Calculate expected value of a bet
     */
    calculateEV(price: number, probability: number): number;
    /**
     * Update session after market resolves
     */
    resolveSession(session: TradingSession, btcClosePrice: number): TradingSession;
    /**
     * Generate session summary
     */
    getSummary(session: TradingSession): string;
}
//# sourceMappingURL=strategy.d.ts.map