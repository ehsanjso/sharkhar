import 'dotenv/config';
import { ethers } from 'ethers';

const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

const CTF_ABI = [
  'function redeemPositions(address,bytes32,bytes32,uint256[]) external',
];

// Old Feb 16 losing positions to clear
const OLD_CONDITIONS = [
  '0xe2425952141a6026681b1fa26b9648b8afe22a3297fbfc3e92af0afc40a930db', // 3:50-3:55
  '0x770b233a84fd9bc3973a5680da1c141b1b6b57f5cf638651fa499439ec608ee2', // 3:40-3:45
  '0xf253552f8bf60740e7af45cb6348611419a4b75b60bd8a873a20f94ce285d1a6', // 4:10-4:15
  '0x4a676864065754eb81355a2257f0b8730815926f64dac892042454afe8ec3412', // 5:25-5:30
  '0x9d2516575412146080c27aeab6dfb8a1eee5458cb1ef4b4162702e2db2c52fc3', // 4:30-4:35
  '0xe1fd09830bd1f1c681cc4a76d3d32db912f52cf7fee0e9216d0bf94c04199162', // 4:45-4:50
];

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon.drpc.org', 137);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const ctf = new ethers.Contract(CTF, CTF_ABI, wallet);
  
  console.log('🧹 Clearing old Feb 16 positions...\n');
  
  for (const condition of OLD_CONDITIONS) {
    try {
      const tx = await ctf.redeemPositions(
        USDC_E,
        ethers.constants.HashZero,
        condition,
        [1, 2],
        { gasLimit: 150000, maxFeePerGas: ethers.utils.parseUnits('100', 'gwei'), maxPriorityFeePerGas: ethers.utils.parseUnits('35', 'gwei') }
      );
      console.log(`✅ ${condition.substring(0, 10)}... TX: ${tx.hash.substring(0, 20)}...`);
      await tx.wait(1);
    } catch (e: any) {
      console.log(`⏭️ ${condition.substring(0, 10)}... skipped (${e.message?.substring(0, 30)})`);
    }
  }
  
  console.log('\n✅ Done clearing old positions');
}

main().catch(e => console.error('Error:', e.message));
