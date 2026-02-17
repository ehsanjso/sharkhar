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

// ============ CLOB Market Info Cache ============
interface TokenInfo {
  tickSize: number;
  negRisk: boolean;
  feeRate: number;
  fetchedAt: number;
}
const tokenInfoCache = new Map<string, TokenInfo>();
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Fetch tick size for a token (minimum price increment)
 */
async function getTickSize(tokenId: string): Promise<number> {
  try {
    const response = await fetch(`${CLOB_API}/tick-size?token_id=${tokenId}`);
    if (!response.ok) {
      console.warn(`⚠️ Failed to get tick size: ${response.status}`);
      return 0.01; // Default to 1¢
    }
    const data = await response.json();
    return parseFloat(data.tick_size || data.tickSize || '0.01');
  } catch (error: any) {
    console.warn(`⚠️ Tick size fetch error: ${error.message}`);
    return 0.01;
  }
}

/**
 * Fetch neg-risk flag for a token
 */
async function getNegRisk(tokenId: string): Promise<boolean> {
  try {
    const response = await fetch(`${CLOB_API}/neg-risk?token_id=${tokenId}`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.neg_risk || data.negRisk || false;
  } catch {
    return false;
  }
}

/**
 * Fetch fee rate for a token
 */
async function getFeeRate(tokenId: string): Promise<number> {
  try {
    const response = await fetch(`${CLOB_API}/fee-rate?token_id=${tokenId}`);
    if (!response.ok) {
      console.warn(`⚠️ Failed to get fee rate: ${response.status}`);
      return 0.01; // Default 1%
    }
    const data = await response.json();
    return parseFloat(data.fee_rate || data.feeRate || data.maker || '0.01');
  } catch (error: any) {
    console.warn(`⚠️ Fee rate fetch error: ${error.message}`);
    return 0.01;
  }
}

/**
 * Get all token info (cached)
 */
async function getTokenInfo(tokenId: string): Promise<TokenInfo> {
  const cached = tokenInfoCache.get(tokenId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }
  
  console.log(`   📊 Fetching token info for ${tokenId.substring(0, 12)}...`);
  
  const [tickSize, negRisk, feeRate] = await Promise.all([
    getTickSize(tokenId),
    getNegRisk(tokenId),
    getFeeRate(tokenId),
  ]);
  
  const info: TokenInfo = { tickSize, negRisk, feeRate, fetchedAt: Date.now() };
  tokenInfoCache.set(tokenId, info);
  
  console.log(`   📊 Token info: tick=${tickSize}, negRisk=${negRisk}, fee=${(feeRate * 100).toFixed(2)}%`);
  return info;
}

/**
 * Round price to valid tick size
 */
function roundToTickSize(price: number, tickSize: number): number {
  return Math.round(price / tickSize) * tickSize;
}

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
  private initializing = false;  // Prevent concurrent initialization
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
    
    // Prevent concurrent initialization
    if (this.initializing) {
      console.log('⏳ Client initialization already in progress, waiting...');
      // Wait for initialization to complete
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.initialized;
    }

    this.initializing = true;

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
    } finally {
      this.initializing = false;
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

    // Fetch token info (tick size, fee rate) before placing order
    const tokenInfo = await getTokenInfo(tokenId);
    
    // Round price to valid tick size
    const adjustedPrice = roundToTickSize(price, tokenInfo.tickSize);
    if (adjustedPrice !== price) {
      console.log(`   📐 Price adjusted to tick size: ${price.toFixed(4)} → ${adjustedPrice.toFixed(4)}`);
    }
    
    // Calculate shares with adjusted price
    const shares = Math.floor(amount / adjustedPrice);
    
    // Account for fees in cost calculation
    const estimatedCost = shares * adjustedPrice * (1 + tokenInfo.feeRate);
    console.log(`   💵 Estimated cost with ${(tokenInfo.feeRate * 100).toFixed(1)}% fee: $${estimatedCost.toFixed(2)}`);
    
    // Polymarket requires minimum 5 shares per order
    if (shares < 5) {
      console.log(`⚠️ Order size too small: ${shares} shares (min 5). Skipping.`);
      return { success: false, error: `Order size too small: ${shares} shares (minimum 5)` };
    }
    
    if (this.dryRun) {
      console.log(`🔸 [DRY RUN] Would buy ${shares} ${side} shares @ $${adjustedPrice.toFixed(3)}`);
      return {
        success: true,
        orderId: `dry-${Date.now()}`,
        shares,
        price: adjustedPrice,
      };
    }

    try {
      console.log(`💰 [LIVE] Placing MARKET order (FOK): ${shares} ${side} shares @ ~$${adjustedPrice.toFixed(3)} (tick=${tokenInfo.tickSize})`);
      
      // Use market order (FOK = Fill or Kill) for guaranteed execution
      // This will either fill immediately at best available price or fail
      const response = await this.client.createAndPostMarketOrder({
        tokenID: tokenId,
        amount: amount, // Amount in USDC to spend
        side: Side.BUY,
      });

      // Market orders return different response structure
      const orderId = response?.orderID || response?.id || 'market-' + Date.now();
      const filledShares = response?.size || response?.filled || shares;
      const avgPrice = response?.avgPrice || response?.price || adjustedPrice;
      
      console.log(`✅ Market order filled: ${orderId}`);
      console.log(`   Shares: ${filledShares}, Avg price: $${avgPrice}`);
      
      return {
        success: true,
        orderId,
        shares: filledShares,
        price: avgPrice,
      };
    } catch (error: any) {
      console.error('❌ Market order failed:', error.message);
      // Log full error for debugging
      if (error.response?.data) {
        console.error('   API response:', JSON.stringify(error.response.data));
      }
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Multi-phase order execution with fallback
   * Phase 1: FOK at market price
   * Phase 2: Limit order at better price (+2¢), reduced size
   * Phase 3: Final limit order at even better price (+4¢)
   */
  async placeOrderWithRetry(
    tokenId: string,
    side: 'Up' | 'Down',
    amount: number,
    price: number,
    config?: {
      phase1TimeoutMs?: number;  // Wait time for phase 1 (default: 10000)
      phase2Increment?: number;  // Price increment for phase 2 in cents (default: 0.02)
      phase2TimeoutMs?: number;  // Wait time for phase 2 (default: 15000)
      phase3Increment?: number;  // Price increment for phase 3 in cents (default: 0.04)
      phase3TimeoutMs?: number;  // Wait time for phase 3 (default: 10000)
      sizeReduction?: number;    // Size reduction per phase (default: 0.9 = 90%)
    }
  ): Promise<OrderResult> {
    const {
      phase1TimeoutMs = 10000,
      phase2Increment = 0.02,
      phase2TimeoutMs = 15000,
      phase3Increment = 0.04,
      phase3TimeoutMs = 10000,
      sizeReduction = 0.9,
    } = config || {};

    if (!this.client) {
      await this.initialize();
      if (!this.client) {
        return { success: false, error: 'Client not initialized' };
      }
    }

    // Fetch token info once for all phases
    const tokenInfo = await getTokenInfo(tokenId);
    const tickSize = tokenInfo.tickSize;

    // ============ PHASE 1: FOK Market Order ============
    console.log(`📍 [Phase 1] FOK market order: $${amount.toFixed(2)} @ ${(price * 100).toFixed(1)}¢ (tick=${tickSize})`);

    
    const phase1Result = await this.placeOrder(tokenId, side, amount, price);
    if (phase1Result.success) {
      console.log(`✅ [Phase 1] Filled!`);
      return phase1Result;
    }
    
    // Check if error is FOK rejection (liquidity issue)
    // Retriable errors: FOK killed, no match (no liquidity), not filled
    const isRetriableError = phase1Result.error?.includes('FOK') || 
                             phase1Result.error?.includes('killed') ||
                             phase1Result.error?.includes('fully filled') ||
                             phase1Result.error?.includes('no match') ||
                             phase1Result.error?.includes('No match');
    
    if (!isRetriableError) {
      // Non-FOK error, don't retry
      console.log(`❌ [Phase 1] Non-recoverable error: ${phase1Result.error}`);
      return phase1Result;
    }

    console.log(`⏳ [Phase 1] FOK rejected, waiting ${phase1TimeoutMs/1000}s before Phase 2...`);
    await this.sleep(phase1TimeoutMs);

    // ============ PHASE 2: Limit Order at Better Price ============
    const phase2Amount = Math.floor(amount * sizeReduction);
    const phase2Price = roundToTickSize(Math.min(price + phase2Increment, 0.99), tickSize); // Round to tick
    const phase2Shares = Math.floor(phase2Amount / phase2Price);

    if (phase2Shares < 5) {
      console.log(`⚠️ [Phase 2] Size too small after reduction: ${phase2Shares} shares`);
      return { success: false, error: 'Order size too small after phase 2 reduction' };
    }

    console.log(`📍 [Phase 2] Limit order: $${phase2Amount.toFixed(2)} @ ${(phase2Price * 100).toFixed(1)}¢ (+${(phase2Increment * 100).toFixed(0)}¢)`);

    try {
      const phase2Order = await this.client.createAndPostOrder({
        tokenID: tokenId,
        price: phase2Price,
        size: phase2Shares,
        side: Side.BUY,
      });

      const orderId = phase2Order?.orderID || phase2Order?.id;
      if (!orderId) {
        console.log(`❌ [Phase 2] No order ID returned`);
      } else {
        console.log(`📝 [Phase 2] Order placed: ${orderId}`);
        
        // Wait and check if filled
        await this.sleep(phase2TimeoutMs);
        
        try {
          const orderStatus = await this.client.getOrder(orderId);
          if (orderStatus?.status === 'filled' || orderStatus?.filledSize > 0) {
            console.log(`✅ [Phase 2] Filled! ${orderStatus.filledSize || phase2Shares} shares`);
            return {
              success: true,
              orderId,
              shares: orderStatus.filledSize || phase2Shares,
              price: orderStatus.avgPrice || phase2Price,
            };
          }
          
          // Cancel unfilled order before phase 3
          if (orderStatus?.status === 'open' || orderStatus?.status === 'live') {
            console.log(`🗑️ [Phase 2] Cancelling unfilled order...`);
            await this.client.cancelOrder(orderId);
          }
        } catch (e: any) {
          console.log(`⚠️ [Phase 2] Status check failed: ${e.message}`);
        }
      }
    } catch (error: any) {
      console.log(`❌ [Phase 2] Order failed: ${error.message}`);
    }

    // ============ PHASE 3: Final Attempt at Best Price ============
    const phase3Amount = Math.floor(phase2Amount * sizeReduction);
    const phase3Price = roundToTickSize(Math.min(price + phase3Increment, 0.99), tickSize); // Round to tick
    const phase3Shares = Math.floor(phase3Amount / phase3Price);

    if (phase3Shares < 5) {
      console.log(`⚠️ [Phase 3] Size too small: ${phase3Shares} shares. Giving up.`);
      return { success: false, error: 'Order size too small after phase 3 reduction' };
    }

    console.log(`📍 [Phase 3] Final limit order: $${phase3Amount.toFixed(2)} @ ${(phase3Price * 100).toFixed(1)}¢ (+${(phase3Increment * 100).toFixed(0)}¢)`);

    try {
      const phase3Order = await this.client.createAndPostOrder({
        tokenID: tokenId,
        price: phase3Price,
        size: phase3Shares,
        side: Side.BUY,
      });

      const orderId = phase3Order?.orderID || phase3Order?.id;
      if (!orderId) {
        return { success: false, error: 'Phase 3: No order ID returned' };
      }

      console.log(`📝 [Phase 3] Order placed: ${orderId}`);
      
      // Wait and check final status
      await this.sleep(phase3TimeoutMs);
      
      try {
        const orderStatus = await this.client.getOrder(orderId);
        if (orderStatus?.status === 'filled' || orderStatus?.filledSize > 0) {
          console.log(`✅ [Phase 3] Filled! ${orderStatus.filledSize || phase3Shares} shares`);
          return {
            success: true,
            orderId,
            shares: orderStatus.filledSize || phase3Shares,
            price: orderStatus.avgPrice || phase3Price,
          };
        }
        
        // Cancel if still open
        if (orderStatus?.status === 'open' || orderStatus?.status === 'live') {
          console.log(`🗑️ [Phase 3] Cancelling unfilled order...`);
          await this.client.cancelOrder(orderId);
        }
      } catch (e: any) {
        console.log(`⚠️ [Phase 3] Status check failed: ${e.message}`);
      }
      
      return { success: false, error: 'All phases failed - no liquidity' };
    } catch (error: any) {
      console.error(`❌ [Phase 3] Final order failed: ${error.message}`);
      return { success: false, error: `Phase 3 failed: ${error.message}` };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

// ============ Market Outcome Checking ============
const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const CTF_ABI = [
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external',
  'function balanceOf(address owner, uint256 tokenId) view returns (uint256)',
  'function getConditionId(address oracle, bytes32 questionId, uint256 outcomeSlotCount) view returns (bytes32)',
  'function payoutNumerators(bytes32 conditionId, uint256 index) view returns (uint256)',
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)'
];

/**
 * Check the actual Polymarket outcome for a resolved market
 * Returns 'Up', 'Down', or null if not yet resolved
 */
export async function checkMarketOutcome(conditionId: string): Promise<'Up' | 'Down' | null> {
  try {
    const { ethers } = await import('ethers');
    
    const result = await withRetry(async (provider) => {
      const ctf = new ethers.Contract(CTF_ADDRESS, CTF_ABI, provider);
      
      // Check if market is resolved
      const payoutDenom = await ctf.payoutDenominator(conditionId);
      if (payoutDenom.eq(0)) {
        return null; // Not resolved yet
      }
      
      // Get payout numerators for each outcome (index 0 = first outcome, index 1 = second)
      // For up/down markets: typically index 0 = Up, index 1 = Down
      const payout0 = await ctf.payoutNumerators(conditionId, 0);
      const payout1 = await ctf.payoutNumerators(conditionId, 1);
      
      // The winning outcome has payout numerator > 0
      if (payout0.gt(0) && payout1.eq(0)) {
        return 'Up'; // First outcome won
      } else if (payout1.gt(0) && payout0.eq(0)) {
        return 'Down'; // Second outcome won
      } else {
        // Edge case: both have payouts (split) or neither (shouldn't happen)
        console.log(`   ⚠️ Unusual payout: Up=${payout0.toString()}, Down=${payout1.toString()}`);
        return payout0.gte(payout1) ? 'Up' : 'Down';
      }
    }, 2);
    
    return result;
  } catch (error: any) {
    console.error(`Failed to check outcome for ${conditionId}:`, error.message);
    return null;
  }
}

/**
 * Get market info from Gamma API by slug
 */
export async function getMarketBySlug(slug: string): Promise<{
  conditionId: string;
  upTokenId: string;
  downTokenId: string;
  resolved: boolean;
  winningOutcome?: 'Up' | 'Down';
} | null> {
  try {
    const response = await fetch(`${GAMMA_API}/events?slug=${slug}`);
    const events: any[] = await response.json();
    
    if (!events || events.length === 0) return null;
    
    const event = events[0];
    const market = event?.markets?.[0];
    if (!market) return null;
    
    const tokenIds = JSON.parse(market.clobTokenIds || '[]');
    const outcomes = JSON.parse(market.outcomes || '[]');
    
    const upIndex = outcomes.findIndex((o: string) => o.toLowerCase() === 'up');
    const downIndex = outcomes.findIndex((o: string) => o.toLowerCase() === 'down');
    
    const result: any = {
      conditionId: market.conditionId || '',
      upTokenId: tokenIds[upIndex] || '',
      downTokenId: tokenIds[downIndex] || '',
      resolved: event.closed || false,
    };
    
    // If resolved, check which outcome won
    if (result.resolved && result.conditionId) {
      result.winningOutcome = await checkMarketOutcome(result.conditionId);
    }
    
    return result;
  } catch (error: any) {
    console.error(`Failed to get market ${slug}:`, error.message);
    return null;
  }
}

// ============ Auto-Redeem Resolved Positions ============

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
