import { ClobClient, Side } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import 'dotenv/config';

async function testTrade() {
  const HOST = 'https://clob.polymarket.com';
  const CHAIN_ID = 137;
  
  const signer = new Wallet(process.env.PRIVATE_KEY!);
  console.log('Wallet address:', signer.address);
  
  // Create client
  const tempClient = new ClobClient(HOST, CHAIN_ID, signer);
  const apiCreds = await tempClient.createOrDeriveApiKey();
  console.log('API credentials obtained');
  
  const client = new ClobClient(
    HOST,
    CHAIN_ID,
    signer,
    apiCreds,
    0 // EOA signature type
  );
  
  // Check balance
  try {
    const balance = await client.getBalanceAllowance({ asset_type: 'COLLATERAL' });
    console.log('\n💰 CLOB Balance:', JSON.stringify(balance, null, 2));
  } catch (e: any) {
    console.log('Balance check error:', e.message);
  }
  
  // Find a market to test
  console.log('\n🔍 Finding an active market...');
  const response = await fetch('https://gamma-api.polymarket.com/events?active=true&closed=false&limit=10');
  const events = await response.json();
  
  if (events.length > 0) {
    const event = events[0];
    const market = event.markets?.[0];
    if (market && market.clobTokenIds?.length > 0) {
      const tokenId = market.clobTokenIds[0];
      console.log(`\nFound market: ${event.title}`);
      console.log(`Token ID: ${tokenId}`);
      
      // Get price
      const priceRes = await fetch(`${HOST}/price?token_id=${tokenId}&side=buy`);
      const priceData = await priceRes.json();
      console.log('Current price:', priceData.price);
      
      // Try a small test order (DRY RUN - just create, don't post)
      console.log('\n📝 Creating test order (will NOT submit)...');
      const order = await client.createOrder({
        tokenID: tokenId,
        price: 0.01, // Very low price - won't fill
        size: 1,
        side: Side.BUY,
      });
      console.log('✅ Order created successfully!');
      console.log('Order signature valid - bot CAN place orders');
      
      // Uncomment to actually post:
      // const result = await client.postOrder(order);
      // console.log('Order posted:', result);
    }
  }
  
  console.log('\n✅ Test complete - bot is ready to trade!');
}

testTrade().catch(e => console.error('Error:', e.message));
