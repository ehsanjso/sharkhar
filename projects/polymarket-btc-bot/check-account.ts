import 'dotenv/config';
import { ClobClient } from "@polymarket/clob-client";
import { Wallet } from "ethers";

async function main() {
  const HOST = "https://clob.polymarket.com";
  const signer = new Wallet(process.env.PRIVATE_KEY!);
  
  console.log("Signer:", signer.address);
  
  // Try different signature types
  for (const sigType of [0, 1, 2]) {
    console.log(`\n=== Testing Signature Type ${sigType} ===`);
    try {
      const tempClient = new ClobClient(HOST, 137, signer);
      const creds = await tempClient.createOrDeriveApiKey();
      
      // Test with this sig type
      const client = new ClobClient(HOST, 137, signer, creds, sigType);
      const balance = await client.getBalanceAllowance({ asset_type: "COLLATERAL" });
      console.log("Balance:", balance.balance);
      console.log("Success with type", sigType);
      break;
    } catch (e: any) {
      console.log("Failed:", e.message?.substring(0, 100));
    }
  }
}

main().catch(console.error);
