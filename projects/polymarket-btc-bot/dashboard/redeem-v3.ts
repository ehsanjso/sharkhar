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
  // Try different RPCs
  const rpcs = [
    'https://polygon.llamarpc.com',
    'https://polygon-mainnet.public.blastapi.io',
    'https://polygon.drpc.org',
  ];
  
  let provider: ethers.providers.StaticJsonRpcProvider | null = null;
  
  for (const rpc of rpcs) {
    try {
      const p = new ethers.providers.StaticJsonRpcProvider(rpc, 137);
      await p.getBlockNumber();
      console.log('Using RPC:', rpc);
      provider = p;
      break;
    } catch (e) {
      console.log('RPC failed:', rpc);
    }
  }
  
  if (!provider) {
    console.log('All RPCs failed!');
    return;
  }
  
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const ctf = new ethers.Contract(CTF_ADDRESS, CTF_ABI, wallet);
  const usdc = new ethers.Contract(USDC_E, ERC20_ABI, provider);
  
  console.log('Wallet:', wallet.address);
  
  const balanceBefore = await usdc.balanceOf(wallet.address);
  console.log('USDC.e before:', ethers.utils.formatUnits(balanceBefore, 6));
  
  // Winning positions
  const positions = [
    { title: '7:35-7:40 AM', conditionId: '0x23ba9568dea52f9568e411c902fee0d4cca10bb37bda07c088d04a0f7590cc0c', asset: '49673229089632523083831491653387110849913299375754188114523562942576544100052' },
    { title: '3:35-3:40 AM', conditionId: '0xb9c0752a9e7900ac58f3b52767eb9fea92ffd4cf46c0ed613842d6bf20be2f66', asset: '20142863418699769485418301598533558739045975936691252085596112945691690402843' },
    { title: '8:40-8:45 AM', conditionId: '0x2aae4f2bfb329f23c4bf159e51d63f00dab628a049b0b016f529054efdb20a55', asset: '61389490052363105952980171003554758500470085139713480254186817857196609277679' },
  ];
  
  for (const pos of positions) {
    console.log(`\n🔄 ${pos.title}...`);
    
    const balance = await ctf.balanceOf(wallet.address, pos.asset);
    if (balance.eq(0)) {
      console.log('   ⏭️ No balance');
      continue;
    }
    console.log('   Balance:', ethers.utils.formatUnits(balance, 6));
    
    try {
      const tx = await ctf.redeemPositions(
        USDC_E,
        ethers.constants.HashZero,
        pos.conditionId,
        [1, 2],
        { gasLimit: 200000 }
      );
      console.log('   TX:', tx.hash);
      const receipt = await tx.wait(2);
      console.log('   ✅ Done! Gas:', receipt.gasUsed.toString());
    } catch (e: any) {
      console.log('   ❌', e.code || e.reason || e.message?.slice(0, 150));
    }
  }
  
  const balanceAfter = await usdc.balanceOf(wallet.address);
  console.log('\n='.repeat(40));
  console.log('USDC.e after:', ethers.utils.formatUnits(balanceAfter, 6));
  console.log('Gained: $' + ethers.utils.formatUnits(balanceAfter.sub(balanceBefore), 6));
}

main().catch(console.error);
