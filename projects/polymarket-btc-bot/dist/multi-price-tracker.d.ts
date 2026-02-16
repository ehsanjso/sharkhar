/**
 * Multi-asset price tracker using Binance WebSocket
 * Tracks BTC, ETH, SOL prices in real-time
 */
import { CryptoAsset } from './types-multi';
export declare class MultiPriceTracker {
    private prices;
    private sockets;
    private assets;
    constructor(assets?: CryptoAsset[]);
    connect(): Promise<void>;
    private fetchInitialPrices;
    private connectWebSocket;
    setOpenPrice(asset: CryptoAsset): void;
    getPrice(asset: CryptoAsset): number;
    getOpenPrice(asset: CryptoAsset): number;
    getPriceChange(asset: CryptoAsset): number;
    getPriceChangePct(asset: CryptoAsset): number;
    getMovementStrength(asset: CryptoAsset): number;
    isConnected(asset: CryptoAsset): boolean;
    getSummary(): {
        [key in CryptoAsset]?: {
            price: number;
            change: number;
            changePct: number;
        };
    };
    disconnect(): void;
}
export declare function getPriceTracker(assets?: CryptoAsset[]): MultiPriceTracker;
//# sourceMappingURL=multi-price-tracker.d.ts.map