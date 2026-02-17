import { ethers } from 'ethers';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const NEG_RISK_CTF = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

const CTF_ABI = [
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external',
  'function balanceOf(address owner, uint256 id) view returns (uint256)',
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
      console.log('Using RPC:', rpc);
      return p;
    } catch {}
  }
  throw new Error('No working RPC');
}

async function main() {
  const db = new Database(path.join(__dirname, 'data/polymarket.db'));
  
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
  
  let tokensFound = 0;
  let positionsWithTokens: { conditionId: string; tokenId: string; balance: ethers.BigNumber; contract: 'ctf' | 'negRisk'; payout: number }[] = [];
  
  // First pass: check all balances
  console.log('=== CHECKING TOKEN BALANCES ===\n');
  for (const row of rows) {
    const tokenId = row.token_id;
    const conditionId = row.condition_id;
    
    try {
      const bal1 = await ctf.balanceOf(wallet.address, tokenId);
      const bal2 = await negRiskCtf.balanceOf(wallet.address, tokenId);
      
      if (bal1.gt(0)) {
        const tokens = parseFloat(ethers.utils.formatUnits(bal1, 6));
        console.log(`CTF: ${tokens.toFixed(2)} tokens | Expected: $${row.total_payout.toFixed(2)} | Condition: ${conditionId.slice(0,16)}...`);
        tokensFound += tokens;
        positionsWithTokens.push({ conditionId, tokenId, balance: bal1, contract: 'ctf', payout: row.total_payout });
      }
      
      if (bal2.gt(0)) {
        const tokens = parseFloat(ethers.utils.formatUnits(bal2, 6));
        console.log(`NegRisk: ${tokens.toFixed(2)} tokens | Expected: $${row.total_payout.toFixed(2)} | Condition: ${conditionId.slice(0,16)}...`);
        tokensFound += tokens;
        positionsWithTokens.push({ conditionId, tokenId, balance: bal2, contract: 'negRisk', payout: row.total_payout });
      }
    } catch (e: any) {
      console.log(`Error checking ${conditionId.slice(0,16)}...: ${e.message?.slice(0, 50)}`);
    }
  }
  
  console.log(`\n=== FOUND ${tokensFound.toFixed(2)} TOTAL TOKENS IN ${positionsWithTokens.length} POSITIONS ===\n`);
  
  if (positionsWithTokens.length === 0) {
    console.log('No tokens to redeem. They may have been lost bets or already redeemed.');
    db.close();
    return;
  }
  
  // Second pass: redeem
  console.log('=== REDEEMING POSITIONS ===\n');
  let redeemed = 0;
  
  for (const pos of positionsWithTokens) {
    const contract = pos.contract === 'ctf' ? ctf : negRiskCtf;
    const contractName = pos.contract === 'ctf' ? 'CTF' : 'NegRisk';
    
    try {
      console.log(`Redeeming ${contractName} position ${pos.conditionId.slice(0,16)}...`);
      const tx = await contract.redeemPositions(
        USDC_E,
        ethers.constants.HashZero,
        pos.conditionId,
        [1, 2]
      );
      console.log('  TX:', tx.hash);
      const receipt = await tx.wait();
      console.log('  CONFIRMED! Gas used:', receipt.gasUsed.toString());
      redeemed++;
      
      // Update DB
      db.prepare(`UPDATE live_bets SET redeemed_at = datetime('now') WHERE condition_id = ? AND token_id = ?`)
        .run(pos.conditionId, pos.tokenId);
    } catch (e: any) {
      console.log('  FAILED:', e.reason || e.message?.slice(0, 80));
    }
  }
  
  console.log('\n=== FINAL SUMMARY ===');
  console.log('Positions redeemed:', redeemed, '/', positionsWithTokens.length);
  
  const balAfter = await usdc.balanceOf(wallet.address);
  console.log('USDC.e before:', ethers.utils.formatUnits(balBefore, 6));
  console.log('USDC.e after:', ethers.utils.formatUnits(balAfter, 6));
  const gained = parseFloat(ethers.utils.formatUnits(balAfter, 6)) - parseFloat(ethers.utils.formatUnits(balBefore, 6));
  console.log('NET GAINED: $' + gained.toFixed(6));
  
  db.close();
}

main().catch(console.error);
