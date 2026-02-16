/**
 * Multi-asset, multi-timeframe types for Polymarket candle trading
 */
export type CryptoAsset = 'BTC' | 'ETH' | 'SOL';
export type Timeframe = '5min' | '15min' | '1hr' | '4hr' | '1day';
export interface CandleMarket {
    marketId: string;
    asset: CryptoAsset;
    timeframe: Timeframe;
    upTokenId: string;
    downTokenId: string;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    openPrice: number;
    currentPrice: number;
    upProbability: number;
    downProbability: number;
    question: string;
    slug?: string;
    source: 'auto' | 'manual';
}
export interface MultiAssetSession {
    market: CandleMarket;
    side: 'UP' | 'DOWN' | null;
    lockedAt: Date | null;
    bets: BetRecord[];
    totalInvested: number;
    totalShares: number;
    result: 'PENDING' | 'WIN' | 'LOSS';
    payout: number;
    profit: number;
    newsSentiment?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    newsConfidence?: number;
}
export interface BetRecord {
    minute: number;
    amount: number;
    executed: boolean;
    orderId?: string;
    shares?: number;
    price?: number;
    timestamp?: Date;
}
export interface MultiAssetConfig {
    assets: CryptoAsset[];
    timeframes: Timeframe[];
    budgetPerMarket: {
        '5min': number;
        '15min': number;
        '1hr': number;
        '4hr': number;
        '1day': number;
    };
    betSchedules: {
        [key in Timeframe]: {
            pctTime: number;
            pctBudget: number;
        }[];
    };
    minProbability: number;
    useNewsResearch: boolean;
    dryRun: boolean;
    manualMarkets: ManualMarketConfig[];
}
export interface ManualMarketConfig {
    asset: CryptoAsset;
    timeframe: Timeframe;
    upTokenId: string;
    downTokenId: string;
    question?: string;
}
export interface MultiAssetStats {
    byAsset: {
        [key in CryptoAsset]?: {
            markets: number;
            wins: number;
            losses: number;
            pnl: number;
        };
    };
    byTimeframe: {
        [key in Timeframe]?: {
            markets: number;
            wins: number;
            losses: number;
            pnl: number;
        };
    };
    overall: {
        totalMarkets: number;
        wins: number;
        losses: number;
        totalWagered: number;
        totalPnL: number;
    };
}
export interface PriceFeedConfig {
    asset: CryptoAsset;
    wsUrl: string;
    restUrl: string;
}
export declare const DEFAULT_PRICE_FEEDS: PriceFeedConfig[];
export declare const DEFAULT_BET_SCHEDULES: MultiAssetConfig['betSchedules'];
export declare const DEFAULT_BUDGETS: MultiAssetConfig['budgetPerMarket'];
export declare function timeframeToDuration(tf: Timeframe): number;
export declare function createDefaultConfig(dryRun?: boolean): MultiAssetConfig;
//# sourceMappingURL=types-multi.d.ts.map