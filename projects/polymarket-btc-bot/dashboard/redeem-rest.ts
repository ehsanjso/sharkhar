import { ethers } from 'ethers';
import 'dotenv/config';

const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

const CTF_ABI = [
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external',
  'function balanceOf(address owner, uint256 id) view returns (uint256)',
];

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon-rpc.com', 137);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const ctf = new ethers.Contract(CTF_ADDRESS, CTF_ABI, wallet);
  
  const gasPrice = await provider.getGasPrice();
  let nonce = await wallet.getTransactionCount();
  
  const positions = [
    { title: '3:35-3:40 AM ($17.72)', conditionId: '0xb9c0752a9e7900ac58f3b52767eb9fea92ffd4cf46c0ed613842d6bf20be2f66', asset: '20142863418699769485418301598533558739045975936691252085596112945691690402843' },
    { title: '8:40-8:45 AM ($11)', conditionId: '0x2aae4f2bfb329f23c4bf159e51d63f00dab628a049b0b016f529054efdb20a55', asset: '61389490052363105952980171003554758500470085139713480254186817857196609277679' },
  ];
  
  for (const pos of positions) {
    console.log(`\n🔄 ${pos.title}...`);
    
    const balance = await ctf.balanceOf(wallet.address, pos.asset);
    if (balance.eq(0)) {
      console.log('   ⏭️ Already redeemed');
      continue;
    }
    
    console.log('   Balance:', ethers.utils.formatUnits(balance, 6));
    
    const tx = await ctf.redeemPositions(
      USDC_E,
      ethers.constants.HashZero,
      pos.conditionId,
      [1, 2],
      { gasLimit: 200000, gasPrice: gasPrice.mul(120).div(100), nonce: nonce++ }
    );
    
    console.log('   TX:', tx.hash);
    const receipt = await tx.wait(1);
    console.log('   ✅ Block:', receipt.blockNumber, 'Gas:', receipt.gasUsed.toString());
  }
  
  console.log('\n✅ All done!');
}

main().catch(e => console.error('Error:', e.reason || e.message?.slice(0, 100)));
