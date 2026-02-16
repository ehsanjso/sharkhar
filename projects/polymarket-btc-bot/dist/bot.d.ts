import { BotConfig } from './types';
export declare class PolymarketBTCBot {
    private config;
    private polymarket;
    private priceTracker;
    private strategy;
    private newsService;
    private currentSession;
    private currentMarket;
    private marketCheckInterval;
    private tradingInterval;
    private latestResearch;
    private stats;
    constructor(config: BotConfig);
    start(): Promise<void>;
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
}
//# sourceMappingURL=bot.d.ts.map