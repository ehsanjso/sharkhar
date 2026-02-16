/**
 * Multi-Asset Polymarket Trading Bot
 * Supports BTC, ETH across multiple timeframes
 */
import { CryptoAsset, Timeframe, MultiAssetConfig, MultiAssetStats } from './types-multi';
export declare class MultiAssetBot {
    private config;
    private polymarket;
    private priceTracker;
    private newsService;
    private sessions;
    private marketScanInterval;
    private tradingInterval;
    private stats;
    constructor(config?: Partial<MultiAssetConfig>);
    start(): Promise<void>;
    private loadManualMarkets;
    private startMarketScanning;
    private scanForMarkets;
    private getAssetName;
    private startSession;
    private fetchNewsForSession;
    private startTradingLoop;
    private tradingTick;
    private updateMarketOdds;
    private decideSide;
    private checkAndPlaceBets;
    private placeBet;
    private logSessionStatus;
    private endSession;
    private updateStats;
    getStats(): MultiAssetStats;
    printStats(): void;
    addManualMarket(asset: CryptoAsset, timeframe: Timeframe, upTokenId: string, downTokenId: string): void;
    stop(): void;
}
//# sourceMappingURL=multi-bot.d.ts.map