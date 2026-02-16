/**
 * Polygon RPC Module
 * Centralized RPC management with fallback support
 */

import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import * as ethers from 'ethers';

// Ordered by reliability (best first)
// Note: Add your Alchemy/QuickNode keys to .env for best reliability
const POLYGON_RPCS = [
  // Premium RPCs (add API keys to .env)
  process.env.ALCHEMY_RPC || '',           // Best: Alchemy
  process.env.QUICKNODE_RPC || '',          // QuickNode
  
  // Public RPCs - expanded list with more reliable options
  'https://polygon.llamarpc.com',           // LlamaNodes - good reliability
  'https://polygon-bor-rpc.publicnode.com', // PublicNode
  'https://rpc.ankr.com/polygon',           // Ankr
  'https://1rpc.io/matic',                  // 1RPC - privacy focused
  'https://polygon.meowrpc.com',            // MeowRPC - low latency
  'https://polygon.gateway.tenderly.co',    // Tenderly
  'https://api.zan.top/node/v1/polygon/mainnet/public', // ZAN
  'https://polygon-mainnet.public.blastapi.io',
  'https://polygon.blockpi.network/v1/rpc/public',
  'https://polygon.drpc.org',
  'https://rpc-mainnet.matic.quiknode.pro', // QuickNode public
  'https://polygon-rpc.com',                // Official - often congested (last resort)
].filter(rpc => rpc.length > 0);

// Track RPC health
const rpcHealth: Record<string, { failures: number; lastSuccess: number; lastFailure: number }> = {};

// Initialize health tracking
POLYGON_RPCS.forEach(rpc => {
  rpcHealth[rpc] = { failures: 0, lastSuccess: Date.now(), lastFailure: 0 };
});

/**
 * Get the best available RPC based on recent health
 */
function getBestRpc(): string {
  // Sort by health score (fewer failures, more recent success)
  const sorted = [...POLYGON_RPCS].sort((a, b) => {
    const healthA = rpcHealth[a];
    const healthB = rpcHealth[b];
    
    // Prioritize RPCs with fewer failures
    if (healthA.failures !== healthB.failures) {
      return healthA.failures - healthB.failures;
    }
    
    // Then by most recent success
    return healthB.lastSuccess - healthA.lastSuccess;
  });
  
  return sorted[0];
}

/**
 * Mark an RPC as failed
 */
export function markRpcFailed(rpc: string): void {
  if (rpcHealth[rpc]) {
    rpcHealth[rpc].failures++;
    rpcHealth[rpc].lastFailure = Date.now();
    console.log(`   ⚠️ RPC failed (${rpcHealth[rpc].failures}x): ${rpc.substring(0, 40)}...`);
  }
}

/**
 * Mark an RPC as successful
 */
export function markRpcSuccess(rpc: string): void {
  if (rpcHealth[rpc]) {
    rpcHealth[rpc].failures = Math.max(0, rpcHealth[rpc].failures - 1); // Slowly recover
    rpcHealth[rpc].lastSuccess = Date.now();
  }
}

/**
 * Reset failure count for an RPC (call after successful recovery)
 */
export function resetRpcHealth(rpc: string): void {
  if (rpcHealth[rpc]) {
    rpcHealth[rpc].failures = 0;
    rpcHealth[rpc].lastSuccess = Date.now();
  }
}

/**
 * Get current RPC health stats
 */
export function getRpcHealth(): Record<string, { failures: number; lastSuccess: number }> {
  return { ...rpcHealth };
}

/**
 * Create a provider with automatic fallback
 */
export async function createProvider(): Promise<ethers.providers.StaticJsonRpcProvider> {
  const rpc = getBestRpc();
  const provider = new ethers.providers.StaticJsonRpcProvider(rpc, 137);
  
  try {
    // Quick health check
    await provider.getBlockNumber();
    markRpcSuccess(rpc);
    return provider;
  } catch (error) {
    markRpcFailed(rpc);
    // Try next best RPC
    return createProvider();
  }
}

/**
 * Create a provider with retry logic for a specific call
 * Uses exponential backoff and tries more RPCs
 */
export async function withRetry<T>(
  fn: (provider: ethers.providers.StaticJsonRpcProvider) => Promise<T>,
  maxRetries = 5
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Try more RPCs on each attempt (3, then 5, then all)
    const rpcsToTry = [...POLYGON_RPCS].sort((a, b) => {
      return rpcHealth[a].failures - rpcHealth[b].failures;
    }).slice(0, Math.min(3 + attempt * 2, POLYGON_RPCS.length));
    
    for (const rpc of rpcsToTry) {
      try {
        const provider = new ethers.providers.StaticJsonRpcProvider({
          url: rpc,
          timeout: 15000 // 15 second timeout per RPC
        }, 137);
        const result = await fn(provider);
        markRpcSuccess(rpc);
        resetRpcHealth(rpc); // Full reset on success
        return result;
      } catch (error: any) {
        lastError = error;
        markRpcFailed(rpc);
        
        // Don't retry if it's a revert (not an RPC issue)
        if (error.message?.includes('revert') && !error.message?.includes('network')) {
          throw error;
        }
      }
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    if (attempt < maxRetries - 1) {
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 16000);
      console.log(`   ⏳ RPC backoff: ${backoffMs/1000}s before retry ${attempt + 2}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  
  throw lastError || new Error('All RPCs failed');
}

/**
 * Get a simple provider (no health check, for quick operations)
 */
export function getSimpleProvider(): ethers.providers.StaticJsonRpcProvider {
  const rpc = getBestRpc();
  return new ethers.providers.StaticJsonRpcProvider(rpc, 137);
}

/**
 * Create a signer with the best RPC
 */
export function createSigner(privateKey: string): ethers.Wallet {
  const provider = getSimpleProvider();
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Execute a transaction with retry on different RPCs
 */
export async function sendTransactionWithRetry(
  privateKey: string,
  txFn: (wallet: ethers.Wallet) => Promise<ethers.ContractTransaction>,
  maxRetries = 3
): Promise<ethers.ContractTransaction> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rpcsToTry = [...POLYGON_RPCS].sort((a, b) => {
      return rpcHealth[a].failures - rpcHealth[b].failures;
    }).slice(0, 3);
    
    for (const rpc of rpcsToTry) {
      try {
        const provider = new ethers.providers.StaticJsonRpcProvider(rpc, 137);
        const wallet = new ethers.Wallet(privateKey, provider);
        
        const tx = await txFn(wallet);
        markRpcSuccess(rpc);
        
        // Wait for confirmation
        const receipt = await tx.wait(1);
        if (receipt.status === 1) {
          resetRpcHealth(rpc);
          return tx;
        }
      } catch (error: any) {
        lastError = error;
        markRpcFailed(rpc);
        console.log(`   ❌ TX failed on ${rpc.substring(0, 30)}...: ${error.message?.substring(0, 50)}`);
      }
    }
    
    if (attempt < maxRetries - 1) {
      console.log(`   🔄 Retrying transaction (attempt ${attempt + 2}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }
  
  throw lastError || new Error('Transaction failed on all RPCs');
}

// Export the RPC list for reference
export { POLYGON_RPCS };

console.log(`🔗 RPC module initialized with ${POLYGON_RPCS.length} endpoints`);
console.log(`   Primary: ${POLYGON_RPCS[0].substring(0, 50)}...`);
