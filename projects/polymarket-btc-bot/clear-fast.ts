import 'dotenv/config';
import { ethers } from 'ethers';

const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const CTF_ABI = ['function redeemPositions(address,bytes32,bytes32,uint256[]) external'];

const CONDITIONS = [
  '0x770b233a84fd9bc3973a5680da1c141b1b6b57f5cf638651fa499439ec608ee2',
  '0xf253552f8bf60740e7af45cb6348611419a4b75b60bd8a873a20f94ce285d1a6',
  '0x4a676864065754eb81355a2257f0b8730815926f64dac892042454afe8ec3412',
  '0x9d2516575412146080c27aeab6dfb8a1eee5458cb1ef4b4162702e2db2c52fc3',
  '0xe1fd09830bd1f1c681cc4a76d3d32db912f52cf7fee0e9216d0bf94c04199162',
];

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon.drpc.org', 137);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const ctf = new ethers.Contract(CTF, CTF_ABI, wallet);
  let nonce = await wallet.getTransactionCount();
  
  console.log('🧹 Clearing remaining 5 positions (no wait)...');
  
  for (const condition of CONDITIONS) {
    try {
      const tx = await ctf.redeemPositions(USDC_E, ethers.constants.HashZero, condition, [1, 2], {
        gasLimit: 150000,
        maxFeePerGas: ethers.utils.parseUnits('80', 'gwei'),
        maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei'),
        nonce: nonce++
      });
      console.log(`📤 ${condition.substring(0, 10)}... → ${tx.hash.substring(0, 18)}...`);
    } catch (e: any) {
      console.log(`⏭️ ${condition.substring(0, 10)}... skipped`);
    }
  }
  console.log('\n✅ All TXs sent! Will confirm in background.');
}
main();
