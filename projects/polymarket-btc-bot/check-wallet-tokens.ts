import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config();

// Check wallet for any ERC1155 events (token transfers)
async function main() {
  const wallet = '0x923C9c79ADF737A878f6fFb4946D7da889d78E1d';
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon.llamarpc.com', 137);
  
  const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
  const NEG_RISK_CTF = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
  
  // ERC1155 Transfer event
  const ABI = [
    'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)'
  ];
  
  console.log('Checking recent ERC1155 transfers TO our wallet...\n');
  
  const block = await provider.getBlockNumber();
  console.log(`Current block: ${block}`);
  
  // Check last 10000 blocks (~5 hours)
  const fromBlock = block - 10000;
  
  for (const addr of [CTF, NEG_RISK_CTF]) {
    console.log(`\n${addr === CTF ? 'Regular CTF' : 'NEG_RISK_CTF'}:`);
    const contract = new ethers.Contract(addr, ABI, provider);
    
    try {
      const filter = contract.filters.TransferSingle(null, null, wallet);
      const events = await contract.queryFilter(filter, fromBlock, block);
      console.log(`  Found ${events.length} incoming transfers`);
      
      for (const e of events.slice(-5)) {
        console.log(`  - Block ${e.blockNumber}: id=${e.args?.id?.toString()?.substring(0,20)}..., value=${ethers.utils.formatUnits(e.args?.value || 0, 6)}`);
      }
    } catch (err: any) {
      console.log(`  Error: ${err.message?.substring(0, 50)}`);
    }
  }
}
main().catch(console.error);
