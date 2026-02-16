import { ethers } from 'ethers';
import 'dotenv/config';

const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

const CTF_ABI = [
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external',
  'function balanceOf(address owner, uint256 id) view returns (uint256)',
  'function payoutNumerators(bytes32 conditionId, uint256 index) view returns (uint256)',
  'function payoutDenominator(bytes32 conditionId) view returns (uint256)',
];

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon-bor-rpc.publicnode.com', 137);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const ctf = new ethers.Contract(CTF_ADDRESS, CTF_ABI, wallet);
  
  // Test with just one position first
  const testCondition = '0x23ba9568dea52f9568e411c902fee0d4cca10bb37bda07c088d04a0f7590cc0c';
  const testAsset = '49673229089632523083831491653387110849913299375754188114523562942576544100052';
  
  console.log('Wallet:', wallet.address);
  console.log('Testing condition:', testCondition);
  
  // Check if market is resolved
  try {
    const denom = await ctf.payoutDenominator(testCondition);
    console.log('Payout denominator:', denom.toString());
    
    if (denom.eq(0)) {
      console.log('Market not resolved yet!');
      return;
    }
    
    const num0 = await ctf.payoutNumerators(testCondition, 0);
    const num1 = await ctf.payoutNumerators(testCondition, 1);
    console.log('Payout numerators: [', num0.toString(), ',', num1.toString(), ']');
    
  } catch (e: any) {
    console.log('Error checking payout:', e.message?.slice(0, 100));
  }
  
  // Check token balance
  const balance = await ctf.balanceOf(wallet.address, testAsset);
  console.log('Token balance:', ethers.utils.formatUnits(balance, 6));
  
  if (balance.eq(0)) {
    console.log('No tokens to redeem');
    return;
  }
  
  // Estimate gas first
  try {
    const gasEstimate = await ctf.estimateGas.redeemPositions(
      USDC_E,
      '0x0000000000000000000000000000000000000000000000000000000000000000',
      testCondition,
      [1, 2]
    );
    console.log('Gas estimate:', gasEstimate.toString());
  } catch (e: any) {
    console.log('Gas estimation failed:', e.reason || e.message?.slice(0, 200));
    return;
  }
  
  // Try to redeem
  console.log('\nSending redeem transaction...');
  const tx = await ctf.redeemPositions(
    USDC_E,
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    testCondition,
    [1, 2],
    {
      gasLimit: 500000,
    }
  );
  
  console.log('TX hash:', tx.hash);
  console.log('Waiting for confirmation...');
  
  const receipt = await tx.wait(1);
  console.log('✅ Confirmed! Block:', receipt.blockNumber, 'Gas:', receipt.gasUsed.toString());
}

main().catch(e => {
  console.error('Error:', e.reason || e.message);
});
