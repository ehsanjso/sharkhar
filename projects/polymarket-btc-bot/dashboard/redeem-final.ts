import { ethers } from 'ethers';
import 'dotenv/config';

const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

const CTF_ABI = [
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external',
  'function balanceOf(address owner, uint256 id) view returns (uint256)',
];

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

async function main() {
  // Use multiple provider attempts with retries
  const provider = new ethers.providers.StaticJsonRpcProvider({
    url: 'https://polygon-rpc.com',
    timeout: 30000,
  }, 137);
  
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const ctf = new ethers.Contract(CTF_ADDRESS, CTF_ABI, wallet);
  const usdc = new ethers.Contract(USDC_E, ERC20_ABI, provider);
  
  console.log('Wallet:', wallet.address);
  
  // Get gas price
  const gasPrice = await provider.getGasPrice();
  console.log('Gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei');
  
  const nonce = await wallet.getTransactionCount();
  console.log('Nonce:', nonce);
  
  const balanceBefore = await usdc.balanceOf(wallet.address);
  console.log('USDC.e before:', ethers.utils.formatUnits(balanceBefore, 6));
  
  // Try just one redemption with explicit params
  const conditionId = '0x23ba9568dea52f9568e411c902fee0d4cca10bb37bda07c088d04a0f7590cc0c';
  const asset = '49673229089632523083831491653387110849913299375754188114523562942576544100052';
  
  console.log('\n🔄 Redeeming 7:35-7:40 AM position...');
  
  const balance = await ctf.balanceOf(wallet.address, asset);
  console.log('Token balance:', ethers.utils.formatUnits(balance, 6));
  
  if (balance.gt(0)) {
    const tx = await ctf.redeemPositions(
      USDC_E,
      ethers.constants.HashZero,
      conditionId,
      [1, 2],
      {
        gasLimit: 200000,
        gasPrice: gasPrice.mul(120).div(100), // 20% above current
        nonce: nonce,
      }
    );
    
    console.log('TX submitted:', tx.hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait(1);
    console.log('✅ Confirmed in block', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());
    
    const balanceAfter = await usdc.balanceOf(wallet.address);
    console.log('USDC.e after:', ethers.utils.formatUnits(balanceAfter, 6));
  }
}

main().catch(e => {
  console.error('Full error:', JSON.stringify(e, null, 2).slice(0, 500));
});
