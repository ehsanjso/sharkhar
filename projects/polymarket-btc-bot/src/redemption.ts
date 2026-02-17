import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

// Standard CTF contract (for regular markets like BTC 5-min)
const STANDARD_CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';

// NegRisk contracts (for negRisk markets - NOT used by BTC 5-min)
const NEG_RISK_CTF = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
const NEG_RISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296';

// Public RPCs for read operations (balance checks, etc.)
const PUBLIC_RPCS = [
  'https://polygon.llamarpc.com',
  'https://polygon-bor-rpc.publicnode.com',
  'https://rpc.ankr.com/polygon',
  'https://1rpc.io/matic',
  'https://polygon.meowrpc.com',
  'https://polygon.drpc.org',
];

// Premium RPCs for write operations (transactions) - loaded from env
const PREMIUM_RPCS = [
  process.env.ALCHEMY_RPC,
  process.env.TATUM_RPC,
].filter(Boolean) as string[];

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

// ABI for balance/payout checks (works for both standard and negRisk CTF)
const CTF_ABI = [
  'function balanceOf(address owner, uint256 id) view returns (uint256)',
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)',
];

// Standard CTF redemption ABI (for regular markets like BTC 5-min)
const STANDARD_CTF_ABI = [
  'function balanceOf(address owner, uint256 id) view returns (uint256)',
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)',
  'function redeemPositions(address collateral, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external',
];

// NegRisk adapter ABI (for negRisk markets - NOT used by BTC 5-min)
const ADAPTER_ABI = [
  'function redeemPositions(bytes32 conditionId, uint256[] calldata amounts) external',
];

export interface BetRecord {
  conditionId: string;
  tokenId: string;
  marketSlug: string;
  side: string;
  timestamp: number;
  redeemed: boolean;
  attemptCount?: number;
}

export interface RedemptionResult {
  totalRedeemed: number;
  successfulRedemptions: number;
  failedRedemptions: number;
  newBalance: number;
  details: {
    marketSlug: string;
    amount: number;
    success: boolean;
    error?: string;
  }[];
}

/**
 * Try read operation with public RPCs (parallel race for speed)
 */
async function tryReadWithRpcs<T>(
  fn: (provider: ethers.providers.StaticJsonRpcProvider) => Promise<T>
): Promise<T> {
  // Race first 3 public RPCs for speed
  const racePromises = PUBLIC_RPCS.slice(0, 3).map(async (rpc) => {
    const provider = new ethers.providers.StaticJsonRpcProvider(
      { url: rpc, timeout: 8000 },
      137
    );
    return fn(provider);
  });

  try {
    return await Promise.any(racePromises);
  } catch {
    // If race fails, try remaining RPCs sequentially
    const errors: string[] = [];
    for (const rpc of PUBLIC_RPCS.slice(3)) {
      try {
        const provider = new ethers.providers.StaticJsonRpcProvider(
          { url: rpc, timeout: 10000 },
          137
        );
        return await fn(provider);
      } catch (e: any) {
        errors.push(`${rpc}: ${e.message?.substring(0, 50)}`);
      }
    }
    throw new Error(`All read RPCs failed: ${errors.join('; ')}`);
  }
}

/**
 * Try write operation with premium RPCs first, then fallback to public
 */
async function tryWriteWithRpcs<T>(
  fn: (provider: ethers.providers.StaticJsonRpcProvider) => Promise<T>
): Promise<T> {
  const errors: string[] = [];
  
  // Try premium RPCs first (Alchemy, Tatum)
  for (const rpc of PREMIUM_RPCS) {
    try {
      const provider = new ethers.providers.StaticJsonRpcProvider(
        { url: rpc, timeout: 30000 },
        137
      );
      return await fn(provider);
    } catch (e: any) {
      errors.push(`${rpc.substring(0, 30)}...: ${e.message?.substring(0, 50)}`);
    }
  }

  // Fallback to public RPCs if premium fails
  for (const rpc of PUBLIC_RPCS) {
    try {
      const provider = new ethers.providers.StaticJsonRpcProvider(
        { url: rpc, timeout: 15000 },
        137
      );
      return await fn(provider);
    } catch (e: any) {
      errors.push(`${rpc}: ${e.message?.substring(0, 50)}`);
    }
  }
  
  throw new Error(`All write RPCs failed: ${errors.join('; ')}`);
}

export class RedemptionService {
  private privateKey: string;
  private recordsPath: string;

  constructor(privateKey: string, recordsPath?: string) {
    this.privateKey = privateKey;
    // Use provided path or default to project-relative path
    this.recordsPath = recordsPath || path.join(
      process.cwd(),
      'dashboard/data/bet-records.json'
    );
  }

  /**
   * Get current USDC.e balance
   */
  async getUSDCBalance(): Promise<number> {
    const wallet = new ethers.Wallet(this.privateKey);

    return await tryReadWithRpcs(async (provider) => {
      const usdc = new ethers.Contract(USDC_E, ERC20_ABI, provider);
      const balance = await usdc.balanceOf(wallet.address);
      return parseFloat(ethers.utils.formatUnits(balance, 6));
    });
  }

  /**
   * Load bet records from file
   */
  loadRecords(): BetRecord[] {
    try {
      if (fs.existsSync(this.recordsPath)) {
        return JSON.parse(fs.readFileSync(this.recordsPath, 'utf8'));
      }
    } catch (e) {
      console.error('Failed to load bet records:', e);
    }
    return [];
  }

  /**
   * Save bet records to file
   */
  saveRecords(records: BetRecord[]): void {
    try {
      fs.writeFileSync(this.recordsPath, JSON.stringify(records, null, 2));
    } catch (e) {
      console.error('Failed to save bet records:', e);
    }
  }

  /**
   * Check and redeem all pending positions
   */
  async redeemAllPending(): Promise<RedemptionResult> {
    const records = this.loadRecords();
    const unredeemed = records.filter((r) => !r.redeemed);

    const result: RedemptionResult = {
      totalRedeemed: 0,
      successfulRedemptions: 0,
      failedRedemptions: 0,
      newBalance: 0,
      details: [],
    };

    if (unredeemed.length === 0) {
      console.log('📭 No pending positions to redeem');
      result.newBalance = await this.getUSDCBalance();
      return result;
    }

    console.log(`\n🔄 Checking ${unredeemed.length} pending positions...`);

    for (const bet of unredeemed) {
      const redemptionDetail = {
        marketSlug: bet.marketSlug,
        amount: 0,
        success: false,
        error: undefined as string | undefined,
      };

      try {
        const redeemed = await this.attemptRedemption(bet);

        if (redeemed > 0) {
          bet.redeemed = true;
          redemptionDetail.amount = redeemed;
          redemptionDetail.success = true;
          result.totalRedeemed += redeemed;
          result.successfulRedemptions++;
          console.log(`  ✅ ${bet.marketSlug}: Redeemed $${redeemed.toFixed(2)}`);
        } else if (redeemed === 0) {
          // No tokens left (lost or already redeemed)
          bet.redeemed = true;
          console.log(`  📭 ${bet.marketSlug}: No tokens (lost or already redeemed)`);
        } else {
          // Market not resolved yet (redeemed = -1)
          bet.attemptCount = (bet.attemptCount || 0) + 1;
          console.log(`  ⏳ ${bet.marketSlug}: Not resolved yet`);
        }
      } catch (e: any) {
        bet.attemptCount = (bet.attemptCount || 0) + 1;
        redemptionDetail.error = e.message;
        result.failedRedemptions++;
        console.log(`  ❌ ${bet.marketSlug}: ${e.message?.substring(0, 60)}`);
      }

      result.details.push(redemptionDetail);
    }

    // Save updated records
    this.saveRecords(records);

    // Get final balance
    result.newBalance = await this.getUSDCBalance();

    return result;
  }

  /**
   * Attempt to redeem a single position
   * Returns: amount redeemed, 0 if no tokens, -1 if not resolved
   */
  private async attemptRedemption(bet: BetRecord): Promise<number> {
    const wallet = new ethers.Wallet(this.privateKey);
    
    // Step 1: Check token balance (read operation - use public RPCs)
    // Use STANDARD_CTF for regular markets (BTC 5-min, etc.)
    const balance = await tryReadWithRpcs(async (provider) => {
      const ctf = new ethers.Contract(STANDARD_CTF, CTF_ABI, provider);
      return ctf.balanceOf(wallet.address, bet.tokenId);
    });

    if (balance.eq(0)) {
      return 0; // No tokens
    }

    const balanceNum = parseFloat(ethers.utils.formatUnits(balance, 6));

    // Step 2: Check if market resolved (read operation - use public RPCs)
    const payoutDenom = await tryReadWithRpcs(async (provider) => {
      const ctf = new ethers.Contract(STANDARD_CTF, CTF_ABI, provider);
      return ctf.payoutDenominator(bet.conditionId);
    });

    if (payoutDenom.eq(0)) {
      return -1; // Not resolved yet
    }

    // Step 3: Execute redemption (write operation - use premium RPCs)
    // Use STANDARD_CTF.redeemPositions directly for regular markets
    await tryWriteWithRpcs(async (provider) => {
      const signerWallet = new ethers.Wallet(this.privateKey, provider);
      const ctf = new ethers.Contract(STANDARD_CTF, STANDARD_CTF_ABI, signerWallet);
      
      console.log(`  📤 Sending redemption tx via ${provider.connection.url.substring(0, 35)}...`);
      
      // Standard CTF redemption: redeemPositions(collateral, parentCollectionId, conditionId, indexSets)
      const tx = await ctf.redeemPositions(
        USDC_E,
        ethers.constants.HashZero, // parentCollectionId (root)
        bet.conditionId,
        [1, 2], // indexSets for binary market (both outcomes)
        {
          gasLimit: 200000,
          maxFeePerGas: ethers.utils.parseUnits('400', 'gwei'),
          maxPriorityFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
        }
      );

      console.log(`  ⏳ TX: ${tx.hash}`);
      await tx.wait(1);
      return tx;
    });

    return balanceNum;
  }

  /**
   * Add a new bet record
   */
  addBetRecord(bet: Omit<BetRecord, 'redeemed' | 'attemptCount'>): void {
    const records = this.loadRecords();
    records.push({
      ...bet,
      redeemed: false,
      attemptCount: 0,
    });
    this.saveRecords(records);
    console.log(`📝 Recorded bet: ${bet.marketSlug} (${bet.side})`);
  }
}
