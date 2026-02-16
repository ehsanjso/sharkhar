import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const ALCHEMY_RPC = process.env.ALCHEMY_RPC!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;

const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

const CTF_ABI = [
  'function balanceOf(address, uint256) view returns (uint256)',
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)',
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external'
];

const tokenId = '63631808186054856475182296880724840304334582067146217227800203876735418792089';
const conditionId = '0x99602c170d19db5a543c8f6088a87c7d9d4d7a9a775438920034837f49c4064e';

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider(ALCHEMY_RPC, 137);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const ctf = new ethers.Contract(CTF, CTF_ABI, wallet);
  
  console.log(`Wallet: ${wallet.address}`);
  
  // Check balance
  const bal = await ctf.balanceOf(wallet.address, tokenId);
  console.log(`Token balance: $${ethers.utils.formatUnits(bal, 6)}`);
  
  if (bal.eq(0)) {
    console.log('No balance to redeem');
    return;
  }
  
  // Check if resolved
  const payoutDenom = await ctf.payoutDenominator(conditionId);
  console.log(`Payout denominator: ${payoutDenom.toString()}`);
  
  if (payoutDenom.eq(0)) {
    console.log('Market not resolved yet - cannot redeem');
    return;
  }
  
  console.log('\n🔄 Attempting redemption...');
  
  // For binary markets, indexSets are [1, 2] for outcome 0 and 1
  // We need to figure out which outcome we have
  try {
    const tx = await ctf.redeemPositions(
      USDC_E,
      '0x0000000000000000000000000000000000000000000000000000000000000000', // parentCollectionId (root)
      conditionId,
      [1, 2], // Both outcomes
      {
        gasLimit: 500000,
        maxFeePerGas: ethers.utils.parseUnits('80', 'gwei'),
        maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei')
      }
    );
    
    console.log(`TX submitted: ${tx.hash}`);
    const receipt = await tx.wait(1);
    console.log(`✅ Redeemed! Gas used: ${receipt.gasUsed.toString()}`);
    
    // Check new USDC balance
    const usdc = new ethers.Contract(USDC_E, ['function balanceOf(address) view returns (uint256)'], provider);
    const newBal = await usdc.balanceOf(wallet.address);
    console.log(`💵 New USDC.e balance: $${ethers.utils.formatUnits(newBal, 6)}`);
    
  } catch (e: any) {
    console.log(`❌ Redemption failed: ${e.message?.substring(0, 100)}`);
  }
}

main().catch(console.error);
