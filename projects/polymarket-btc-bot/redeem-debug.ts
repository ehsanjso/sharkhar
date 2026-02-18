import 'dotenv/config';
import { ethers } from 'ethers';

const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

const CTF_ABI = [
  'function redeemPositions(address,bytes32,bytes32,uint256[]) external',
  'function balanceOf(address,uint256) view returns (uint256)',
];

const WIN_CONDITION = '0x17b44fa850f2d09a59a8340894b32011dcf16baec136211601cd2b9505db3b15';

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon.drpc.org', 137);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const ctf = new ethers.Contract(CTF, CTF_ABI, wallet);
  
  console.log('Wallet:', wallet.address);
  
  // Check gas price
  const gasPrice = await provider.getGasPrice();
  console.log('Gas Price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
  
  // Check nonce
  const nonce = await provider.getTransactionCount(wallet.address);
  console.log('Nonce:', nonce);
  
  // Try to estimate gas first
  try {
    const gasEstimate = await ctf.estimateGas.redeemPositions(
      USDC_E,
      ethers.constants.HashZero,
      WIN_CONDITION,
      [1, 2]
    );
    console.log('Gas estimate:', gasEstimate.toString());
  } catch (e: any) {
    console.log('Gas estimate failed:', e.reason || e.message?.substring(0, 200));
  }
  
  // Try to send
  console.log('\nSending TX...');
  try {
    const tx = await ctf.redeemPositions(
      USDC_E,
      ethers.constants.HashZero,
      WIN_CONDITION,
      [1, 2],
      { 
        gasLimit: 200000, 
        maxFeePerGas: gasPrice.mul(2),
        maxPriorityFeePerGas: gasPrice.div(2),
        nonce: nonce
      }
    );
    console.log('TX:', tx.hash);
    const receipt = await tx.wait(1);
    console.log('Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
  } catch (e: any) {
    console.log('Error:', e.reason || e.message?.substring(0, 300));
  }
}

main();
