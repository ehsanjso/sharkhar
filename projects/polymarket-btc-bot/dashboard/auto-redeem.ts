import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { withRetry, getSimpleProvider, markRpcSuccess, markRpcFailed } from './rpc.js';

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
  lastAttempt?: number;      // Last redemption attempt timestamp
  attemptCount?: number;      // Number of redemption attempts
  lastError?: string;         // Last error message for debugging
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

export interface RedemptionResult {
  redeemed: number;
  txHashes: string[];
  redeemedConditions: { conditionId: string; tokenId: string; amount: number }[];
}

export async function redeemAllWinnings(privateKey: string): Promise<RedemptionResult> {
  let totalRedeemed = 0;
  const txHashes: string[] = [];
  const redeemedConditions: { conditionId: string; tokenId: string; amount: number }[] = [];
  let needsSave = false;
  
  // Filter to unredeemed bets only
  const unredeemedBets = betRecords.filter(b => !b.redeemed);
  
  if (unredeemedBets.length === 0) {
    return { redeemed: 0, txHashes: [], redeemedConditions: [] };
  }
  
  console.log(`   🔍 Checking ${unredeemedBets.length} unredeemed positions...`);
  
  // Check each recorded bet using RPC with retry
  for (const bet of unredeemedBets) {
    try {
      const result = await withRetry(async (provider) => {
        const wallet = new ethers.Wallet(privateKey, provider);
        // Use regular CTF contract (not NegRisk) - that's where BTC/ETH/SOL tokens are
        const ctf = new ethers.Contract(CTF_ADDRESS, CTF_ABI, wallet);
        const adapter = new ethers.Contract(NEG_RISK_ADAPTER, ADAPTER_ABI, wallet);
        
        const balance = await ctf.balanceOf(wallet.address, bet.tokenId);
        
        if (balance.gt(0)) {
          console.log(`   💰 Found ${ethers.utils.formatUnits(balance, 6)} redeemable tokens from ${bet.marketSlug}`);
          
          // Check if market is resolved (payoutDenominator > 0)
          const payoutDenom = await ctf.payoutDenominator(bet.conditionId);
          
          if (payoutDenom.gt(0)) {
            console.log(`   🔄 Redeeming...`);
            
            // For regular CTF, call redeemPositions directly on the CTF contract
            // Parameters: collateralToken, parentCollectionId (0x0 for root), conditionId, indexSets
            const tx = await ctf.redeemPositions(
              USDC_E,
              '0x0000000000000000000000000000000000000000000000000000000000000000',
              bet.conditionId,
              [1, 2], // Both outcome index sets for binary markets
              {
                gasLimit: 500000,
                maxFeePerGas: ethers.utils.parseUnits('350', 'gwei'),
                maxPriorityFeePerGas: ethers.utils.parseUnits('50', 'gwei')
              }
            );
            
            await tx.wait(1);
            console.log(`   ✅ Redeemed! TX: ${tx.hash}`);
            
            return { 
              redeemed: parseFloat(ethers.utils.formatUnits(balance, 6)),
              txHash: tx.hash,
              markRedeemed: true,
              status: 'redeemed' as const
            };
          }
          // Market not resolved yet - keep trying
          return { redeemed: 0, txHash: null, markRedeemed: false, status: 'pending' as const };
        } else {
          // No balance means either:
          // 1. Already redeemed (mark complete after 24h to be safe)
          // 2. Lost the bet (check if market resolved)
          const payoutDenom = await ctf.payoutDenominator(bet.conditionId);
          const age = Date.now() - bet.timestamp;
          
          if (payoutDenom.gt(0)) {
            // Market resolved, we have no tokens = lost or already redeemed
            // Mark as done after 1 hour (gives time for edge cases)
            return { 
              redeemed: 0, 
              txHash: null, 
              markRedeemed: age > 60 * 60 * 1000, // 1 hour
              status: 'no_balance' as const
            };
          }
          // Market not resolved, no balance = probably a lost bet when it resolves
          // Keep checking until market resolves
          return { 
            redeemed: 0, 
            txHash: null, 
            markRedeemed: false,
            status: 'awaiting_resolution' as const
          };
        }
      }, 5); // 5 retries with exponential backoff
      
      if (result.redeemed > 0) {
        totalRedeemed += result.redeemed;
        txHashes.push(result.txHash!);
        redeemedConditions.push({
          conditionId: bet.conditionId,
          tokenId: bet.tokenId,
          amount: result.redeemed
        });
      }
      if (result.markRedeemed) {
        bet.redeemed = true;
        needsSave = true;
        console.log(`   ✓ Marked ${bet.marketSlug} as complete (${result.status})`);
      }
    } catch (error: any) {
      // Log RPC errors but NEVER give up
      const errorMsg = error.message?.slice(0, 100) || 'Unknown error';
      
      // Track attempt for debugging
      bet.lastAttempt = Date.now();
      bet.attemptCount = (bet.attemptCount || 0) + 1;
      bet.lastError = errorMsg;
      needsSave = true;
      
      // Distinguish between contract reverts and RPC issues
      // "missing revert data" = RPC failed to return proper data
      // CALL_EXCEPTION on balanceOf = usually RPC issue, not real revert
      const isRpcError = errorMsg.includes('timeout') || 
                         errorMsg.includes('ETIMEDOUT') ||
                         errorMsg.includes('network') ||
                         errorMsg.includes('ECONNREFUSED') ||
                         errorMsg.includes('429') || // rate limit
                         errorMsg.includes('502') || errorMsg.includes('503') || errorMsg.includes('504') ||
                         errorMsg.includes('All RPCs failed') ||
                         errorMsg.includes('missing response') ||
                         errorMsg.includes('missing revert data') || // RPC didn't return proper error
                         errorMsg.includes('balanceOf'); // balanceOf shouldn't revert, it's an RPC issue
      
      // True contract revert: has specific revert reason, not balanceOf
      const isContractRevert = errorMsg.includes('revert') && 
                               !isRpcError && 
                               !errorMsg.includes('balanceOf') &&
                               !errorMsg.includes('missing revert data');
      
      if (isContractRevert) {
        // Actual contract revert with reason - might be wrong amounts
        console.error(`   ⚠️ Contract revert for ${bet.marketSlug}: ${errorMsg}`);
        console.log(`   📝 Attempt #${bet.attemptCount} - needs investigation`);
      } else {
        // RPC/network error - will retry next cycle (quietly)
        if (bet.attemptCount! % 10 === 0 || bet.attemptCount! <= 2) {
          // Only log every 10th attempt or first few to reduce noise
          console.log(`   ↻ RPC issue for ${bet.marketSlug}, attempt #${bet.attemptCount} - will retry`);
        }
      }
      // NEVER mark as redeemed on RPC errors - keep trying forever
    }
  }
  
  // Save if any changes
  if (needsSave) {
    saveBetRecords(betRecords);
  }
  
  return { redeemed: totalRedeemed, txHashes, redeemedConditions };
}

export function getBetRecords() {
  return betRecords;
}

export function getUnredeemedCount() {
  return betRecords.filter(b => !b.redeemed).length;
}

export function getRedemptionStatus() {
  const unredeemed = betRecords.filter(b => !b.redeemed);
  return {
    total: betRecords.length,
    unredeemed: unredeemed.length,
    redeemed: betRecords.filter(b => b.redeemed).length,
    pending: unredeemed.map(b => ({
      market: b.marketSlug,
      side: b.side,
      age: Math.round((Date.now() - b.timestamp) / 60000), // minutes
      attempts: b.attemptCount || 0,
      lastError: b.lastError
    }))
  };
}
