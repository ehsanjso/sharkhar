import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const ALCHEMY_RPC = process.env.ALCHEMY_RPC!;
const wallet = '0x923C9c79ADF737A878f6fFb4946D7da889d78E1d';

const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const NEG_RISK_CTF = '0xC5d563A36AE78145C45a50134d48A1215220f80a';

const tokenIds = [
  '40404954389323825046677308028880874832842447086828918002747114351458544412353',
  '63631808186054856475182296880724840304334582067146217227800203876735418792089',
  '41450873068382072044464054600522219539697269377365239351152743867413382080651'
];

const ABI = ['function balanceOf(address, uint256) view returns (uint256)'];

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider(ALCHEMY_RPC, 137);
  
  console.log('Checking token balances on both CTF contracts:\n');
  
  const ctf = new ethers.Contract(CTF, ABI, provider);
  const negCtf = new ethers.Contract(NEG_RISK_CTF, ABI, provider);
  
  for (const id of tokenIds) {
    console.log(`Token ${id.substring(0, 15)}...`);
    
    try {
      const bal1 = await ctf.balanceOf(wallet, id);
      console.log(`  Regular CTF: ${ethers.utils.formatUnits(bal1, 6)}`);
    } catch (e: any) {
      console.log(`  Regular CTF: error - ${e.message?.substring(0, 30)}`);
    }
    
    try {
      const bal2 = await negCtf.balanceOf(wallet, id);
      console.log(`  NegRisk CTF: ${ethers.utils.formatUnits(bal2, 6)}`);
    } catch (e: any) {
      console.log(`  NegRisk CTF: error - ${e.message?.substring(0, 30)}`);
    }
    console.log();
  }
}

main().catch(console.error);
