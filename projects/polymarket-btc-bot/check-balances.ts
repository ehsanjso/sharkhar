import 'dotenv/config';
import { ethers } from 'ethers';

const WALLET = '0x923C9c79ADF737A878f6fFb4946D7da889d78E1d';
const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const RPC = process.env.ALCHEMY_RPC!;

const CTF_ABI = [
  'function balanceOf(address owner, uint256 id) view returns (uint256)',
];

// Token IDs from database
const TOKENS = [
  { id: '92789208308131599077591695979082668088127149855549379667430680595698406987696', market: 'Feb 17 5:30PM Up', payout: 8.98 },
  { id: '38891676940017663165008300290782395435833304620382345770354990847002024631743', market: 'Feb 17 5:20PM Down', payout: 16.65 },
  { id: '34329709381420726131697740555262484864750622417462115833184487078476358195399', market: 'Feb 17 4:55PM Up', payout: 17.12 },
  { id: '111670434832767364401867659573943881658225849907990453105286544196555404659848', market: 'Feb 17 4:50PM Down', payout: 10.71 },
  { id: '22635808330314906361437822536778809464107094864320646005894794288259614779545', market: 'Feb 17 4:45PM Down', payout: 9.82 },
];

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const ctf = new ethers.Contract(CTF, CTF_ABI, provider);
  
  console.log('Checking on-chain token balances...\n');
  
  let totalRedeemable = 0;
  for (const token of TOKENS) {
    try {
      const balance = await ctf.balanceOf(WALLET, token.id);
      const balanceNum = Number(ethers.utils.formatUnits(balance, 6));
      
      if (balanceNum > 0) {
        console.log(`✅ ${token.market}: ${balanceNum.toFixed(2)} tokens (worth ~$${balanceNum.toFixed(2)})`);
        totalRedeemable += balanceNum;
      } else {
        console.log(`⬜ ${token.market}: Already redeemed or no balance`);
      }
    } catch (e: any) {
      console.log(`❌ ${token.market}: Error - ${e.message}`);
    }
  }
  
  console.log(`\n💰 Total redeemable: $${totalRedeemable.toFixed(2)}`);
}

main().catch(console.error);
