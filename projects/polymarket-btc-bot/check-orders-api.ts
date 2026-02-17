import { ClobClient } from '@polymarket/clob-client';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const WALLET = '0x923C9c79ADF737A878f6fFb4946D7da889d78E1d';

async function main() {
  // Try to get our order history via Polymarket CLOB
  const provider = new ethers.providers.StaticJsonRpcProvider('https://polygon.drpc.org', 137);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
  console.log('Wallet:', wallet.address);
  
  const clobClient = new ClobClient(
    'https://clob.polymarket.com',
    137,
    wallet
  );
  
  try {
    // Get our orders
    console.log('\n=== Getting Orders ===');
    const orders = await clobClient.getOrders({
      maker: WALLET,
    });
    console.log('Orders:', orders.length);
    for (const o of orders.slice(0, 10)) {
      console.log(`  ${o.status} | ${o.side} | ${o.original_size} @ ${o.price} | ${o.created_at}`);
    }
  } catch (e: any) {
    console.log('Orders error:', e.message?.slice(0, 100));
  }
  
  try {
    // Get our trades/fills
    console.log('\n=== Getting Trades ===');
    const trades = await clobClient.getTrades({
      maker: WALLET,
    });
    console.log('Trades:', trades.length);
    for (const t of trades.slice(0, 10)) {
      console.log(`  ${t.side} | ${t.size} @ ${t.price} | ${t.created_at}`);
    }
  } catch (e: any) {
    console.log('Trades error:', e.message?.slice(0, 100));
  }
}

main().catch(console.error);
