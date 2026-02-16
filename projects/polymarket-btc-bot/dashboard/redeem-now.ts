import { ethers } from 'ethers';
import 'dotenv/config';

const NEG_RISK_CTF = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
const NEG_RISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296';

const CTF_ABI = [
  'function balanceOf(address owner, uint256 id) view returns (uint256)',
  'function balanceOfBatch(address[] owners, uint256[] ids) view returns (uint256[])',
];

const ADAPTER_ABI = [
  'function redeemPositions(bytes32 conditionId, uint256[] amounts) external'
];

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon-bor-rpc.publicnode.com', 137);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
  console.log('Wallet:', wallet.address);
  
  // Get USDC.e balance before
  const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
  const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];
  const usdc = new ethers.Contract(USDC_E, ERC20_ABI, provider);
  const balanceBefore = await usdc.balanceOf(wallet.address);
  console.log('USDC.e balance before:', ethers.utils.formatUnits(balanceBefore, 6));
  
  // Query the Polymarket API for our positions
  const response = await fetch(`https://data-api.polymarket.com/positions?user=${wallet.address.toLowerCase()}`);
  
  if (!response.ok) {
    console.log('Could not fetch positions from API, trying CLOB...');
    
    // Try CLOB API
    const clobResponse = await fetch(`https://clob.polymarket.com/data/positions?address=${wallet.address.toLowerCase()}`);
    if (clobResponse.ok) {
      const positions = await clobResponse.json();
      console.log('Positions from CLOB:', JSON.stringify(positions, null, 2));
    } else {
      console.log('CLOB API also failed:', clobResponse.status);
    }
  } else {
    const positions = await response.json();
    console.log('Positions:', JSON.stringify(positions, null, 2));
  }
  
  // Try to redeem using the gamma-api markets
  console.log('\nFetching recent BTC markets to find redeemable positions...');
  const marketsRes = await fetch('https://gamma-api.polymarket.com/events?slug_contains=btc-updown&closed=true&limit=20');
  
  if (marketsRes.ok) {
    const events = await marketsRes.json();
    console.log(`Found ${events.length} closed BTC markets`);
    
    for (const event of events.slice(0, 5)) {
      console.log(`\n${event.title}`);
      if (event.markets?.[0]) {
        const m = event.markets[0];
        console.log('  Condition ID:', m.conditionId);
        console.log('  Resolved:', m.resolved);
      }
    }
  }
}

main().catch(console.error);
