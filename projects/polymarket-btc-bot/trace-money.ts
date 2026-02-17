import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const WALLET = '0x923C9c79ADF737A878f6fFb4946D7da889d78E1d';
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';

async function main() {
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon.drpc.org', 137);
  
  // Get current block
  const currentBlock = await provider.getBlockNumber();
  console.log('Current block:', currentBlock);
  
  // Look at last 1000 blocks (~30 min) for recent USDC transfers
  const fromBlock = currentBlock - 1000;
  
  // USDC Transfer event
  const usdcAbi = ['event Transfer(address indexed from, address indexed to, uint256 value)'];
  const usdc = new ethers.Contract(USDC_E, usdcAbi, provider);
  
  // Get transfers TO our wallet (incoming USDC)
  console.log('\n=== Recent USDC Incoming (last ~30 min) ===');
  try {
    const filterIn = usdc.filters.Transfer(null, WALLET);
    const logsIn = await usdc.queryFilter(filterIn, fromBlock, currentBlock);
    let totalIn = 0;
    for (const log of logsIn.slice(-10)) {
      const value = parseFloat(ethers.utils.formatUnits(log.args!.value, 6));
      totalIn += value;
      const block = await log.getBlock();
      const time = new Date(block.timestamp * 1000).toLocaleString();
      console.log(`  +$${value.toFixed(2)} from ${log.args!.from.slice(0,10)}... @ ${time}`);
    }
    console.log(`  Total incoming: $${totalIn.toFixed(2)}`);
  } catch (e: any) {
    console.log('  Error:', e.message?.slice(0, 80));
  }
  
  // Get transfers FROM our wallet (outgoing USDC)
  console.log('\n=== Recent USDC Outgoing (last ~30 min) ===');
  try {
    const filterOut = usdc.filters.Transfer(WALLET, null);
    const logsOut = await usdc.queryFilter(filterOut, fromBlock, currentBlock);
    let totalOut = 0;
    for (const log of logsOut.slice(-10)) {
      const value = parseFloat(ethers.utils.formatUnits(log.args!.value, 6));
      totalOut += value;
      const block = await log.getBlock();
      const time = new Date(block.timestamp * 1000).toLocaleString();
      console.log(`  -$${value.toFixed(2)} to ${log.args!.to.slice(0,10)}... @ ${time}`);
    }
    console.log(`  Total outgoing: $${totalOut.toFixed(2)}`);
  } catch (e: any) {
    console.log('  Error:', e.message?.slice(0, 80));
  }
  
  // Current balance
  const usdcBalance = new ethers.Contract(USDC_E, ['function balanceOf(address) view returns (uint256)'], provider);
  const bal = await usdcBalance.balanceOf(WALLET);
  console.log('\nCurrent USDC.e balance:', ethers.utils.formatUnits(bal, 6));
}

main().catch(console.error);
