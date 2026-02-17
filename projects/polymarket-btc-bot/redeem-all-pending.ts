import { ethers } from 'ethers';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const NEG_RISK_CTF = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

const CTF_ABI = [
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external',
  'function balanceOf(address owner, uint256 id) view returns (uint256)',
  'function payoutNumerators(bytes32 conditionId, uint256 index) view returns (uint256)',
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)',
];

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

const RPCS = [
  'https://polygon.drpc.org',
  'https://polygon-rpc.com',
  'https://polygon-bor-rpc.publicnode.com',
];

async function getProvider() {
  for (const rpc of RPCS) {
    try {
      const p = new ethers.providers.StaticJsonRpcProvider(rpc, 137);
      await p.getBlockNumber();
      return p;
    } catch {}
  }
  throw new Error('No working RPC');
}

async function main() {
  const db = new Database(path.join(__dirname, 'dashboard/data/polymarket.db'));
  
  // Get unredeemed winning bets
  const rows = db.prepare(`
    SELECT DISTINCT condition_id, token_id, SUM(payout) as total_payout
    FROM live_bets 
    WHERE status = 'redeemed' AND result = 'WIN' AND redeemed_at IS NULL
    AND condition_id IS NOT NULL AND token_id IS NOT NULL
    GROUP BY condition_id, token_id
  `).all() as { condition_id: string; token_id: string; total_payout: number }[];
  
  console.log(`Found ${rows.length} positions to check\n`);
  
  const provider = await getProvider();
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  console.log('Wallet:', wallet.address);
  
  const usdc = new ethers.Contract(USDC_E, ERC20_ABI, provider);
  const ctf = new ethers.Contract(CTF_ADDRESS, CTF_ABI, wallet);
  const negRiskCtf = new ethers.Contract(NEG_RISK_CTF, CTF_ABI, wallet);
  
  const balBefore = await usdc.balanceOf(wallet.address);
  console.log('USDC.e before:', ethers.utils.formatUnits(balBefore, 6), '\n');
  
  let totalRedeemed = 0;
  let totalTokens = 0;
  
  for (const row of rows) {
    const tokenId = row.token_id;
    const conditionId = row.condition_id;
    
    try {
      // Check balance in both CTF contracts
      const bal1 = await ctf.balanceOf(wallet.address, tokenId);
      const bal2 = await negRiskCtf.balanceOf(wallet.address, tokenId);
      
      if (bal1.gt(0)) {
        console.log(`CTF Token: ${tokenId.slice(0,20)}... | Balance: ${ethers.utils.formatUnits(bal1, 6)} | Expected: $${row.total_payout.toFixed(2)}`);
        totalTokens += parseFloat(ethers.utils.formatUnits(bal1, 6));
        
        // Try to redeem
        try {
          const tx = await ctf.redeemPositions(
            USDC_E,
            ethers.constants.HashZero,
            conditionId,
            [1, 2] // Both outcomes
          );
          console.log('  -> Redeeming... tx:', tx.hash);
          await tx.wait();
          console.log('  -> SUCCESS!');
          totalRedeemed += row.total_payout;
          
          // Update database
          db.prepare(`UPDATE live_bets SET redeemed_at = datetime('now') WHERE condition_id = ? AND token_id = ?`)
            .run(conditionId, tokenId);
        } catch (e: any) {
          console.log('  -> Redeem failed:', e.message?.slice(0, 80));
        }
      }
      
      if (bal2.gt(0)) {
        console.log(`NegRisk Token: ${tokenId.slice(0,20)}... | Balance: ${ethers.utils.formatUnits(bal2, 6)} | Expected: $${row.total_payout.toFixed(2)}`);
        totalTokens += parseFloat(ethers.utils.formatUnits(bal2, 6));
        
        // Try to redeem from NegRisk
        try {
          const tx = await negRiskCtf.redeemPositions(
            USDC_E,
            ethers.constants.HashZero,
            conditionId,
            [1, 2]
          );
          console.log('  -> Redeeming NegRisk... tx:', tx.hash);
          await tx.wait();
          console.log('  -> SUCCESS!');
          totalRedeemed += row.total_payout;
          
          db.prepare(`UPDATE live_bets SET redeemed_at = datetime('now') WHERE condition_id = ? AND token_id = ?`)
            .run(conditionId, tokenId);
        } catch (e: any) {
          console.log('  -> NegRisk redeem failed:', e.message?.slice(0, 80));
        }
      }
      
      if (bal1.eq(0) && bal2.eq(0)) {
        console.log(`No tokens for condition ${conditionId.slice(0,20)}... (may be lost bet or already redeemed)`);
      }
    } catch (e: any) {
      console.log(`Error checking ${conditionId.slice(0,20)}...: ${e.message?.slice(0, 60)}`);
    }
  }
  
  console.log('\n--- SUMMARY ---');
  console.log('Total tokens found:', totalTokens.toFixed(2));
  
  const balAfter = await usdc.balanceOf(wallet.address);
  console.log('USDC.e after:', ethers.utils.formatUnits(balAfter, 6));
  console.log('Net gain:', (parseFloat(ethers.utils.formatUnits(balAfter, 6)) - parseFloat(ethers.utils.formatUnits(balBefore, 6))).toFixed(6));
  
  db.close();
}

main().catch(console.error);
