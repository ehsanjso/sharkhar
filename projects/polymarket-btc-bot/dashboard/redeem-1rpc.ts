import { ethers } from 'ethers';
import 'dotenv/config';

const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const CTF_ABI = ['function redeemPositions(address, bytes32, bytes32, uint256[]) external', 'function balanceOf(address,uint256) view returns (uint256)'];

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider('https://1rpc.io/matic', 137);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const ctf = new ethers.Contract(CTF, CTF_ABI, wallet);
  
  console.log('Using 1rpc.io');
  console.log('Wallet:', wallet.address);
  
  const positions = [
    { title: '3:35-3:40 AM', conditionId: '0xb9c0752a9e7900ac58f3b52767eb9fea92ffd4cf46c0ed613842d6bf20be2f66', asset: '20142863418699769485418301598533558739045975936691252085596112945691690402843' },
    { title: '8:40-8:45 AM', conditionId: '0x2aae4f2bfb329f23c4bf159e51d63f00dab628a049b0b016f529054efdb20a55', asset: '61389490052363105952980171003554758500470085139713480254186817857196609277679' },
  ];
  
  for (const pos of positions) {
    console.log(`\n🔄 ${pos.title}...`);
    
    // Check balance first
    const bal = await ctf.balanceOf(wallet.address, pos.asset);
    console.log('   Token balance:', ethers.utils.formatUnits(bal, 6));
    
    if (bal.eq(0)) {
      console.log('   ⏭️ Already redeemed');
      continue;
    }
    
    // Redeem
    const tx = await ctf.redeemPositions(
      USDC_E,
      ethers.constants.HashZero,
      pos.conditionId,
      [1, 2],
      { gasLimit: 200000 }
    );
    
    console.log('   TX:', tx.hash);
    const receipt = await tx.wait(2);
    console.log('   ✅ Confirmed! Block:', receipt.blockNumber);
    
    // Small delay between txs
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('\n✅ Done!');
}

main().catch(e => console.error('Error:', e.reason || e.message?.slice(0, 150)));
