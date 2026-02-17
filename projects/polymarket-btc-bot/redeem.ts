import 'dotenv/config';
import { ethers } from 'ethers';
import Database from 'better-sqlite3';

const db = new Database('./dashboard/data/polymarket.db');
const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const CTF_ABI = [
  'function balanceOf(address,uint256) view returns (uint256)',
  'function payoutDenominator(bytes32) view returns (uint256)',
  'function redeemPositions(address,bytes32,bytes32,uint256[]) external',
];

const provider = new ethers.providers.StaticJsonRpcProvider(process.env.ALCHEMY_RPC, 137);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const ctf = new ethers.Contract(CTF, CTF_ABI, wallet);

// Get USDC balance before
const usdcContract = new ethers.Contract(USDC, ['function balanceOf(address) view returns (uint256)'], provider);
const before = await usdcContract.balanceOf(wallet.address);
console.log(`💵 Before: $${parseFloat(ethers.utils.formatUnits(before, 6)).toFixed(2)}`);

// Get unique conditions to redeem
const bets = db.prepare(`
  SELECT DISTINCT condition_id, token_id FROM live_bets WHERE status != 'redeemed'
`).all() as any[];

for (const bet of bets) {
  if (!bet.condition_id) continue;
  
  try {
    const balance = await ctf.balanceOf(wallet.address, bet.token_id);
    if (balance.eq(0)) continue;
    
    const payout = await ctf.payoutDenominator(bet.condition_id);
    if (payout.eq(0)) {
      console.log(`⏳ Not resolved yet`);
      continue;
    }
    
    console.log(`🚀 Redeeming ${ethers.utils.formatUnits(balance, 6)} shares...`);
    
    const tx = await ctf.redeemPositions(
      USDC,
      ethers.constants.HashZero,
      bet.condition_id,
      [1, 2],
      { gasLimit: 200000, maxFeePerGas: ethers.utils.parseUnits('400', 'gwei'), maxPriorityFeePerGas: ethers.utils.parseUnits('50', 'gwei') }
    );
    console.log(`   TX: ${tx.hash}`);
    await tx.wait(1);
    console.log(`   ✅ Done!`);
  } catch (e: any) {
    console.log(`   ❌ ${e.message?.substring(0, 60)}`);
  }
}

// Get USDC balance after
const after = await usdcContract.balanceOf(wallet.address);
console.log(`\n💵 After: $${parseFloat(ethers.utils.formatUnits(after, 6)).toFixed(2)}`);
console.log(`💰 Redeemed: +$${(parseFloat(ethers.utils.formatUnits(after, 6)) - parseFloat(ethers.utils.formatUnits(before, 6))).toFixed(2)}`);

// Clean up DB
db.prepare("UPDATE live_bets SET status = 'redeemed' WHERE status != 'redeemed'").run();
db.close();
