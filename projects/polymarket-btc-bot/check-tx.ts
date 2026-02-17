import 'dotenv/config';
import { ethers } from 'ethers';

const TX_HASH = '0xb662238aaf072b7cfc7f3d619e800dafa43471bddf6924d98a2294e0af7ddb52';

const rpcs = [
  'https://polygon.drpc.org',
  'https://polygon-rpc.com', 
  'https://rpc.ankr.com/polygon',
  'https://polygon-bor-rpc.publicnode.com',
];

async function main() {
  for (const rpc of rpcs) {
    try {
      const provider = new ethers.providers.StaticJsonRpcProvider(rpc, 137);
      const receipt = await provider.getTransactionReceipt(TX_HASH);
      if (receipt) {
        console.log(`✅ Found on ${rpc}:`);
        console.log('   Status:', receipt.status === 1 ? 'SUCCESS' : 'FAILED');
        console.log('   Block:', receipt.blockNumber);
        console.log('   Gas used:', receipt.gasUsed.toString());
        return;
      }
      
      // Check pending
      const tx = await provider.getTransaction(TX_HASH);
      if (tx) {
        console.log(`⏳ Pending on ${rpc}`);
      } else {
        console.log(`❓ Not found on ${rpc}`);
      }
    } catch (e: any) {
      console.log(`❌ ${rpc}: ${e.message?.substring(0, 50)}`);
    }
  }
}

main();
