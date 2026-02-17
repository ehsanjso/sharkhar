import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  redeemedAt?: number;
  attemptCount?: number;
  lastAttempt?: number;
  lastError?: string;
  note?: string;
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

// Simple mutex for file operations
class FileMutex {
  private locked = false;
  private queue: (() => void)[] = [];

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    } else {
      this.locked = false;
    }
  }
}

const fileMutex = new FileMutex();

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

/**
 * Validate that a private key is valid and can create a wallet
 */
function validatePrivateKey(privateKey: string): ethers.Wallet {
  if (!privateKey || typeof privateKey !== 'string') {
    throw new Error('Private key is required and must be a string');
  }
  
  // Normalize the key (add 0x prefix if missing)
  const normalizedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  
  if (normalizedKey.length !== 66) {
    throw new Error('Private key must be 64 hex characters (or 66 with 0x prefix)');
  }
  
  try {
    const wallet = new ethers.Wallet(normalizedKey);
    return wallet;
  } catch (e: any) {
    throw new Error(`Invalid private key: ${e.message}`);
  }
}

/**
 * Validate token ID is a valid BigNumber-compatible string
 */
function validateTokenId(tokenId: string): ethers.BigNumber {
  if (!tokenId || typeof tokenId !== 'string') {
    throw new Error('Token ID is required and must be a string');
  }
  
  try {
    return ethers.BigNumber.from(tokenId);
  } catch (e: any) {
    throw new Error(`Invalid token ID "${tokenId}": ${e.message}`);
  }
}

/**
 * Validate condition ID is a valid bytes32 hex string
 */
function validateConditionId(conditionId: string): string {
  if (!conditionId || typeof conditionId !== 'string') {
    throw new Error('Condition ID is required and must be a string');
  }
  
  const normalized = conditionId.startsWith('0x') ? conditionId : `0x${conditionId}`;
  
  if (normalized.length !== 66) {
    throw new Error(`Condition ID must be 32 bytes (64 hex chars), got ${conditionId}`);
  }
  
  return normalized;
}

export class RedemptionService {
  private privateKey: string;
  private wallet: ethers.Wallet;
  private recordsPath: string;
  private processing = false;

  constructor(privateKey?: string, recordsPath?: string) {
    // Load from env if not provided
    const key = privateKey || process.env.PRIVATE_KEY;
    
    if (!key) {
      throw new Error(
        'RedemptionService requires a private key. ' +
        'Pass it to constructor or set PRIVATE_KEY environment variable.'
      );
    }
    
    // Validate and store the key
    this.wallet = validatePrivateKey(key);
    this.privateKey = key;
    
    // Use provided path or default to project-relative path
    // Use __dirname for consistent path resolution
    this.recordsPath = recordsPath || path.resolve(
      __dirname,
      '../dashboard/data/bet-records.json'
    );
    
    console.log(`📁 Redemption records path: ${this.recordsPath}`);
    console.log(`🔑 Wallet address: ${this.wallet.address}`);
  }

  /**
   * Get current USDC.e balance
   */
  async getUSDCBalance(): Promise<number> {
    return await tryReadWithRpcs(async (provider) => {
      const usdc = new ethers.Contract(USDC_E, ERC20_ABI, provider);
      const balance = await usdc.balanceOf(this.wallet.address);
      return parseFloat(ethers.utils.formatUnits(balance, 6));
    });
  }

  /**
   * Load bet records from file (with mutex)
   */
  async loadRecords(): Promise<BetRecord[]> {
    await fileMutex.acquire();
    try {
      return this.loadRecordsSync();
    } finally {
      fileMutex.release();
    }
  }

  /**
   * Synchronous internal load (caller must hold mutex)
   */
  private loadRecordsSync(): BetRecord[] {
    try {
      if (fs.existsSync(this.recordsPath)) {
        const data = fs.readFileSync(this.recordsPath, 'utf8');
        const parsed = JSON.parse(data);
        
        if (!Array.isArray(parsed)) {
          console.error('Bet records file is not an array, returning empty');
          return [];
        }
        
        return parsed;
      }
    } catch (e: any) {
      console.error('Failed to load bet records:', e.message);
    }
    return [];
  }

  /**
   * Save bet records to file (with mutex)
   */
  async saveRecords(records: BetRecord[]): Promise<void> {
    await fileMutex.acquire();
    try {
      this.saveRecordsSync(records);
    } finally {
      fileMutex.release();
    }
  }

  /**
   * Synchronous internal save (caller must hold mutex)
   */
  private saveRecordsSync(records: BetRecord[]): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.recordsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write atomically (write to temp, then rename)
      const tempPath = `${this.recordsPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(records, null, 2));
      fs.renameSync(tempPath, this.recordsPath);
    } catch (e: any) {
      console.error('Failed to save bet records:', e.message);
      throw e;
    }
  }

  /**
   * Check and redeem all pending positions
   * Uses mutex to prevent concurrent runs
   */
  async redeemAllPending(): Promise<RedemptionResult> {
    // Prevent concurrent redemption runs
    if (this.processing) {
      console.log('⏳ Redemption already in progress, skipping...');
      return {
        totalRedeemed: 0,
        successfulRedemptions: 0,
        failedRedemptions: 0,
        newBalance: await this.getUSDCBalance(),
        details: [],
      };
    }

    this.processing = true;
    
    try {
      return await this.doRedeemAllPending();
    } finally {
      this.processing = false;
    }
  }

  private async doRedeemAllPending(): Promise<RedemptionResult> {
    // Acquire mutex for entire operation
    await fileMutex.acquire();
    
    let records: BetRecord[];
    try {
      records = this.loadRecordsSync();
    } catch (e) {
      fileMutex.release();
      throw e;
    }
    
    const unredeemed = records.filter((r) => !r.redeemed);

    const result: RedemptionResult = {
      totalRedeemed: 0,
      successfulRedemptions: 0,
      failedRedemptions: 0,
      newBalance: 0,
      details: [],
    };

    if (unredeemed.length === 0) {
      fileMutex.release();
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
          bet.redeemedAt = Date.now();
          redemptionDetail.amount = redeemed;
          redemptionDetail.success = true;
          result.totalRedeemed += redeemed;
          result.successfulRedemptions++;
          console.log(`  ✅ ${bet.marketSlug}: Redeemed $${redeemed.toFixed(2)}`);
        } else if (redeemed === 0) {
          // No tokens left (lost or already redeemed)
          bet.redeemed = true;
          bet.redeemedAt = Date.now();
          bet.note = 'No tokens (lost or already redeemed)';
          console.log(`  📭 ${bet.marketSlug}: No tokens (lost or already redeemed)`);
        } else {
          // Market not resolved yet (redeemed = -1)
          bet.attemptCount = (bet.attemptCount || 0) + 1;
          bet.lastAttempt = Date.now();
          console.log(`  ⏳ ${bet.marketSlug}: Not resolved yet`);
        }
      } catch (e: any) {
        bet.attemptCount = (bet.attemptCount || 0) + 1;
        bet.lastAttempt = Date.now();
        bet.lastError = e.message?.substring(0, 100);
        redemptionDetail.error = e.message;
        result.failedRedemptions++;
        console.log(`  ❌ ${bet.marketSlug}: ${e.message?.substring(0, 60)}`);
      }

      result.details.push(redemptionDetail);
    }

    // Save updated records (still holding mutex)
    try {
      this.saveRecordsSync(records);
    } finally {
      fileMutex.release();
    }

    // Get final balance
    result.newBalance = await this.getUSDCBalance();

    return result;
  }

  /**
   * Attempt to redeem a single position
   * Returns: amount redeemed, 0 if no tokens, -1 if not resolved
   */
  private async attemptRedemption(bet: BetRecord): Promise<number> {
    // Validate inputs before making any RPC calls
    let tokenIdBN: ethers.BigNumber;
    let conditionIdHex: string;
    
    try {
      tokenIdBN = validateTokenId(bet.tokenId);
      conditionIdHex = validateConditionId(bet.conditionId);
    } catch (e: any) {
      throw new Error(`Invalid bet data: ${e.message}`);
    }
    
    // Step 1: Check token balance (read operation - use public RPCs)
    const balance = await tryReadWithRpcs(async (provider) => {
      const ctf = new ethers.Contract(STANDARD_CTF, CTF_ABI, provider);
      return ctf.balanceOf(this.wallet.address, tokenIdBN);
    });

    if (balance.eq(0)) {
      return 0; // No tokens
    }

    const balanceNum = parseFloat(ethers.utils.formatUnits(balance, 6));

    // Step 2: Check if market resolved (read operation - use public RPCs)
    const payoutDenom = await tryReadWithRpcs(async (provider) => {
      const ctf = new ethers.Contract(STANDARD_CTF, CTF_ABI, provider);
      return ctf.payoutDenominator(conditionIdHex);
    });

    if (payoutDenom.eq(0)) {
      return -1; // Not resolved yet
    }

    // Step 3: Execute redemption (write operation - use premium RPCs)
    await tryWriteWithRpcs(async (provider) => {
      const signerWallet = new ethers.Wallet(this.privateKey, provider);
      const ctf = new ethers.Contract(STANDARD_CTF, STANDARD_CTF_ABI, signerWallet);
      
      console.log(`  📤 Sending redemption tx via ${provider.connection.url.substring(0, 35)}...`);
      
      // Standard CTF redemption: redeemPositions(collateral, parentCollectionId, conditionId, indexSets)
      const tx = await ctf.redeemPositions(
        USDC_E,
        ethers.constants.HashZero, // parentCollectionId (root)
        conditionIdHex,
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
  async addBetRecord(bet: Omit<BetRecord, 'redeemed' | 'attemptCount'>): Promise<void> {
    // Validate bet data
    try {
      validateTokenId(bet.tokenId);
      validateConditionId(bet.conditionId);
    } catch (e: any) {
      console.error(`Invalid bet record, not saving: ${e.message}`);
      return;
    }
    
    await fileMutex.acquire();
    try {
      const records = this.loadRecordsSync();
      
      // Check for duplicate
      const exists = records.some(
        r => r.conditionId === bet.conditionId && r.tokenId === bet.tokenId
      );
      
      if (exists) {
        console.log(`📝 Bet already recorded: ${bet.marketSlug}`);
        return;
      }
      
      records.push({
        ...bet,
        redeemed: false,
        attemptCount: 0,
      });
      
      this.saveRecordsSync(records);
      console.log(`📝 Recorded bet: ${bet.marketSlug} (${bet.side})`);
    } finally {
      fileMutex.release();
    }
  }

  /**
   * Mark a bet as redeemed (for manual cleanup)
   */
  async markAsRedeemed(marketSlug: string, note?: string): Promise<boolean> {
    await fileMutex.acquire();
    try {
      const records = this.loadRecordsSync();
      const bet = records.find(r => r.marketSlug === marketSlug && !r.redeemed);
      
      if (bet) {
        bet.redeemed = true;
        bet.redeemedAt = Date.now();
        bet.note = note || 'Manually marked as redeemed';
        this.saveRecordsSync(records);
        console.log(`✅ Marked ${marketSlug} as redeemed`);
        return true;
      }
      
      return false;
    } finally {
      fileMutex.release();
    }
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string {
    return this.wallet.address;
  }
}
