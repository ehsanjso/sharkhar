import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const NEG_RISK_CTF = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
const WALLET = '0x923C9c79ADF737A878f6fFb4946D7da889d78E1d';

const CTF_ABI = ['function balanceOf(address owner, uint256 id) view returns (uint256)'];

// Sample token IDs from DB
const TOKEN_IDS = [
  '42411424256504851346442743140162958395240388440402404838043103944589755485340',
  '4932859160493927906618727599346479991312430709662382783111122704423240948994',
];

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon.drpc.org', 137);
  
  const ctf = new ethers.Contract(CTF_ADDRESS, CTF_ABI, provider);
  const negRisk = new ethers.Contract(NEG_RISK_CTF, CTF_ABI, provider);
  
  console.log('Checking token balances for wallet:', WALLET);
  console.log();
  
  for (const tokenId of TOKEN_IDS) {
    console.log('Token:', tokenId.slice(0, 30) + '...');
    
    try {
      const bal1 = await ctf.balanceOf(WALLET, tokenId);
      console.log('  CTF balance:', bal1.toString());
    } catch (e: any) {
      console.log('  CTF error:', e.code || e.message?.slice(0, 50));
    }
    
    try {
      const bal2 = await negRisk.balanceOf(WALLET, tokenId);
      console.log('  NegRisk balance:', bal2.toString());
    } catch (e: any) {
      console.log('  NegRisk error:', e.code || e.message?.slice(0, 50));
    }
    console.log();
  }
}

main().catch(console.error);
