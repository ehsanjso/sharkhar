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
export async function checkAndRedeemAll(privateKey: string): Promise<{
  checked: number;
  resolved: number;
  redeemed: number;
  totalPnL: number;
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
  
  if (pending.length === 0) {
    return { checked: 0, resolved: 0, redeemed: 0, totalPnL: 0 };
  }
  
  console.log(`🔍 [BetTracker] Checking ${pending.length} pending bets...`);
  db.dbLog.live('info', `Checking ${pending.length} pending bets`);
  
  for (const bet of pending) {
    if (!bet.condition_id || !bet.token_id) continue;
    
    try {
      // Check token balance
      const balance = await ctf.balanceOf(wallet.address, bet.token_id);
      const balanceNum = parseFloat(ethers.utils.formatUnits(balance, 6));
      
      // Check if market is resolved
      const payoutDenom = await ctf.payoutDenominator(bet.condition_id);
      const isResolved = payoutDenom.gt(0);
      
      if (!isResolved) {
        // Market not resolved yet
        continue;
      }
      
      // Market is resolved
      resolved++;
      
      // Determine result
      const won = balanceNum > 0;
      const result = won ? 'WIN' : 'LOSS';
      
      if (won && balanceNum > 0) {
        // Try to redeem
        console.log(`🔄 [BetTracker] Redeeming $${balanceNum.toFixed(2)} from bet #${bet.id}...`);
        db.dbLog.live('info', `Redeeming $${balanceNum.toFixed(2)} from bet #${bet.id}`, { betId: bet.id, amount: balanceNum }, bet.strategy_id, bet.market_key);
        
        try {
          const tx = await ctf.redeemPositions(
            USDC_E,
            '0x0000000000000000000000000000000000000000000000000000000000000000',
            bet.condition_id,
            [1, 2],
            {
              gasLimit: 500000,
              maxFeePerGas: ethers.utils.parseUnits('350', 'gwei'),
              maxPriorityFeePerGas: ethers.utils.parseUnits('50', 'gwei')
            }
          );
          
          await tx.wait(1);
          
          // Update bet as redeemed
          db.updateLiveBetStatusById(bet.id!, 'redeemed', result, balanceNum);
          
          redeemed++;
          const pnl = balanceNum - bet.amount;
          totalPnL += pnl;
          
          db.dbLog.live('info', `Redeemed $${balanceNum.toFixed(2)}! P&L: $${pnl.toFixed(2)}`, {
            betId: bet.id,
            pnl,
            txHash: tx.hash,
          }, bet.strategy_id, bet.market_key);
          
          console.log(`✅ [BetTracker] Redeemed $${balanceNum.toFixed(2)}! P&L: $${pnl.toFixed(2)}`);
          
        } catch (txError: any) {
          db.dbLog.live('error', `Redeem failed: ${txError.message?.substring(0, 100)}`, { betId: bet.id, error: txError.message }, bet.strategy_id, bet.market_key);
          console.error(`❌ [BetTracker] Redeem failed: ${txError.message?.substring(0, 50)}`);
        }
      } else {
        // Lost or already redeemed - just update status
        db.updateLiveBetStatusById(bet.id!, 'resolved', result, 0);
        const pnl = -bet.amount;
        totalPnL += pnl;
        db.dbLog.live('info', `Bet #${bet.id} ${result}: P&L $${pnl.toFixed(2)}`, { betId: bet.id, result, pnl }, bet.strategy_id, bet.market_key);
        console.log(`📕 [BetTracker] Bet #${bet.id} ${result}: P&L $${pnl.toFixed(2)}`);
      }
      
    } catch (error: any) {
      db.dbLog.live('error', `Error checking bet #${bet.id}: ${error.message?.substring(0, 100)}`, { betId: bet.id, error: error.message }, bet.strategy_id, bet.market_key);
      console.error(`⚠️ [BetTracker] Error checking bet #${bet.id}: ${error.message?.substring(0, 50)}`);
    }
  }
  
  return { checked: pending.length, resolved, redeemed, totalPnL };
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
