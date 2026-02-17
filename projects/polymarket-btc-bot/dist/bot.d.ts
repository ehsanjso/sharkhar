import { BotConfig } from './types';
export declare class PolymarketBTCBot {
    private config;
    private polymarket;
    private priceTracker;
    private strategy;
    private newsService;
    private redemptionService;
    private currentSession;
    private currentMarket;
    private marketCheckInterval;
    private tradingInterval;
    private redemptionInterval;
    private latestResearch;
    private initialBudget;
    private currentBudget;
    private lockedProfit;
    private profitLockTriggered;
    private stats;
    constructor(config: BotConfig);
    start(): Promise<void>;
    /**
     * Check and redeem any resolved positions, update budget
     */
    private checkAndRedeemPositions;
    /**
     * Profit protection: When we hit 3x initial budget, lock 2x and trade with 1x
     * This ensures we always recoup our initial investment and play with house money
     */
    private checkProfitProtection;
    /**
     * Start periodic redemption monitoring
     */
    private startRedemptionMonitoring;
    private startMarketMonitoring;
    private checkForNewMarket;
    private startTradingSession;
    private fetchNewsResearch;
    private startTradingLoop;
    private tradingTick;
    private placeBet;
    private logStatus;
    private endSession;
    private printStats;
    stop(): void;
    /**
     * Get current available budget
     */
    getBudget(): number;
}
//# sourceMappingURL=bot.d.ts.map