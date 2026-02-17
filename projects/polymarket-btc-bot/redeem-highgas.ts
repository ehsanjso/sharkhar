import 'dotenv/config';
import { ethers } from 'ethers';

const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

const CTF_ABI = [
  'function balanceOf(address,uint256) view returns (uint256)',
  'function redeemPositions(address,bytes32,bytes32,uint256[]) external',
];

const CONDITION = '0xace65defef305ab09b411c0a6660815eedcf6b9df4065e274bf4f9267a5f93f1';
const TOKEN_ID = '35581263617342792049686426200413780838383520463854193560572725650386535775678';

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon.drpc.org', 137);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const ctf = new ethers.Contract(CTF, CTF_ABI, wallet);
  const usdcContract = new ethers.Contract(USDC_E, ['function balanceOf(address) view returns (uint256)'], provider);
  
  // Get current gas price
  const gasPrice = await provider.getGasPrice();
  console.log('Current gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
  
  const balance = await ctf.balanceOf(wallet.address, TOKEN_ID);
  console.log('Token balance:', ethers.utils.formatUnits(balance, 6), 'shares');
  
  if (balance.eq(0)) {
    const usdc = await usdcContract.balanceOf(wallet.address);
    console.log('Already redeemed! USDC.e:', ethers.utils.formatUnits(usdc, 6));
    return;
  }
  
  const before = await usdcContract.balanceOf(wallet.address);
  console.log('USDC.e before: $' + parseFloat(ethers.utils.formatUnits(before, 6)).toFixed(4));
  
  // Use 2x current gas price
  const maxFee = gasPrice.mul(2);
  const priorityFee = ethers.utils.parseUnits('100', 'gwei');
  
  console.log('Using maxFee:', ethers.utils.formatUnits(maxFee, 'gwei'), 'gwei');
  console.log('🚀 Sending redeem...');
  
  const tx = await ctf.redeemPositions(
    USDC_E,
    ethers.constants.HashZero,
    CONDITION,
    [1, 2],
    { 
      gasLimit: 300000,
      maxFeePerGas: maxFee,
      maxPriorityFeePerGas: priorityFee,
    }
  );
  console.log('📤 TX:', tx.hash);
  console.log('⏳ Waiting for confirmation...');
  
  const receipt = await tx.wait(1);
  console.log('✅ Confirmed! Block:', receipt.blockNumber);
  
  const after = await usdcContract.balanceOf(wallet.address);
  const redeemed = parseFloat(ethers.utils.formatUnits(after, 6)) - parseFloat(ethers.utils.formatUnits(before, 6));
  console.log('USDC.e after: $' + parseFloat(ethers.utils.formatUnits(after, 6)).toFixed(2));
  console.log('💰 Redeemed: +$' + redeemed.toFixed(2));
}

main().catch(e => console.error('❌ Error:', e.message?.substring(0, 200)));
