import 'dotenv/config';
import { ethers } from 'ethers';

// Polymarket uses NegRiskCTFExchange for redemptions
const EXCHANGE = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

const EXCHANGE_ABI = [
  'function redeemPositions(bytes32 conditionId, uint256[] indexSets)',
];

const CTF_ABI = [
  'function balanceOf(address,uint256) view returns (uint256)',
  'function payoutDenominator(bytes32) view returns (uint256)',
];

const CONDITION = '0xace65defef305ab09b411c0a6660815eedcf6b9df4065e274bf4f9267a5f93f1';
const TOKEN_ID = '35581263617342792049686426200413780838383520463854193560572725650386535775678';

async function main() {
  // Try with publicnode which might be more stable
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon-bor-rpc.publicnode.com', 137);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const ctf = new ethers.Contract(CTF, CTF_ABI, provider);
  const usdcContract = new ethers.Contract(USDC_E, ['function balanceOf(address) view returns (uint256)'], provider);
  
  const balance = await ctf.balanceOf(wallet.address, TOKEN_ID);
  console.log('Token balance:', ethers.utils.formatUnits(balance, 6), 'shares');
  
  if (balance.eq(0)) {
    const usdc = await usdcContract.balanceOf(wallet.address);
    console.log('✅ Already redeemed! USDC.e:', ethers.utils.formatUnits(usdc, 6));
    return;
  }
  
  const payout = await ctf.payoutDenominator(CONDITION);
  console.log('Payout denominator:', payout.toString());
  
  if (payout.eq(0)) {
    console.log('❌ Market not resolved yet');
    return;
  }
  
  const before = await usdcContract.balanceOf(wallet.address);
  console.log('USDC.e before: $' + parseFloat(ethers.utils.formatUnits(before, 6)).toFixed(4));
  
  // Try regular CTF redeem with legacy gas pricing (type 0 tx)
  const ctfWrite = new ethers.Contract(CTF, [
    'function redeemPositions(address,bytes32,bytes32,uint256[]) external',
  ], wallet);
  
  const gasPrice = await provider.getGasPrice();
  console.log('Gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
  
  console.log('🚀 Sending redeem (legacy tx)...');
  const tx = await ctfWrite.redeemPositions(
    USDC_E,
    ethers.constants.HashZero,
    CONDITION,
    [1, 2],
    { 
      gasLimit: 350000,
      gasPrice: gasPrice.mul(2), // 2x current gas
    }
  );
  console.log('📤 TX:', tx.hash);
  console.log('⏳ Waiting...');
  
  const receipt = await tx.wait(1);
  console.log('✅ Confirmed! Block:', receipt.blockNumber, 'Status:', receipt.status);
  
  const after = await usdcContract.balanceOf(wallet.address);
  console.log('USDC.e after: $' + parseFloat(ethers.utils.formatUnits(after, 6)).toFixed(2));
  console.log('💰 Redeemed: +$' + (parseFloat(ethers.utils.formatUnits(after, 6)) - parseFloat(ethers.utils.formatUnits(before, 6))).toFixed(2));
}

main().catch(e => console.error('❌ Error:', e.message?.substring(0, 200)));
