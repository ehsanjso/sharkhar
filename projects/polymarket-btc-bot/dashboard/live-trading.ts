/**
 * Live Trading Module for Polymarket
 * Handles real order placement on crypto up/down markets
 */

import { ClobClient, Side } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';
const CHAIN_ID = 137; // Polygon mainnet

interface LiveMarket {
  eventId: string;
  slug: string;
  title: string;
  upTokenId: string;
  downTokenId: string;
  upPrice: number;
  downPrice: number;
  endTime: Date;
}

interface OrderResult {
  success: boolean;
  orderId?: string;
  shares?: number;
  price?: number;
  error?: string;
}

class LiveTradingClient {
  private client: ClobClient | null = null;
  private initialized = false;
  private dryRun: boolean;
  private privateKey: string;

  constructor() {
    this.privateKey = process.env.PRIVATE_KEY || '';
    this.dryRun = process.env.DRY_RUN === 'true';
    
    if (!this.privateKey) {
      console.warn('⚠️ No PRIVATE_KEY set - live trading disabled');
    }
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    if (!this.privateKey) return false;

    try {
      const signer = new Wallet(this.privateKey);
      
      // Create temp client to get API credentials
      const tempClient = new ClobClient(CLOB_API, CHAIN_ID, signer);
      const apiCreds = await tempClient.createOrDeriveApiKey();
      
      // Create authenticated client
      this.client = new ClobClient(
        CLOB_API,
        CHAIN_ID,
        signer,
        apiCreds,
        0 // signature type
      );

      this.initialized = true;
      console.log('✅ Live trading client initialized');
      console.log(`   Wallet: ${signer.address}`);
      console.log(`   Mode: ${this.dryRun ? 'DRY RUN' : '🔴 LIVE'}`);
      
      return true;
    } catch (error: any) {
      console.error('❌ Failed to initialize live trading:', error.message);
      return false;
    }
  }

  isDryRun(): boolean {
    return this.dryRun;
  }

  setDryRun(value: boolean): void {
    this.dryRun = value;
    console.log(`   Mode changed: ${this.dryRun ? 'DRY RUN' : '🔴 LIVE'}`);
  }

  /**
   * Find active crypto up/down market
   */
  async findMarket(asset: string, timeframe: string): Promise<LiveMarket | null> {
    try {
      const response = await fetch(
        `${GAMMA_API}/events?active=true&closed=false&limit=200`
      );
      const events: any[] = await response.json();

      const assetLower = asset.toLowerCase();
      const tfLabel = timeframe === '5min' ? '5' : timeframe === '15min' ? '15' : timeframe;

      for (const event of events) {
        const slug = (event.slug || '').toLowerCase();
        const title = (event.title || '').toLowerCase();

        // Match patterns like "eth-5m-updown" or "ETH 5 minute up or down"
        const hasAsset = slug.includes(assetLower) || title.includes(assetLower);
        const hasTimeframe = slug.includes(`${tfLabel}m`) || 
                            title.includes(`${tfLabel} min`) ||
                            title.includes(`${tfLabel}-min`);
        const isUpDown = slug.includes('updown') || title.includes('up or down');

        if (hasAsset && hasTimeframe && isUpDown && event.markets?.length > 0) {
          const market = event.markets[0];
          
          // Parse outcomes and token IDs
          const outcomes = JSON.parse(market.outcomes || '[]');
          const prices = JSON.parse(market.outcomePrices || '[]');
          const tokenIds = market.clobTokenIds || [];

          const upIndex = outcomes.findIndex((o: string) => 
            o.toLowerCase().includes('up') || o.toLowerCase() === 'yes'
          );
          const downIndex = outcomes.findIndex((o: string) => 
            o.toLowerCase().includes('down') || o.toLowerCase() === 'no'
          );

          if (upIndex >= 0 && downIndex >= 0 && tokenIds[upIndex] && tokenIds[downIndex]) {
            return {
              eventId: event.id,
              slug: event.slug,
              title: event.title,
              upTokenId: tokenIds[upIndex],
              downTokenId: tokenIds[downIndex],
              upPrice: parseFloat(prices[upIndex] || '0.5'),
              downPrice: parseFloat(prices[downIndex] || '0.5'),
              endTime: new Date(event.endDate || Date.now() + 5 * 60 * 1000),
            };
          }
        }
      }

      return null;
    } catch (error: any) {
      console.error(`Failed to find ${asset} ${timeframe} market:`, error.message);
      return null;
    }
  }

  /**
   * Place a real order on Polymarket
   */
  async placeOrder(
    tokenId: string,
    side: 'Up' | 'Down',
    amount: number,
    price: number
  ): Promise<OrderResult> {
    if (!this.client) {
      await this.initialize();
      if (!this.client) {
        return { success: false, error: 'Client not initialized' };
      }
    }

    const shares = Math.floor(amount / price);
    
    if (this.dryRun) {
      console.log(`🔸 [DRY RUN] Would buy ${shares} ${side} shares @ $${price.toFixed(3)}`);
      return {
        success: true,
        orderId: `dry-${Date.now()}`,
        shares,
        price,
      };
    }

    try {
      console.log(`💰 [LIVE] Placing order: ${shares} ${side} shares @ $${price.toFixed(3)}`);
      
      const response = await this.client.createAndPostOrder({
        tokenID: tokenId,
        price,
        size: shares,
        side: Side.BUY,
      });

      console.log(`✅ Order placed: ${response.orderID}`);
      
      return {
        success: true,
        orderId: response.orderID,
        shares,
        price,
      };
    } catch (error: any) {
      console.error('❌ Order failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get wallet balance (USDC on Polygon)
   */
  async getBalance(): Promise<number> {
    if (!this.privateKey) return 0;
    
    try {
      const signer = new Wallet(this.privateKey);
      // This would need a provider to get actual balance
      // For now return 0 as placeholder
      console.log(`   Wallet address: ${signer.address}`);
      return 0;
    } catch {
      return 0;
    }
  }
}

// Singleton instance
export const liveTrading = new LiveTradingClient();

// Export types
export type { LiveMarket, OrderResult };
