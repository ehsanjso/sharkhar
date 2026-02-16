import { ethers } from 'ethers';
import 'dotenv/config';

const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const CTF_ABI = ['function redeemPositions(address, bytes32, bytes32, uint256[]) external'];

async function redeem(conditionId: string, title: string) {
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon-bor-rpc.publicnode.com', 137);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const ctf = new ethers.Contract(CTF, CTF_ABI, wallet);
  
  console.log(`Redeeming ${title}...`);
  
  const tx = await ctf.redeemPositions(
    USDC_E,
    ethers.constants.HashZero,
    conditionId,
    [1, 2],
    { gasLimit: 200000 }
  );
  
  console.log('TX:', tx.hash);
  await tx.wait(1);
  console.log('✅ Done!');
}

// Get conditionId from command line
const conditionId = process.argv[2];
const title = process.argv[3] || 'position';

if (!conditionId) {
  console.log('Usage: npx tsx redeem-one.ts <conditionId> <title>');
  process.exit(1);
}

redeem(conditionId, title).catch(e => console.error('Error:', e.reason || e.message));
