/**
 * Bet Tracker - Complete lifecycle tracking using SQLite ONLY
 * Uses the existing live_bets table in the database
 * NO JSON FILES - everything goes to SQLite
 * 
 * Lifecycle: pending → resolved → redeemed → (closed via result)
 */

import { ethers } from 'ethers';
import * as db from './database.js';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

// Contracts
const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

const CTF_ABI = [
  'function balanceOf(address, uint256) view returns (uint256)',
  'function payoutDenominator(bytes32) view returns (uint256)',
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external'
];

/**
 * Track a new bet when order is placed (uses existing db.saveLiveBet)
 * Includes deduplication to prevent duplicate entries on restart
 */
export function trackBetPlaced(params: {
  orderId: string;
  strategyId: string;
  marketKey: string;
  marketId?: string;
  marketSlug?: string;
  conditionId: string;
  tokenId: string;
  side: 'Up' | 'Down';
  betAmount: number;
  price?: number;
  shares?: number;
}): number {
  // Check for duplicate by orderId first (most reliable)
  const existingByOrder = db.getLiveBetByOrderId?.(params.orderId);
  if (existingByOrder) {
    console.log(`⚠️ [BetTracker] Duplicate bet detected (orderId: ${params.orderId}), skipping`);
    return existingByOrder.id!;
  }
  
  // Also check for recent duplicate by strategyId + tokenId + amount (within last 60 seconds)
  const pending = db.getLiveBetsByStatus('pending');
  const recentDuplicate = pending.find(b => 
    b.strategy_id === params.strategyId &&
    b.token_id === params.tokenId &&
    Math.abs(b.amount - params.betAmount) < 0.01 &&
    b.created_at && (Date.now() - new Date(b.created_at).getTime()) < 60000
  );
  
  if (recentDuplicate) {
    console.log(`⚠️ [BetTracker] Duplicate bet detected (recent same bet), skipping`);
    return recentDuplicate.id!;
  }
  
  const betId = db.saveLiveBet({
    strategy_id: params.strategyId,
    market_key: params.marketKey,
    market_id: params.marketId || params.marketSlug || '',
    condition_id: params.conditionId,
    token_id: params.tokenId,
    order_id: params.orderId,
    side: params.side,
    amount: params.betAmount,
    price: params.price || 0.5,
    shares: params.shares || Math.floor(params.betAmount / 0.5),
    status: 'pending',
  });
  
  // Log to database (live category)
  db.dbLog.live('info', `Bet placed: #${betId} ${params.side} $${params.betAmount}`, {
    orderId: params.orderId,
    strategyId: params.strategyId,
    conditionId: params.conditionId,
  }, params.strategyId, params.marketKey);
  
  console.log(`📝 [BetTracker] Recorded bet #${betId}: ${params.side} $${params.betAmount}`);
  return betId;
}

/**
 * Update bet when filled (if not already done)
 */
export function trackBetFilled(orderId: string, shares: number, price: number): void {
  // The live bet is already saved with shares in server-multi.ts
  // This is for future use if we need to update after placement
  db.dbLog.live('info', `Order filled: ${shares} shares @ $${price.toFixed(4)}`, { orderId, shares, price });
  console.log(`✅ [BetTracker] Order filled: ${shares} shares @ $${price.toFixed(4)}`);
}

/**
 * Get all pending bets that need checking
 */
export function getPendingBets(): db.LiveBetRecord[] {
  return db.getLiveBetsByStatus('pending');
}

/**
 * Check and redeem all pending bets
 */
export interface ChainConfirmedResult {
  conditionId: string;
  tokenId: string;
  strategyId: string;
  won: boolean;
  payout: number;
  pnl: number;
}

export async function checkAndRedeemAll(privateKey: string): Promise<{
  checked: number;
  resolved: number;
  redeemed: number;
  totalPnL: number;
  confirmedResults: ChainConfirmedResult[];
}> {
  const provider = new ethers.providers.StaticJsonRpcProvider(
    process.env.ALCHEMY_RPC || 'https://polygon.llamarpc.com',
    137
  );
  const wallet = new ethers.Wallet(privateKey, provider);
  const ctf = new ethers.Contract(CTF_ADDRESS, CTF_ABI, wallet);
  
  const pending = getPendingBets();
  let resolved = 0;
  let redeemed = 0;
  let totalPnL = 0;
  const confirmedResults: ChainConfirmedResult[] = [];
  
  // Track which tokenIds we've already processed to handle shared positions
  const processedTokens = new Map<string, { won: boolean; totalPayout: number; redeemed: boolean }>();
  
  if (pending.length === 0) {
    return { checked: 0, resolved: 0, redeemed: 0, totalPnL: 0, confirmedResults: [] };
  }
  
  console.log(`🔍 [BetTracker] Checking ${pending.length} pending bets...`);
  db.dbLog.live('info', `Checking ${pending.length} pending bets`);
  
  // Group bets by tokenId to handle shared positions correctly
  const betsByToken = new Map<string, typeof pending>();
  for (const bet of pending) {
    if (!bet.token_id) continue;
    if (!betsByToken.has(bet.token_id)) {
      betsByToken.set(bet.token_id, []);
    }
    betsByToken.get(bet.token_id)!.push(bet);
  }
  
  // Process each unique tokenId once
  for (const [tokenId, bets] of betsByToken) {
    const firstBet = bets[0];
    if (!firstBet.condition_id) continue;
    
    try {
      // Check token balance ONCE per tokenId
      const balance = await ctf.balanceOf(wallet.address, tokenId);
      const balanceNum = parseFloat(ethers.utils.formatUnits(balance, 6));
      
      // Check if market is resolved
      const payoutDenom = await ctf.payoutDenominator(firstBet.condition_id);
      const isResolved = payoutDenom.gt(0);
      
      if (!isResolved) {
        // Market not resolved yet - skip all bets for this token
        continue;
      }
      
      // Market is resolved - determine result for ALL bets on this token
      const won = balanceNum > 0;
      const result = won ? 'WIN' : 'LOSS';
      
      // Calculate total invested by all strategies in this token
      const totalInvested = bets.reduce((sum, b) => sum + b.amount, 0);
      
      resolved += bets.length;
      
      if (won && balanceNum > 0) {
        // Try to redeem ONCE for all bets on this token
        console.log(`🔄 [BetTracker] Redeeming $${balanceNum.toFixed(2)} from ${bets.length} bets on token...`);
        db.dbLog.live('info', `Redeeming $${balanceNum.toFixed(2)} from ${bets.length} bets`, { tokenId, amount: balanceNum });
        
        try {
          const tx = await ctf.redeemPositions(
            USDC_E,
            '0x0000000000000000000000000000000000000000000000000000000000000000',
            firstBet.condition_id,
            [1, 2],
            {
              gasLimit: 500000,
              maxFeePerGas: ethers.utils.parseUnits('350', 'gwei'),
              maxPriorityFeePerGas: ethers.utils.parseUnits('50', 'gwei')
            }
          );
          
          await tx.wait(1);
          redeemed++;
          
          // Distribute payout proportionally to all strategies that bet on this token
          for (const bet of bets) {
            const proportion = bet.amount / totalInvested;
            const betPayout = balanceNum * proportion;
            const betPnl = betPayout - bet.amount;
            
            // Update bet as redeemed with proportional payout
            db.updateLiveBetStatusById(bet.id!, 'redeemed', 'WIN', betPayout);
            totalPnL += betPnl;
            
            db.dbLog.live('info', `Bet #${bet.id} WIN! Payout: $${betPayout.toFixed(2)}, P&L: $${betPnl.toFixed(2)}`, {
              betId: bet.id,
              pnl: betPnl,
              proportion: (proportion * 100).toFixed(0) + '%',
            }, bet.strategy_id, bet.market_key);
            
            console.log(`✅ [BetTracker] Bet #${bet.id} (${bet.strategy_id}) WIN! $${betPayout.toFixed(2)} (${(proportion * 100).toFixed(0)}% share)`);
            
            // Record chain-confirmed result for each strategy
            confirmedResults.push({
              conditionId: bet.condition_id,
              tokenId: bet.token_id,
              strategyId: bet.strategy_id,
              won: true,
              payout: betPayout,
              pnl: betPnl,
            });
          }
          
          console.log(`✅ [BetTracker] Redeemed $${balanceNum.toFixed(2)} total, distributed to ${bets.length} strategies`);
          
        } catch (txError: any) {
          db.dbLog.live('error', `Redeem failed: ${txError.message?.substring(0, 100)}`, { tokenId, error: txError.message });
          console.error(`❌ [BetTracker] Redeem failed: ${txError.message?.substring(0, 50)}`);
        }
      } else {
        // Lost or already redeemed - update ALL bets on this token as LOSS
        for (const bet of bets) {
          db.updateLiveBetStatusById(bet.id!, 'resolved', 'LOSS', 0);
          const pnl = -bet.amount;
          totalPnL += pnl;
          db.dbLog.live('info', `Bet #${bet.id} LOSS: P&L $${pnl.toFixed(2)}`, { betId: bet.id, result: 'LOSS', pnl }, bet.strategy_id, bet.market_key);
          console.log(`📕 [BetTracker] Bet #${bet.id} (${bet.strategy_id}) LOSS: P&L $${pnl.toFixed(2)}`);
          
          // Record chain-confirmed result (loss) for each strategy
          confirmedResults.push({
            conditionId: bet.condition_id,
            tokenId: bet.token_id,
            strategyId: bet.strategy_id,
            won: false,
            payout: 0,
            pnl,
          });
        }
      }
      
    } catch (error: any) {
      db.dbLog.live('error', `Error checking token ${tokenId}: ${error.message?.substring(0, 100)}`, { tokenId, error: error.message });
      console.error(`⚠️ [BetTracker] Error checking token: ${error.message?.substring(0, 50)}`);
    }
  }
  
  return { checked: pending.length, resolved, redeemed, totalPnL, confirmedResults };
}

/**
 * Get stats from database
 */
export function getStats(): {
  total: number;
  pending: number;
  resolved: number;
  redeemed: number;
  wins: number;
  losses: number;
  totalPnL: number;
} {
  const stats = db.getLiveBetsStats();
  return {
    total: stats.total,
    pending: stats.pending,
    resolved: stats.resolved,
    redeemed: stats.redeemed,
    wins: stats.wins,
    losses: stats.losses,
    totalPnL: stats.totalPayout - stats.totalBet,
  };
}

/**
 * Get recent bet history
 */
export function getRecentHistory(limit = 20): db.LiveBetRecord[] {
  return db.getRecentLiveBets(limit);
}

/**
 * Get comprehensive live trading status for logging
 */
export function getLiveStatus(): {
  summary: string;
  pendingBets: any[];
  recentResolved: any[];
  unredeemed: any[];
  walletBalance: number | null;
} {
  const pending = db.getPendingBets();
  const resolved = db.getResolvedBets().slice(0, 10);
  const unredeemed = resolved.filter(b => b.result === 'WIN' && !b.redeemed_at);
  
  const summary = `📊 Live Trading Status:
  - Pending bets: ${pending.length}
  - Unredeemed wins: ${unredeemed.length}
  - Recent resolved: ${resolved.length}`;
  
  return {
    summary,
    pendingBets: pending,
    recentResolved: resolved,
    unredeemed,
    walletBalance: null // Will be filled by caller
  };
}

/**
 * Log detailed bet lifecycle events
 */
export function logBetEvent(event: string, betId: number, details: Record<string, any> = {}) {
  const timestamp = new Date().toISOString();
  const detailStr = Object.entries(details).map(([k, v]) => `${k}=${v}`).join(', ');
  console.log(`📝 [BetTracker] ${timestamp} | Bet #${betId} | ${event} | ${detailStr}`);
  
  // Also log to database
  db.dbLog.info('live', `Bet #${betId}: ${event}`, details);
}
