import { BTCMarket, MarketOdds, OrderResult, BotConfig } from './types';
export declare class PolymarketClient {
    private client;
    private config;
    private initialized;
    constructor(config: BotConfig);
    initialize(): Promise<void>;
    getMarketOdds(tokenId: string): Promise<{
        price: number;
    }>;
    getBTCMarketOdds(market: BTCMarket): Promise<MarketOdds>;
    placeMakerOrder(tokenId: string, price: number, amount: number): Promise<OrderResult>;
    getOrderbook(tokenId: string): Promise<{
        bids: any[];
        asks: any[];
    }>;
    getConditionId(marketId: string): Promise<string | null>;
    findActiveBTCMarket(): Promise<BTCMarket | null>;
}
//# sourceMappingURL=polymarket.d.ts.map