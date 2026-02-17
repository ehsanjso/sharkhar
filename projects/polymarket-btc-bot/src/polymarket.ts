import { ClobClient, Side } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import { BTCMarket, MarketOdds, OrderResult, BotConfig } from './types';

export class PolymarketClient {
  private client: ClobClient | null = null;
  private config: BotConfig;
  private initialized = false;

  constructor(config: BotConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const signer = new Wallet(this.config.privateKey);
    
    // Create temp client to get API credentials
    const tempClient = new ClobClient(
      this.config.polymarketHost,
      this.config.chainId,
      signer
    );
    
    const apiCreds = await tempClient.createOrDeriveApiKey();
    
    // Create authenticated client
    this.client = new ClobClient(
      this.config.polymarketHost,
      this.config.chainId,
      signer,
      apiCreds,
      0 // signature type
    );

    this.initialized = true;
    console.log('✅ Polymarket client initialized');
  }

  async getMarketOdds(tokenId: string): Promise<{ price: number }> {
    const response = await fetch(
      `${this.config.polymarketHost}/price?token_id=${tokenId}&side=buy`
    );
    return response.json();
  }

  async getBTCMarketOdds(market: BTCMarket): Promise<MarketOdds> {
    const [upRes, downRes] = await Promise.all([
      this.getMarketOdds(market.upTokenId),
      this.getMarketOdds(market.downTokenId),
    ]);

    return {
      upPrice: parseFloat(upRes.price.toString()),
      downPrice: parseFloat(downRes.price.toString()),
      upProbability: parseFloat(upRes.price.toString()),
      downProbability: parseFloat(downRes.price.toString()),
    };
  }

  async placeMakerOrder(
    tokenId: string,
    price: number,
    amount: number
  ): Promise<OrderResult> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    if (this.config.dryRun) {
      const shares = Math.floor(amount / price);
      console.log(`🔸 [DRY RUN] Would buy ${shares} shares at $${price.toFixed(2)}`);
      return {
        success: true,
        orderId: `dry-run-${Date.now()}`,
        shares,
        price,
      };
    }

    try {
      const size = Math.floor(amount / price);
      
      const response = await this.client.createAndPostOrder({
        tokenID: tokenId,
        price,
        size,
        side: Side.BUY,
      });

      return {
        success: true,
        orderId: response.orderID,
        shares: size,
        price,
      };
    } catch (error: any) {
      console.error('Order failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getOrderbook(tokenId: string): Promise<{ bids: any[]; asks: any[] }> {
    const response = await fetch(
      `${this.config.polymarketHost}/book?token_id=${tokenId}`
    );
    return response.json();
  }

  async getConditionId(marketId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.config.gammaApi}/markets/${marketId}`);
      if (!response.ok) return null;
      const market = await response.json() as { conditionId?: string };
      return market.conditionId || null;
    } catch (error) {
      console.error('Error fetching condition ID:', error);
      return null;
    }
  }

  async findActiveBTCMarket(): Promise<BTCMarket | null> {
    try {
      // Search for active BTC 15-minute markets
      const response = await fetch(
        `${this.config.gammaApi}/events?active=true&closed=false&limit=100`
      );
      const events = await response.json();

      // Look for BTC up/down minute markets
      for (const event of events) {
        const title = event.title?.toLowerCase() || '';
        if (
          (title.includes('btc') || title.includes('bitcoin')) &&
          (title.includes('up') || title.includes('down') || title.includes('minute'))
        ) {
          // Found a potential match
          const market = event.markets?.[0];
          if (market) {
            const outcomes = JSON.parse(market.outcomes || '[]');
            const prices = JSON.parse(market.outcomePrices || '[]');
            const tokenIds = market.clobTokenIds || [];

            const upIndex = outcomes.findIndex((o: string) => 
              o.toLowerCase().includes('up') || o.toLowerCase() === 'yes'
            );
            const downIndex = outcomes.findIndex((o: string) => 
              o.toLowerCase().includes('down') || o.toLowerCase() === 'no'
            );

            if (upIndex >= 0 && downIndex >= 0) {
              return {
                marketId: market.id,
                upTokenId: tokenIds[upIndex],
                downTokenId: tokenIds[downIndex],
                openPrice: 0, // Will be set from BTC price feed
                currentPrice: 0,
                upProbability: parseFloat(prices[upIndex]),
                downProbability: parseFloat(prices[downIndex]),
                startTime: new Date(event.startTime || Date.now()),
                endTime: new Date(event.endTime || Date.now() + 15 * 60 * 1000),
                minutesSinceStart: 0,
              };
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding BTC market:', error);
      return null;
    }
  }
}
