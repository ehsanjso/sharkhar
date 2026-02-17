import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const WALLET = '0x923C9c79ADF737A878f6fFb4946D7da889d78E1d';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon.drpc.org', 137);
  
  // Check current USDC balance
  const usdc = new ethers.Contract(USDC_E, ['function balanceOf(address) view returns (uint256)'], provider);
  const bal = await usdc.balanceOf(WALLET);
  console.log('Current USDC.e:', ethers.utils.formatUnits(bal, 6));
  
  // Check MATIC balance
  const matic = await provider.getBalance(WALLET);
  console.log('Current MATIC:', ethers.utils.formatEther(matic));
  
  // Get recent transactions via Polygonscan
  const apiUrl = `https://api.polygonscan.com/api?module=account&action=tokentx&address=${WALLET}&page=1&offset=20&sort=desc`;
  const resp = await fetch(apiUrl);
  const data = await resp.json();
  
  console.log('\nPolygonscan response status:', data.status, data.message);
  
  if (data.status === '1' && data.result && Array.isArray(data.result)) {
    console.log('\n=== Recent Token Transfers ===\n');
    for (const tx of data.result.slice(0, 15)) {
      if (!tx.to || !tx.from) continue;
      const value = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal || '6'));
      const direction = tx.to.toLowerCase() === WALLET.toLowerCase() ? 'IN' : 'OUT';
      const time = new Date(parseInt(tx.timeStamp) * 1000).toLocaleString();
      console.log(`${direction} | ${value.toFixed(4)} ${tx.tokenSymbol || 'TOKEN'} | ${time} | ${tx.hash.slice(0,16)}...`);
    }
  } else {
    console.log('Raw response:', JSON.stringify(data).slice(0, 500));
  }
}

main().catch(console.error);
