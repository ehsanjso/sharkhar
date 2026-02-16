#!/usr/bin/env npx tsx
/**
 * Check current balances and attempt to redeem all winning positions
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config();

const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const NEG_RISK_CTF = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
const NEG_RISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296';

const RPCS = [
  'https://polygon.llamarpc.com',
  'https://polygon-bor-rpc.publicnode.com',
  'https://rpc.ankr.com/polygon',
  'https://1rpc.io/matic',
  'https://polygon.meowrpc.com',
  'https://polygon.drpc.org',
];

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];
const CTF_ABI = [
  'function balanceOf(address owner, uint256 id) view returns (uint256)',
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)'
];
const ADAPTER_ABI = [
  'function redeemPositions(bytes32 conditionId, uint256[] calldata amounts) external'
];

async function tryWithRpcs<T>(fn: (provider: ethers.providers.StaticJsonRpcProvider) => Promise<T>): Promise<T> {
  for (const rpc of RPCS) {
    try {
      const provider = new ethers.providers.StaticJsonRpcProvider({ url: rpc, timeout: 10000 }, 137);
      return await fn(provider);
    } catch (e: any) {
      console.log(`  ⚠️ ${rpc.substring(8, 35)}... failed: ${e.message?.substring(0, 50)}`);
    }
  }
  throw new Error('All RPCs failed');
}

async function main() {
  const privateKey = process.env.PRIVATE_KEY!;
  
  console.log('\n📊 POLYMARKET WALLET STATUS\n');
  console.log('='.repeat(50));
  
  // Get wallet address
  const wallet = new ethers.Wallet(privateKey);
  console.log(`Wallet: ${wallet.address}`);
  
  // Check USDC.e balance
  console.log('\n💰 USDC.e Balance:');
  try {
    const balance = await tryWithRpcs(async (provider) => {
      const usdc = new ethers.Contract(USDC_E, ERC20_ABI, provider);
      return await usdc.balanceOf(wallet.address);
    });
    console.log(`   $${ethers.utils.formatUnits(balance, 6)} USDC.e`);
  } catch (e: any) {
    console.log(`   ❌ Could not fetch: ${e.message}`);
  }
  
  // Check MATIC balance
  console.log('\n⛽ MATIC Balance:');
  try {
    const balance = await tryWithRpcs(async (provider) => {
      return await provider.getBalance(wallet.address);
    });
    console.log(`   ${ethers.utils.formatEther(balance)} MATIC`);
  } catch (e: any) {
    console.log(`   ❌ Could not fetch: ${e.message}`);
  }
  
  // Load bet records
  console.log('\n📋 Pending Redemptions:');
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const recordsPath = path.join(__dirname, 'dashboard/data/bet-records.json');
  
  let records: any[] = [];
  try {
    records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
    const unredeemed = records.filter(r => !r.redeemed);
    console.log(`   ${unredeemed.length} positions pending redemption`);
    
    for (const bet of unredeemed) {
      console.log(`\n   🎯 ${bet.marketSlug} (${bet.side})`);
      console.log(`      Condition: ${bet.conditionId.substring(0, 20)}...`);
      console.log(`      Attempts: ${bet.attemptCount || 0}`);
      
      // Try to check balance and redeem
      try {
        const result = await tryWithRpcs(async (provider) => {
          const w = new ethers.Wallet(privateKey, provider);
          const ctf = new ethers.Contract(NEG_RISK_CTF, CTF_ABI, w);
          
          const balance = await ctf.balanceOf(w.address, bet.tokenId);
          const balanceNum = parseFloat(ethers.utils.formatUnits(balance, 6));
          
          if (balance.gt(0)) {
            console.log(`      💰 Token balance: $${balanceNum.toFixed(2)}`);
            
            // Check if resolved
            const payoutDenom = await ctf.payoutDenominator(bet.conditionId);
            
            if (payoutDenom.gt(0)) {
              console.log(`      ✅ Market resolved! Attempting redemption...`);
              
              const adapter = new ethers.Contract(NEG_RISK_ADAPTER, ADAPTER_ABI, w);
              const tx = await adapter.redeemPositions(
                bet.conditionId,
                [balance, 0],
                {
                  gasLimit: 500000,
                  maxFeePerGas: ethers.utils.parseUnits('100', 'gwei'),
                  maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei')
                }
              );
              
              console.log(`      📝 TX: ${tx.hash}`);
              await tx.wait(1);
              console.log(`      ✅ REDEEMED $${balanceNum.toFixed(2)}!`);
              
              // Mark as redeemed
              bet.redeemed = true;
              return { redeemed: balanceNum };
            } else {
              console.log(`      ⏳ Market not resolved yet`);
              return { redeemed: 0 };
            }
          } else {
            console.log(`      📭 No tokens (already redeemed or lost)`);
            return { redeemed: 0 };
          }
        });
        
      } catch (e: any) {
        console.log(`      ❌ Error: ${e.message?.substring(0, 60)}`);
      }
    }
    
    // Save updated records
    fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2));
    
  } catch (e: any) {
    console.log(`   ❌ Could not load records: ${e.message}`);
  }
  
  // Final balance check
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL BALANCE CHECK:');
  try {
    const balance = await tryWithRpcs(async (provider) => {
      const usdc = new ethers.Contract(USDC_E, ERC20_ABI, provider);
      return await usdc.balanceOf(wallet.address);
    });
    console.log(`   💵 $${ethers.utils.formatUnits(balance, 6)} USDC.e available`);
  } catch (e: any) {
    console.log(`   ❌ Could not fetch final balance`);
  }
  
  console.log('\n');
}

main().catch(console.error);
