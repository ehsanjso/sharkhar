import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

// Check a specific order on Polymarket CLOB
async function checkOrder(orderId: string) {
  const resp = await fetch(`https://clob.polymarket.com/order/${orderId}`);
  if (!resp.ok) {
    console.log(`Order ${orderId.slice(0,20)}... - Status: ${resp.status}`);
    return null;
  }
  const data = await resp.json();
  return data;
}

// Check recent fills for our wallet
async function checkFills() {
  const wallet = '0x923C9c79ADF737A878f6fFb4946D7da889d78E1d';
  const resp = await fetch(`https://clob.polymarket.com/trades?maker=${wallet}&limit=20`);
  if (!resp.ok) {
    console.log('Fills check failed:', resp.status);
    return;
  }
  const data = await resp.json();
  console.log('Recent fills:', JSON.stringify(data, null, 2).slice(0, 2000));
}

// Sample order IDs from DB
const ORDER_IDS = [
  '0xa997ca50305c0f87b3430f67574e1220fa715aa126b193ed94d0502a0241b1d1',
  '0xb59268aeac74ca8f498406e82204f460b930282edf5d381305a19d13f9183369',
  '0x2842f167cfc57ea2ab810b1bc0b3ebc6bfb845340f642f0cfe4846c6a81ae490',
];

async function main() {
  console.log('=== Checking Order Status ===\n');
  for (const orderId of ORDER_IDS) {
    const order = await checkOrder(orderId);
    if (order) {
      console.log(`Order ${orderId.slice(0,20)}...`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Size filled: ${order.size_matched}/${order.original_size}`);
      console.log(`  Side: ${order.side}`);
    }
    console.log();
  }
  
  console.log('\n=== Checking Recent Fills ===\n');
  await checkFills();
}

main().catch(console.error);
