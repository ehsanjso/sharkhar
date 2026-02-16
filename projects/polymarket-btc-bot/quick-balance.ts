import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const rpcs = [
    'https://polygon.drpc.org',
    'https://1rpc.io/matic',
    'https://polygon.meowrpc.com',
  ];
  
  const wallet = '0x923C9c79ADF737A878f6fFb4946D7da889d78E1d';
  const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
  const ABI = ['function balanceOf(address) view returns (uint256)'];
  
  for (const rpc of rpcs) {
    console.log(`\nTrying ${rpc}:`);
    try {
      const provider = new ethers.providers.StaticJsonRpcProvider({ url: rpc, timeout: 5000 }, 137);
      const usdc = new ethers.Contract(USDC_E, ABI, provider);
      const bal = await usdc.balanceOf(wallet);
      console.log(`  ✅ USDC.e: $${ethers.utils.formatUnits(bal, 6)}`);
      
      const matic = await provider.getBalance(wallet);
      console.log(`  ✅ MATIC: ${ethers.utils.formatEther(matic)}`);
      break;
    } catch (e: any) {
      console.log(`  ❌ ${e.message?.substring(0, 50)}`);
    }
  }
}
main().catch(console.error);
