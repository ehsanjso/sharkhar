import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const ALCHEMY_RPC = process.env.ALCHEMY_RPC!;
const wallet = '0x923C9c79ADF737A878f6fFb4946D7da889d78E1d';

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider(ALCHEMY_RPC, 137);
  
  // Check recent TransferSingle events TO our wallet
  const NEG_RISK_CTF = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
  const ABI = [
    'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
    'function balanceOf(address, uint256) view returns (uint256)'
  ];
  
  const ctf = new ethers.Contract(NEG_RISK_CTF, ABI, provider);
  const block = await provider.getBlockNumber();
  
  console.log('📊 Checking for CTF tokens received in last 2 hours...\n');
  
  // ~2 hours of blocks
  const filter = ctf.filters.TransferSingle(null, null, wallet);
  const events = await ctf.queryFilter(filter, block - 3600, block);
  
  console.log(`Found ${events.length} incoming token transfers\n`);
  
  const tokenIds = new Set<string>();
  for (const e of events) {
    const id = e.args?.id?.toString();
    if (id) tokenIds.add(id);
  }
  
  console.log('Checking balances for received tokens:\n');
  
  let totalValue = 0;
  for (const id of tokenIds) {
    try {
      const bal = await ctf.balanceOf(wallet, id);
      const value = parseFloat(ethers.utils.formatUnits(bal, 6));
      if (value > 0) {
        console.log(`  💰 Token ${id.substring(0, 20)}... = $${value.toFixed(2)}`);
        totalValue += value;
      }
    } catch (e) {
      // Skip errors
    }
  }
  
  console.log(`\n💵 Total unredeemed CTF value: $${totalValue.toFixed(2)}`);
}

main().catch(console.error);
