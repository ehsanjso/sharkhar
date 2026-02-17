import 'dotenv/config';
import { ethers } from 'ethers';

const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

const CTF_ABI = [
  'function balanceOf(address,uint256) view returns (uint256)',
  'function payoutDenominator(bytes32) view returns (uint256)',
  'function redeemPositions(address,bytes32,bytes32,uint256[]) external',
];

const CONDITION = '0xace65defef305ab09b411c0a6660815eedcf6b9df4065e274bf4f9267a5f93f1';
const TOKEN_ID = '35581263617342792049686426200413780838383520463854193560572725650386535775678';

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon-rpc.com', 137);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const ctf = new ethers.Contract(CTF, CTF_ABI, wallet);
  
  const usdcContract = new ethers.Contract(USDC_E, ['function balanceOf(address) view returns (uint256)'], provider);
  
  console.log('Wallet:', wallet.address);
  
  // Check balance
  const balance = await ctf.balanceOf(wallet.address, TOKEN_ID);
  console.log('Token balance:', ethers.utils.formatUnits(balance, 6));
  
  if (balance.eq(0)) {
    console.log('Nothing to redeem!');
    return;
  }
  
  const before = await usdcContract.balanceOf(wallet.address);
  console.log('USDC.e before:', ethers.utils.formatUnits(before, 6));
  
  // Get current nonce
  const nonce = await wallet.getTransactionCount('pending');
  console.log('Nonce:', nonce);
  
  // Higher gas for faster confirmation
  const tx = await ctf.redeemPositions(
    USDC_E,
    ethers.constants.HashZero,
    CONDITION,
    [1, 2],
    { 
      gasLimit: 300000, 
      maxFeePerGas: ethers.utils.parseUnits('200', 'gwei'),
      maxPriorityFeePerGas: ethers.utils.parseUnits('60', 'gwei'),
      nonce: nonce
    }
  );
  console.log('TX:', tx.hash);
  
  const receipt = await tx.wait(1);
  console.log('✅ Block:', receipt.blockNumber);
  
  const after = await usdcContract.balanceOf(wallet.address);
  console.log('USDC.e after:', ethers.utils.formatUnits(after, 6));
  console.log('💰 Redeemed: $' + (parseFloat(ethers.utils.formatUnits(after, 6)) - parseFloat(ethers.utils.formatUnits(before, 6))).toFixed(2));
}

main().catch(e => console.error('Error:', e.message));
