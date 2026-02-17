import 'dotenv/config';
import { ethers } from 'ethers';
import Database from 'better-sqlite3';

const db = new Database('./dashboard/data/polymarket.db');
const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const CTF_ABI = [
  'function balanceOf(address,uint256) view returns (uint256)',
  'function payoutDenominator(bytes32) view returns (uint256)',
];

const provider = new ethers.providers.StaticJsonRpcProvider(process.env.ALCHEMY_RPC, 137);
const ctf = new ethers.Contract(CTF, CTF_ABI, provider);
const wallet = '0x923C9c79ADF737A878f6fFb4946D7da889d78E1d';

const unredeemed = db.prepare(`
  SELECT id, condition_id, token_id, side, market_id
  FROM live_bets WHERE status != 'redeemed'
`).all() as any[];

let needsRedeem = 0;
let alreadyDone = 0;

for (const bet of unredeemed) {
  try {
    const balance = await ctf.balanceOf(wallet, bet.token_id);
    const balNum = parseFloat(ethers.utils.formatUnits(balance, 6));
    
    if (balNum > 0) {
      const payout = await ctf.payoutDenominator(bet.condition_id);
      if (!payout.eq(0)) {
        console.log(`⚠️ #${bet.id}: ${balNum.toFixed(2)} shares NEED REDEEM`);
        needsRedeem++;
      } else {
        console.log(`⏳ #${bet.id}: ${balNum.toFixed(2)} shares (not resolved yet)`);
      }
    } else {
      alreadyDone++;
    }
  } catch (e) {
    console.log(`❓ #${bet.id}: RPC error`);
  }
}

console.log(`\n✅ Already done (0 balance): ${alreadyDone}`);
console.log(`⚠️ Need redemption: ${needsRedeem}`);

if (alreadyDone > 0) {
  db.prepare(`UPDATE live_bets SET status = 'redeemed', redeemed_at = datetime('now') WHERE status = 'resolved'`).run();
  console.log(`\n🧹 Cleaned up ${alreadyDone} stale entries`);
}

db.close();
