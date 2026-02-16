/**
 * Live Trading Module for Polymarket
 * Handles real order placement on crypto up/down markets
 */

import { ClobClient, Side } from '@polymarket/clob-client';
import * as ethers from 'ethers';
import dotenv from 'dotenv';
import { getSimpleProvider, createSigner, withRetry, markRpcSuccess, markRpcFailed } from './rpc.js';

dotenv.config({ path: '../.env' });

const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';
const CHAIN_ID = 137; // Polygon mainnet

interface LiveMarket {
  eventId: string;
  slug: string;
  title: string;
  conditionId: string;
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
      // Use centralized RPC module for reliable connection
      const signer = createSigner(this.privateKey);
      
      // Create temp client to get API credentials (use deriveApiKey, not createOrDeriveApiKey)
      const tempClient = new ClobClient(CLOB_API, CHAIN_ID, signer);
      const derived = await tempClient.deriveApiKey();
      
      // Map deriveApiKey response to ClobClient expected format
      const apiCreds = {
        key: derived.key,
        secret: derived.secret,
        passphrase: derived.passphrase,
      };
      
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
   * Markets use slug pattern: {asset}-updown-{timeframe}-{timestamp}
   * e.g., btc-updown-5m-1771223100
   */
  async findMarket(asset: string, timeframe: string): Promise<LiveMarket | null> {
    try {
      const assetLower = asset.toLowerCase();
      const tfLabel = timeframe === '5min' ? '5m' : timeframe === '15min' ? '15m' : '5m';
      
      // Calculate current 5-minute window timestamp
      const now = Math.floor(Date.now() / 1000);
      const windowSeconds = timeframe === '5min' ? 300 : 900; // 5 or 15 minutes
      const windowTimestamp = now - (now % windowSeconds);
      
      // Build the slug
      const slug = `${assetLower}-updown-${tfLabel}-${windowTimestamp}`;
      
      console.log(`   🔍 Looking for market: ${slug}`);
      
      const response = await fetch(`${GAMMA_API}/events?slug=${slug}`);
      const events: any[] = await response.json();
      
      if (!events || events.length === 0) {
        // Try the next window (market might have just started)
        const nextSlug = `${assetLower}-updown-${tfLabel}-${windowTimestamp + windowSeconds}`;
        console.log(`   🔍 Trying next window: ${nextSlug}`);
        
        const nextResponse = await fetch(`${GAMMA_API}/events?slug=${nextSlug}`);
        const nextEvents: any[] = await nextResponse.json();
        
        if (!nextEvents || nextEvents.length === 0) {
          return null;
        }
        events.push(...nextEvents);
      }
      
      const event = events[0];
      if (!event?.markets?.length) return null;
      
      const market = event.markets[0];
      
      // Parse token IDs
      const tokenIds = JSON.parse(market.clobTokenIds || '[]');
      const outcomes = JSON.parse(market.outcomes || '[]');
      const prices = JSON.parse(market.outcomePrices || '[]');
      
      const upIndex = outcomes.findIndex((o: string) => o.toLowerCase() === 'up');
      const downIndex = outcomes.findIndex((o: string) => o.toLowerCase() === 'down');
      
      if (upIndex < 0 || downIndex < 0 || !tokenIds[upIndex] || !tokenIds[downIndex]) {
        console.log(`   ⚠️ Market found but missing token IDs`);
        return null;
      }
      
      console.log(`   ✅ Found market: ${event.title}`);
      
      return {
        eventId: event.id,
        slug: event.slug,
        title: event.title,
        conditionId: market.conditionId || '',
        upTokenId: tokenIds[upIndex],
        downTokenId: tokenIds[downIndex],
        upPrice: parseFloat(prices[upIndex] || '0.5'),
        downPrice: parseFloat(prices[downIndex] || '0.5'),
        endTime: new Date(event.endDate || Date.now() + windowSeconds * 1000),
      };
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
      const signer = createSigner(this.privateKey);
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

// ============ Auto-Redeem Resolved Positions ============
const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const CTF_ABI = [
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external',
  'function balanceOf(address owner, uint256 tokenId) view returns (uint256)',
  'function getConditionId(address oracle, bytes32 questionId, uint256 outcomeSlotCount) view returns (bytes32)'
];

export async function redeemWinnings(conditionId: string, tokenIds: string[]): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const { ethers } = await import('ethers');
    
    // Use RPC module with retry for balance checks
    const result = await withRetry(async (provider) => {
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
      const ctf = new ethers.Contract(CTF_ADDRESS, CTF_ABI, wallet);
      
      // Check balances first
      let hasBalance = false;
      for (const tokenId of tokenIds) {
        const balance = await ctf.balanceOf(wallet.address, tokenId);
        if (balance.gt(0)) {
          hasBalance = true;
          console.log(`   Found ${ethers.utils.formatUnits(balance, 6)} tokens for ${tokenId.slice(0, 10)}...`);
        }
      }
      
      if (!hasBalance) {
        return { success: false, error: 'No tokens to redeem' };
      }
      
      // Redeem - indexSets [1, 2] for both outcomes
      const tx = await ctf.redeemPositions(
        USDC_E,
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        conditionId,
        [1, 2],
        { gasLimit: 300000 }
      );
      
      console.log(`   🔄 Redeeming... TX: ${tx.hash}`);
      await tx.wait(1);
      
      return { success: true, txHash: tx.hash };
    }, 3);
    
    return result;
  } catch (error: any) {
    console.error('Redeem error:', error.message);
    return { success: false, error: error.message };
  }
}
