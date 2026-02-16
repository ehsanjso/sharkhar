import { EventEmitter } from 'events';
export declare class BTCPriceTracker extends EventEmitter {
    private wsUrl;
    private ws;
    private currentPrice;
    private openPrice;
    private priceHistory;
    private reconnectAttempts;
    private maxReconnectAttempts;
    constructor(wsUrl?: string);
    connect(): Promise<void>;
    private subscribeToBTC;
    private handleMessage;
    private updatePrice;
    private fetchBinancePrice;
    private attemptReconnect;
    setOpenPrice(price?: number): void;
    getPrice(): number;
    getOpenPrice(): number;
    getPriceChange(): number;
    getPriceChangePercent(): number;
    isUp(): boolean;
    isDown(): boolean;
    getMovementStrength(): number;
    disconnect(): void;
}
//# sourceMappingURL=btc-price.d.ts.map