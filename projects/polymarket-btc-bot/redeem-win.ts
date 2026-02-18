import 'dotenv/config';
import { ethers } from 'ethers';

const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

const CTF_ABI = [
  'function redeemPositions(address,bytes32,bytes32,uint256[]) external',
];

// Our winning position from 9:05-9:10 AM
const WIN_CONDITION = '0x17b44fa850f2d09a59a8340894b32011dcf16baec136211601cd2b9505db3b15';

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider('https://rpc.ankr.com/polygon', 137);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const ctf = new ethers.Contract(CTF, CTF_ABI, wallet);
  
  console.log('Wallet:', wallet.address);
  console.log('Redeeming winning position...\n');
  
  try {
    const tx = await ctf.redeemPositions(
      USDC_E,
      ethers.constants.HashZero,
      WIN_CONDITION,
      [1, 2],
      { gasLimit: 150000, maxFeePerGas: ethers.utils.parseUnits('1500', 'gwei'), maxPriorityFeePerGas: ethers.utils.parseUnits('100', 'gwei') }
    );
    console.log('TX:', tx.hash);
    const receipt = await tx.wait(1);
    console.log('Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
  } catch (e: any) {
    console.log('Error:', e.message?.substring(0, 100));
  }
}

main();
