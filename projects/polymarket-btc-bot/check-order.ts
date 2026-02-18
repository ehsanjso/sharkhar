import 'dotenv/config';
import { ClobClient } from "@polymarket/clob-client";
import { Wallet } from "ethers";

async function main() {
  const signer = new Wallet(process.env.PRIVATE_KEY!);
  const tempClient = new ClobClient("https://clob.polymarket.com", 137, signer);
  const creds = await tempClient.createOrDeriveApiKey();
  const client = new ClobClient("https://clob.polymarket.com", 137, signer, creds, 0);

  console.log("=== Checking Orders ===");
  
  // Check open orders
  const open = await client.getOpenOrders();
  console.log("Open orders:", open.length);
  
  // Check trades
  const trades = await client.getTrades({ maker: signer.address });
  console.log("\nRecent trades:");
  if (trades && trades.length > 0) {
    trades.slice(0, 5).forEach((t: any) => {
      console.log(`  ${t.side} ${t.size} @ ${t.price} - ${t.status || 'filled'}`);
    });
  } else {
    console.log("  (no trades)");
  }
  
  // Check balance
  const balance = await client.getBalanceAllowance({ asset_type: "COLLATERAL" });
  console.log("\nCurrent balance: $" + (parseInt(balance.balance) / 1e6).toFixed(2));
}

main().catch(console.error);
