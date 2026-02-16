import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config();

const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const NEG_RISK_CTF = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
const ABI = ['function balanceOf(address, uint256) view returns (uint256)'];

async function main() {
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!);
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon.meowrpc.com', 137);
  
  const tokenIds = [
    '40404954389323825046677308028880874832842447086828918002747114351458544412353',
    '63631808186054856475182296880724840304334582067146217227800203876735418792089',
    '41450873068382072044464054600522219539697269377365239351152743867413382080651'
  ];
  
  console.log('Checking CTF (regular):');
  const ctf = new ethers.Contract(CTF, ABI, provider);
  for (const id of tokenIds) {
    try {
      const bal = await ctf.balanceOf(wallet.address, id);
      console.log(`  ${id.substring(0,20)}... = ${ethers.utils.formatUnits(bal, 6)}`);
    } catch (e: any) {
      console.log(`  ${id.substring(0,20)}... ERROR: ${e.message?.substring(0,50)}`);
    }
  }
  
  console.log('\nChecking NEG_RISK_CTF:');
  const negCtf = new ethers.Contract(NEG_RISK_CTF, ABI, provider);
  for (const id of tokenIds) {
    try {
      const bal = await negCtf.balanceOf(wallet.address, id);
      console.log(`  ${id.substring(0,20)}... = ${ethers.utils.formatUnits(bal, 6)}`);
    } catch (e: any) {
      console.log(`  ${id.substring(0,20)}... ERROR: ${e.message?.substring(0,50)}`);
    }
  }
}
main().catch(console.error);
