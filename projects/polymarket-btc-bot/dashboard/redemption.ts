/**
 * Polymarket Position Redemption Module
 * 
 * Uses the CTF (Conditional Token Framework) contract to redeem winning positions.
 * Based on: https://docs.polymarket.com/developers/CTF/redeem
 * 
 * Key contracts (Polygon Mainnet):
 * - CTF: 0x4D97DCd97eC945f40cF65F87097ACe5EA0476045
 * - USDC.e: 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
 * - Neg Risk CTF: 0xC5d563A36AE78145C45a50134d48A1215220f80a
 * - Neg Risk Adapter: 0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Contract addresses
const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const NEG_RISK_CTF = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
const NEG_RISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296';

// Reliable Polygon RPCs (ordered by reliability)
const POLYGON_RPCS = [
  'https://polygon-rpc.com',
  'https://polygon-bor-rpc.publicnode.com',
  'https://rpc.ankr.com/polygon',
  'https://polygon.llamarpc.com',
  'https://1rpc.io/matic',
  'https://polygon.drpc.org',
];

// ABIs
const CTF_ABI = [
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external',
  'function balanceOf(address owner, uint256 id) view returns (uint256)',
  'function payoutNumerators(bytes32 conditionId, uint256 index) view returns (uint256)',
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)',
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

// State file for tracking redemptions
const REDEMPTION_STATE_FILE = path.join(__dirname, 'data', 'redemption-state.json');

interface RedemptionState {
  lastCheck: number;
  pendingRedemptions: PendingRedemption[];
  completedRedemptions: CompletedRedemption[];
}

interface PendingRedemption {
  conditionId: string;
  tokenId: string;
  marketSlug: string;
  side: string;
  timestamp: number;
  attempts: number;
  lastAttempt?: number;
  lastError?: string;
}

interface CompletedRedemption {
  conditionId: string;
  tokenId: string;
  marketSlug: string;
  amount: number;
  txHash: string;
  timestamp: number;
}

interface Position {
  conditionId: string;
  asset: string;
  title: string;
  size: number;
  currentValue: number;
  redeemable: boolean;
  negativeRisk: boolean;
}

/**
 * Get a working provider from the RPC list
 */
async function getWorkingProvider(): Promise<ethers.providers.StaticJsonRpcProvider | null> {
  for (const rpc of POLYGON_RPCS) {
    try {
      const provider = new ethers.providers.StaticJsonRpcProvider({
        url: rpc,
        timeout: 10000,
      }, 137);
      
      // Test the connection
      await provider.getBlockNumber();
      console.log(`   ✓ Using RPC: ${rpc.split('/')[2]}`);
      return provider;
    } catch (error) {
      console.log(`   ✗ RPC failed: ${rpc.split('/')[2]}`);
    }
  }
  return null;
}

/**
 * Load redemption state from disk
 */
function loadState(): RedemptionState {
  try {
    if (fs.existsSync(REDEMPTION_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(REDEMPTION_STATE_FILE, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading redemption state:', error);
  }
  return {
    lastCheck: 0,
    pendingRedemptions: [],
    completedRedemptions: [],
  };
}

/**
 * Save redemption state to disk
 */
function saveState(state: RedemptionState): void {
  try {
    const dir = path.dirname(REDEMPTION_STATE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(REDEMPTION_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error saving redemption state:', error);
  }
}

/**
 * Fetch positions from Polymarket Data API
 */
async function fetchPositions(walletAddress: string): Promise<Position[]> {
  try {
    const response = await fetch(
      `https://data-api.polymarket.com/positions?user=${walletAddress.toLowerCase()}`
    );
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    return data.map((p: any) => ({
      conditionId: p.conditionId,
      asset: p.asset,
      title: p.title,
      size: p.size,
      currentValue: p.currentValue,
      redeemable: p.redeemable && p.curPrice === 1, // Only redeem winning positions
      negativeRisk: p.negativeRisk || false,
    }));
  } catch (error: any) {
    console.error('Error fetching positions:', error.message);
    return [];
  }
}

/**
 * Check if a market is resolved and ready for redemption
 */
async function isMarketResolved(
  ctf: ethers.Contract,
  conditionId: string
): Promise<boolean> {
  try {
    const denominator = await ctf.payoutDenominator(conditionId);
    return denominator.gt(0);
  } catch (error) {
    return false;
  }
}

/**
 * Redeem a single position
 */
async function redeemPosition(
  wallet: ethers.Wallet,
  position: Position,
  maxRetries: number = 3
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Get fresh provider for each attempt
      const provider = await getWorkingProvider();
      if (!provider) {
        throw new Error('No working RPC available');
      }
      
      const connectedWallet = wallet.connect(provider);
      const ctf = new ethers.Contract(CTF_ADDRESS, CTF_ABI, connectedWallet);
      
      // Check balance
      const balance = await ctf.balanceOf(wallet.address, position.asset);
      if (balance.eq(0)) {
        return { success: true, error: 'Already redeemed (zero balance)' };
      }
      
      // Check if market is resolved
      const resolved = await isMarketResolved(ctf, position.conditionId);
      if (!resolved) {
        return { success: false, error: 'Market not yet resolved' };
      }
      
      console.log(`   Attempt ${attempt}/${maxRetries}: Redeeming ${ethers.utils.formatUnits(balance, 6)} tokens...`);
      
      // Get gas price
      const gasPrice = await provider.getGasPrice();
      
      // Submit redemption transaction
      const tx = await ctf.redeemPositions(
        USDC_E_ADDRESS,
        ethers.constants.HashZero, // parentCollectionId is always 0 for Polymarket
        position.conditionId,
        [1, 2], // indexSets for both outcomes
        {
          gasLimit: 250000,
          gasPrice: gasPrice.mul(120).div(100), // 20% above current
        }
      );
      
      console.log(`   TX submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait(2);
      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
      
      return { success: true, txHash: tx.hash };
      
    } catch (error: any) {
      const errorMsg = error.reason || error.code || error.message?.slice(0, 100);
      console.log(`   ❌ Attempt ${attempt} failed: ${errorMsg}`);
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
        console.log(`   Waiting ${waitTime / 1000}s before retry...`);
        await new Promise(r => setTimeout(r, waitTime));
      } else {
        return { success: false, error: errorMsg };
      }
    }
  }
  
  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Main redemption function - redeems all winning positions
 */
export async function redeemAllWinningPositions(
  privateKey: string
): Promise<{
  redeemed: number;
  failed: number;
  totalValue: number;
  txHashes: string[];
}> {
  console.log('\n🔄 Starting redemption process...');
  
  const wallet = new ethers.Wallet(privateKey);
  console.log(`   Wallet: ${wallet.address}`);
  
  // Get provider for balance checks
  const provider = await getWorkingProvider();
  if (!provider) {
    throw new Error('No working RPC available');
  }
  
  // Check USDC balance before
  const usdc = new ethers.Contract(USDC_E_ADDRESS, ERC20_ABI, provider);
  const balanceBefore = await usdc.balanceOf(wallet.address);
  console.log(`   USDC.e before: $${ethers.utils.formatUnits(balanceBefore, 6)}`);
  
  // Fetch positions
  console.log('\n📊 Fetching positions from Polymarket...');
  const positions = await fetchPositions(wallet.address);
  
  // Filter to winning positions (redeemable with value > 0)
  const winningPositions = positions.filter(p => p.redeemable && p.currentValue > 0);
  console.log(`   Found ${positions.length} total positions, ${winningPositions.length} winning`);
  
  if (winningPositions.length === 0) {
    console.log('   No positions to redeem');
    return { redeemed: 0, failed: 0, totalValue: 0, txHashes: [] };
  }
  
  // Redeem each position
  const state = loadState();
  const results = {
    redeemed: 0,
    failed: 0,
    totalValue: 0,
    txHashes: [] as string[],
  };
  
  for (const position of winningPositions) {
    console.log(`\n💰 ${position.title}`);
    console.log(`   Value: $${position.currentValue.toFixed(2)}`);
    
    const result = await redeemPosition(wallet, position);
    
    if (result.success && result.txHash) {
      results.redeemed++;
      results.totalValue += position.currentValue;
      results.txHashes.push(result.txHash);
      
      // Record completed redemption
      state.completedRedemptions.push({
        conditionId: position.conditionId,
        tokenId: position.asset,
        marketSlug: position.title,
        amount: position.currentValue,
        txHash: result.txHash,
        timestamp: Date.now(),
      });
    } else {
      results.failed++;
      console.log(`   Failed: ${result.error}`);
    }
    
    // Small delay between redemptions
    if (winningPositions.indexOf(position) < winningPositions.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  
  // Check USDC balance after
  const balanceAfter = await usdc.balanceOf(wallet.address);
  const gained = parseFloat(ethers.utils.formatUnits(balanceAfter.sub(balanceBefore), 6));
  
  console.log('\n' + '='.repeat(50));
  console.log(`USDC.e after: $${ethers.utils.formatUnits(balanceAfter, 6)}`);
  console.log(`Total gained: $${gained.toFixed(2)}`);
  console.log(`Redeemed: ${results.redeemed}, Failed: ${results.failed}`);
  console.log('='.repeat(50));
  
  // Save state
  state.lastCheck = Date.now();
  saveState(state);
  
  return results;
}

/**
 * Record a bet for future redemption tracking
 */
export function recordBetForRedemption(
  conditionId: string,
  tokenId: string,
  marketSlug: string,
  side: string
): void {
  const state = loadState();
  
  // Check if already recorded
  const existing = state.pendingRedemptions.find(
    r => r.conditionId === conditionId && r.tokenId === tokenId
  );
  
  if (existing) {
    return;
  }
  
  state.pendingRedemptions.push({
    conditionId,
    tokenId,
    marketSlug,
    side,
    timestamp: Date.now(),
    attempts: 0,
  });
  
  // Keep only last 100
  if (state.pendingRedemptions.length > 100) {
    state.pendingRedemptions = state.pendingRedemptions.slice(-100);
  }
  
  saveState(state);
  console.log(`   📝 Recorded for redemption: ${marketSlug} ${side}`);
}

/**
 * Get current USDC.e balance
 */
export async function getUSDCBalance(walletAddress: string): Promise<number> {
  const provider = await getWorkingProvider();
  if (!provider) {
    return 0;
  }
  
  const usdc = new ethers.Contract(USDC_E_ADDRESS, ERC20_ABI, provider);
  const balance = await usdc.balanceOf(walletAddress);
  return parseFloat(ethers.utils.formatUnits(balance, 6));
}

// CLI execution
if (process.argv[1]?.includes('redemption')) {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('PRIVATE_KEY environment variable required');
    process.exit(1);
  }
  
  redeemAllWinningPositions(privateKey)
    .then(result => {
      console.log('\nResult:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error.message);
      process.exit(1);
    });
}
