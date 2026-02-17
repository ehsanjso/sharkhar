#!/usr/bin/env npx tsx
/**
 * Reconcile live bet history - fix incorrect win/loss status
 * based on actual price movement
 */

import fs from 'fs';

const STATE_FILE = './data/multi-market-state.json';

interface Trade {
  id: string;
  time: string;
  marketId: string;
  side: 'Up' | 'Down' | 'Unknown';
  shares: number;
  cost: number;
  payout: number;
  pnl: number;
  result: 'WIN' | 'LOSS' | 'PENDING';
  assetOpen: number;
  assetClose: number;
}

function shouldHaveWon(trade: Trade): boolean {
  if (!trade.assetOpen || !trade.assetClose || trade.side === 'Unknown') {
    return false;
  }
  
  const priceWentUp = trade.assetClose > trade.assetOpen;
  const priceWentDown = trade.assetClose < trade.assetOpen;
  
  if (trade.side === 'Up') return priceWentUp;
  if (trade.side === 'Down') return priceWentDown;
  return false;
}

function reconcile() {
  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  
  let corrections = 0;
  let totalPnlAdjustment = 0;
  
  console.log('🔍 Reconciling live bet history...\n');
  
  for (const market of state.markets) {
    for (const strategy of market.strategies) {
      if (!strategy.liveMode || !strategy.liveHistory) continue;
      
      for (const trade of strategy.liveHistory as Trade[]) {
        // Skip chain- entries (redemption tracking) and already correct entries
        if (trade.id.startsWith('chain-')) continue;
        if (trade.result === 'WIN' && trade.payout > 0) continue;
        if (trade.shares === 0) continue;
        
        const shouldWin = shouldHaveWon(trade);
        const isMarkedLoss = trade.result === 'LOSS' || trade.payout === 0;
        
        if (shouldWin && isMarkedLoss) {
          const expectedPayout = trade.shares; // 1:1 payout
          const expectedPnl = expectedPayout - trade.cost;
          
          console.log(`❗ ${trade.id}`);
          console.log(`   Side: ${trade.side}, Open: $${trade.assetOpen.toFixed(2)}, Close: $${trade.assetClose.toFixed(2)}`);
          console.log(`   Was: LOSS (pnl: -$${trade.cost.toFixed(2)})`);
          console.log(`   Should be: WIN (pnl: +$${expectedPnl.toFixed(2)})`);
          console.log(`   Correction: +$${(expectedPnl + trade.cost).toFixed(2)}\n`);
          
          // Fix the trade
          trade.result = 'WIN';
          trade.payout = expectedPayout;
          trade.pnl = expectedPnl;
          
          // Adjust strategy totals
          const pnlDiff = expectedPnl - (-trade.cost); // from -cost to +pnl
          strategy.livePnl = (strategy.livePnl || 0) + pnlDiff + trade.cost; // add back the loss, add the win
          strategy.liveWins = (strategy.liveWins || 0) + 1;
          strategy.liveLosses = Math.max(0, (strategy.liveLosses || 0) - 1);
          
          corrections++;
          totalPnlAdjustment += pnlDiff + trade.cost;
        }
      }
    }
  }
  
  if (corrections > 0) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log(`✅ Fixed ${corrections} trades`);
    console.log(`💰 Total P&L adjustment: +$${totalPnlAdjustment.toFixed(2)}`);
  } else {
    console.log('✅ No corrections needed - all trades look correct');
  }
}

reconcile();
