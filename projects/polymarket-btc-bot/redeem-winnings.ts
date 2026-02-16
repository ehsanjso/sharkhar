import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const NEG_RISK_CTF = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const WALLET = '0x923C9c79ADF737A878f6fFb4946D7da889d78E1d';

const ABI = [
  'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint256[] indexSets) external',
  'function balanceOf(address owner, uint256 tokenId) view returns (uint256)',
];

async function checkAndRedeem() {
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon-rpc.com', 137);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
  console.log('Checking for redeemable positions...');
  console.log('Wallet:', wallet.address);
  
  // Check USDC.e balance before
  const usdc = new ethers.Contract(USDC_E, ['function balanceOf(address) view returns (uint256)'], provider);
  const balBefore = await usdc.balanceOf(wallet.address);
  console.log('USDC.e before:', ethers.utils.formatUnits(balBefore, 6));
  
  // Get recent markets from Polymarket API
  const response = await fetch('https://gamma-api.polymarket.com/events?active=false&closed=true&limit=20');
  const events = await response.json();
  
  const ctf = new ethers.Contract(CTF_ADDRESS, ABI, wallet);
  const negRiskCtf = new ethers.Contract(NEG_RISK_CTF, ABI, wallet);
  
  for (const event of events) {
    if (!event.markets) continue;
    for (const market of event.markets) {
      const tokenIds = JSON.parse(market.clobTokenIds || '[]');
      for (const tokenId of tokenIds) {
        try {
          // Check both CTF contracts
          const bal1 = await ctf.balanceOf(wallet.address, tokenId);
          const bal2 = await negRiskCtf.balanceOf(wallet.address, tokenId);
          
          if (bal1.gt(0)) {
            console.log(`Found ${ethers.utils.formatUnits(bal1, 6)} tokens in CTF: ${tokenId.slice(0, 20)}...`);
          }
          if (bal2.gt(0)) {
            console.log(`Found ${ethers.utils.formatUnits(bal2, 6)} tokens in NegRisk: ${tokenId.slice(0, 20)}...`);
          }
        } catch (e) {
          // Skip errors
        }
      }
    }
  }
  
  const balAfter = await usdc.balanceOf(wallet.address);
  console.log('USDC.e after:', ethers.utils.formatUnits(balAfter, 6));
}

checkAndRedeem().catch(console.error);
