import 'dotenv/config';
import { ClobClient, Side, OrderType } from "@polymarket/clob-client";
import { Wallet } from "ethers";

async function main() {
  const HOST = "https://clob.polymarket.com";
  const CHAIN_ID = 137;
  const signer = new Wallet(process.env.PRIVATE_KEY!);
  
  console.log("=== POLYMARKET AUTH TEST ===");
  console.log("Wallet:", signer.address);
  
  // Step 1: Derive API credentials
  console.log("\n1. Deriving API credentials...");
  const tempClient = new ClobClient(HOST, CHAIN_ID, signer);
  const creds = await tempClient.createOrDeriveApiKey();
  console.log("   API Key:", creds.apiKey || "(derived)");
  console.log("   ✅ Credentials obtained");
  
  // Step 2: Create full client with signature type 0 (EOA)
  console.log("\n2. Creating authenticated client (sigType=0)...");
  const client = new ClobClient(HOST, CHAIN_ID, signer, creds, 0);
  console.log("   ✅ Client created");
  
  // Step 3: Check balance
  console.log("\n3. Checking balance...");
  const balance = await client.getBalanceAllowance({ asset_type: "COLLATERAL" });
  const usdcBalance = parseInt(balance.balance) / 1e6;
  console.log("   Balance: $" + usdcBalance.toFixed(2));
  
  if (usdcBalance < 1) {
    console.log("   ⚠️ Balance too low for test trade");
    return;
  }
  
  // Step 4: Get a test market (BTC 5-min)
  console.log("\n4. Finding a test market...");
  const now = new Date();
  const minute = now.getMinutes();
  const roundedMinute = Math.ceil(minute / 5) * 5 + 5;
  const windowTime = new Date(now);
  windowTime.setMinutes(roundedMinute, 0, 0);
  if (roundedMinute >= 60) {
    windowTime.setHours(windowTime.getHours() + 1);
    windowTime.setMinutes(roundedMinute - 60);
  }
  
  const timestamp = Math.floor(windowTime.getTime() / 1000);
  const slug = `btc-updown-5m-${timestamp}`;
  console.log("   Looking for:", slug);
  
  const gammaResp = await fetch(`https://gamma-api.polymarket.com/events?slug=${slug}`);
  const events = await gammaResp.json();
  
  if (!events || events.length === 0) {
    console.log("   ⚠️ No market found, trying next window...");
    return;
  }
  
  const market = events[0].markets[0];
  console.log("   Market:", market.question);
  
  const tokenIds = JSON.parse(market.clobTokenIds);
  const outcomes = JSON.parse(market.outcomes);
  const upTokenId = tokenIds[0]; // "Up" token
  
  console.log("   Up Token:", upTokenId.substring(0, 20) + "...");
  
  // Step 5: Get market info for tick size
  console.log("\n5. Getting market config...");
  const marketInfo = await client.getMarket(market.conditionId);
  console.log("   Tick Size:", marketInfo?.minimum_tick_size || "0.01");
  console.log("   Min Order:", marketInfo?.minimum_order_size || "5");
  
  // Step 6: Place a small test order ($0.10 at 0.01 price = 10 shares)
  console.log("\n6. Placing TEST order (will cancel immediately)...");
  console.log("   Token: Up");
  console.log("   Price: $0.01 (very low, won't fill)");
  console.log("   Size: 10 shares ($0.10 cost)");
  
  try {
    const order = await client.createAndPostOrder(
      {
        tokenID: upTokenId,
        price: 0.01,
        side: Side.BUY,
        size: 10,
      },
      { 
        tickSize: marketInfo?.minimum_tick_size || "0.01",
        negRisk: false 
      },
      OrderType.GTC // Good Till Cancelled
    );
    
    console.log("   ✅ Order placed!");
    console.log("   Order ID:", order.orderID || order.id);
    console.log("   Status:", order.status);
    
    // Cancel the test order
    if (order.orderID || order.id) {
      console.log("\n7. Cancelling test order...");
      await client.cancelOrder({ orderID: order.orderID || order.id });
      console.log("   ✅ Order cancelled");
    }
    
    console.log("\n🎉 ALL TESTS PASSED! Auth is working correctly.");
    
  } catch (error: any) {
    console.log("   ❌ Order failed:", error.message);
    if (error.response?.data) {
      console.log("   Response:", JSON.stringify(error.response.data));
    }
  }
}

main().catch(e => console.error("Fatal:", e.message));
