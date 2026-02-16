import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const ALCHEMY_RPC = process.env.ALCHEMY_RPC!;
const wallet = '0x923C9c79ADF737A878f6fFb4946D7da889d78E1d';
const NEG_RISK_CTF = '0xC5d563A36AE78145C45a50134d48A1215220f80a';

// Known token IDs from dashboard state file
const potentialTokens = new Map<string, string>();

async function main() {
  // Load from multi-market state
  const fs = await import('fs');
  const statePath = './dashboard/data/multi-market-state.json';
  
  if (fs.existsSync(statePath)) {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    
    console.log('📊 Scanning dashboard state for pending bets...\n');
    
    for (const market of state.markets || []) {
      for (const strat of market.strategies || []) {
        for (const bet of strat.pendingBets || []) {
          if (bet.tokenId) {
            potentialTokens.set(bet.tokenId, `${strat.id || 'unknown'} - ${bet.side}`);
          }
        }
      }
    }
  }
  
  console.log(`Found ${potentialTokens.size} token IDs in pending bets\n`);
  
  const provider = new ethers.providers.StaticJsonRpcProvider(ALCHEMY_RPC, 137);
  const ABI = [
    'function balanceOf(address, uint256) view returns (uint256)',
    'function payoutDenominator(bytes32 conditionId) view returns (uint256)'
  ];
  const ctf = new ethers.Contract(NEG_RISK_CTF, ABI, provider);
  
  let totalValue = 0;
  const tokensToRedeem: { tokenId: string; conditionId: string; balance: number }[] = [];
  
  for (const [tokenId, label] of potentialTokens) {
    try {
      const bal = await ctf.balanceOf(wallet, tokenId);
      const value = parseFloat(ethers.utils.formatUnits(bal, 6));
      
      if (value > 0) {
        console.log(`  💰 ${label}: $${value.toFixed(2)} (token: ${tokenId.substring(0, 15)}...)`);
        totalValue += value;
        tokensToRedeem.push({ tokenId, conditionId: '', balance: value });
      }
    } catch (e: any) {
      // Token might not exist or wrong contract
    }
  }
  
  console.log(`\n💵 Total CTF tokens found: $${totalValue.toFixed(2)}`);
  
  // Also check USDC.e
  const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
  const usdc = new ethers.Contract(USDC_E, ['function balanceOf(address) view returns (uint256)'], provider);
  const usdcBal = await usdc.balanceOf(wallet);
  console.log(`💵 USDC.e balance: $${ethers.utils.formatUnits(usdcBal, 6)}`);
}

main().catch(console.error);
