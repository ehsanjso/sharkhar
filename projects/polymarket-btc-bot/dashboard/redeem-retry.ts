import { ethers } from 'ethers';
import 'dotenv/config';

const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const CTF_ABI = ['function redeemPositions(address, bytes32, bytes32, uint256[]) external'];

const RPCS = [
  'https://polygon-rpc.com',
  'https://polygon-bor-rpc.publicnode.com', 
  'https://1rpc.io/matic',
];

async function tryWithRetry(conditionId: string, title: string) {
  for (const rpc of RPCS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`[${title}] Attempt ${attempt + 1} via ${rpc.split('/')[2]}...`);
        
        const provider = new ethers.providers.StaticJsonRpcProvider(rpc, 137);
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
        const ctf = new ethers.Contract(CTF, CTF_ABI, wallet);
        
        const tx = await ctf.redeemPositions(
          USDC_E,
          ethers.constants.HashZero,
          conditionId,
          [1, 2],
          { gasLimit: 200000 }
        );
        
        console.log(`[${title}] TX: ${tx.hash}`);
        const receipt = await tx.wait(1);
        console.log(`[${title}] ✅ Confirmed block ${receipt.blockNumber}`);
        return true;
        
      } catch (e: any) {
        console.log(`[${title}] ❌ ${e.code || 'ERROR'}`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }
  return false;
}

async function main() {
  console.log('Starting redemptions with retry...\n');
  
  await tryWithRetry('0xb9c0752a9e7900ac58f3b52767eb9fea92ffd4cf46c0ed613842d6bf20be2f66', '3:35-3:40 AM');
  await new Promise(r => setTimeout(r, 5000));
  await tryWithRetry('0x2aae4f2bfb329f23c4bf159e51d63f00dab628a049b0b016f529054efdb20a55', '8:40-8:45 AM');
  
  console.log('\nDone!');
}

main();
