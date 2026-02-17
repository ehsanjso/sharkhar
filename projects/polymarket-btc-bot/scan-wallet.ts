import 'dotenv/config';
import { ethers } from 'ethers';

const WALLET = '0x923C9c79ADF737A878f6fFb4946D7da889d78E1d';
const RPC = process.env.ALCHEMY_RPC || 'https://polygon-rpc.com';

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(RPC);
  
  // Check USDC balance
  const usdcAddr = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
  const usdcAbi = ['function balanceOf(address) view returns (uint256)'];
  const usdc = new ethers.Contract(usdcAddr, usdcAbi, provider);
  const balance = await usdc.balanceOf(WALLET);
  console.log(`USDC Balance: $${(Number(balance) / 1e6).toFixed(2)}`);
}

main().catch(console.error);
