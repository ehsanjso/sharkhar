import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const NEG_RISK_CTF = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
const NEG_RISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

const BET_RECORDS_FILE = path.join(__dirname, 'data', 'bet-records.json');

const CTF_ABI = [
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] calldata indexSets) external',
  'function balanceOf(address owner, uint256 id) view returns (uint256)',
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)'
];

const ADAPTER_ABI = [
  'function redeemPositions(bytes32 conditionId, uint256[] calldata amounts) external'
];

// Track markets we've bet on for redemption
interface BetRecord {
  conditionId: string;
  tokenId: string;
  marketSlug: string;
  side: 'Up' | 'Down';
  timestamp: number;
  redeemed?: boolean;
}

// Load existing records from disk
function loadBetRecords(): BetRecord[] {
  console.log(`   📂 Looking for bet records at: ${BET_RECORDS_FILE}`);
  try {
    if (fs.existsSync(BET_RECORDS_FILE)) {
      const data = fs.readFileSync(BET_RECORDS_FILE, 'utf8');
      const records = JSON.parse(data);
      console.log(`   📂 Loaded ${records.length} bet records from disk`);
      return records;
    } else {
      console.log(`   📂 No bet records file found, starting fresh`);
    }
  } catch (error: any) {
    console.error('   ⚠️ Error loading bet records:', error.message);
  }
  return [];
}

// Save records to disk
function saveBetRecords(records: BetRecord[]): void {
  try {
    console.log(`   💾 Saving ${records.length} bet records to ${BET_RECORDS_FILE}`);
    const dir = path.dirname(BET_RECORDS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BET_RECORDS_FILE, JSON.stringify(records, null, 2));
    console.log(`   ✅ Bet records saved successfully`);
  } catch (error: any) {
    console.error('   ⚠️ Error saving bet records:', error.message);
    console.error('   ⚠️ Full error:', error);
  }
}

// Initialize with persisted records
let betRecords: BetRecord[] = loadBetRecords();

export function recordBet(conditionId: string, tokenId: string, marketSlug: string, side: 'Up' | 'Down') {
  // Check if already recorded (avoid duplicates)
  const existing = betRecords.find(r => r.tokenId === tokenId && r.conditionId === conditionId);
  if (existing) {
    console.log(`   📝 Bet already recorded: ${marketSlug} ${side}`);
    return;
  }

  betRecords.push({
    conditionId,
    tokenId,
    marketSlug,
    side,
    timestamp: Date.now(),
    redeemed: false
  });
  
  // Keep only last 100 bets, prioritize unredeemed
  if (betRecords.length > 100) {
    // Remove oldest redeemed first
    const redeemedIdx = betRecords.findIndex(r => r.redeemed);
    if (redeemedIdx >= 0) {
      betRecords.splice(redeemedIdx, 1);
    } else {
      betRecords.shift();
    }
  }
  
  // Persist to disk
  saveBetRecords(betRecords);
  
  console.log(`   📝 Recorded bet for redemption: ${marketSlug} ${side} (${betRecords.length} total)`);
}

export async function redeemAllWinnings(privateKey: string): Promise<{ redeemed: number; txHashes: string[] }> {
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon-bor-rpc.publicnode.com', 137);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  const ctf = new ethers.Contract(NEG_RISK_CTF, CTF_ABI, wallet);
  const adapter = new ethers.Contract(NEG_RISK_ADAPTER, ADAPTER_ABI, wallet);
  
  let totalRedeemed = 0;
  const txHashes: string[] = [];
  let needsSave = false;
  
  // Filter to unredeemed bets only
  const unredeemedBets = betRecords.filter(b => !b.redeemed);
  
  if (unredeemedBets.length === 0) {
    return { redeemed: 0, txHashes: [] };
  }
  
  console.log(`   🔍 Checking ${unredeemedBets.length} unredeemed positions...`);
  
  // Check each recorded bet
  for (const bet of unredeemedBets) {
    try {
      const balance = await ctf.balanceOf(wallet.address, bet.tokenId);
      
      if (balance.gt(0)) {
        console.log(`   💰 Found ${ethers.utils.formatUnits(balance, 6)} redeemable tokens from ${bet.marketSlug}`);
        
        // Check if market is resolved (payoutDenominator > 0)
        const payoutDenom = await ctf.payoutDenominator(bet.conditionId);
        
        if (payoutDenom.gt(0)) {
          console.log(`   🔄 Redeeming...`);
          
          const tx = await adapter.redeemPositions(
            bet.conditionId,
            [balance, 0], // amounts for each outcome
            {
              gasLimit: 500000,
              maxFeePerGas: ethers.utils.parseUnits('100', 'gwei'),
              maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei')
            }
          );
          
          await tx.wait(1);
          console.log(`   ✅ Redeemed! TX: ${tx.hash}`);
          txHashes.push(tx.hash);
          totalRedeemed += parseFloat(ethers.utils.formatUnits(balance, 6));
          
          // Mark as redeemed
          bet.redeemed = true;
          needsSave = true;
        }
      } else {
        // No balance - either already redeemed or lost bet
        // Mark as redeemed to skip in future
        const age = Date.now() - bet.timestamp;
        if (age > 10 * 60 * 1000) { // 10 minutes old
          bet.redeemed = true;
          needsSave = true;
        }
      }
    } catch (error: any) {
      console.error(`   ⚠️ Redeem error for ${bet.marketSlug}:`, error.message?.slice(0, 100));
    }
  }
  
  // Save if any changes
  if (needsSave) {
    saveBetRecords(betRecords);
  }
  
  return { redeemed: totalRedeemed, txHashes };
}

export function getBetRecords() {
  return betRecords;
}

export function getUnredeemedCount() {
  return betRecords.filter(b => !b.redeemed).length;
}
