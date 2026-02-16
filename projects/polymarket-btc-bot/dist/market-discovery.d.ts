/**
 * Market Discovery for Crypto Candle Markets
 * Finds BTC, ETH, SOL, XRP up/down markets across all timeframes
 */
import { CryptoAsset, Timeframe } from './types-multi';
export interface DiscoveredMarket {
    eventId: string;
    slug: string;
    title: string;
    asset: CryptoAsset;
    timeframe: Timeframe;
    startTime: Date;
    endTime: Date;
    upTokenId: string;
    downTokenId: string;
    upPrice: number;
    downPrice: number;
    isLive: boolean;
}
/**
 * Discover all active candle markets
 */
export declare function discoverCandleMarkets(assets?: CryptoAsset[], timeframes?: Timeframe[]): Promise<DiscoveredMarket[]>;
/**
 * Fetch market details from a specific event slug
 */
export declare function fetchMarketBySlug(slug: string): Promise<DiscoveredMarket | null>;
/**
 * Watch for new markets being created
 */
export declare function watchForNewMarkets(assets: CryptoAsset[], timeframes: Timeframe[], onNewMarket: (market: DiscoveredMarket) => void, intervalMs?: number): Promise<() => void>;
/**
 * Discover markets by fetching from Polymarket's crypto category pages
 * This is needed because Gamma API doesn't index the candle markets
 */
export declare function discoverFromPolymarket(timeframe: Timeframe): Promise<DiscoveredMarket[]>;
/**
 * Discover all markets across all timeframes
 */
export declare function discoverAllMarkets(assets?: CryptoAsset[], timeframes?: Timeframe[]): Promise<DiscoveredMarket[]>;
//# sourceMappingURL=market-discovery.d.ts.map