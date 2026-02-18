import 'dotenv/config';
import { ClobClient } from "@polymarket/clob-client";
import { Wallet } from "ethers";

async function main() {
  const HOST = "https://clob.polymarket.com";
  const CHAIN_ID = 137;
  
  const privateKey = process.env.PRIVATE_KEY!;
  const signer = new Wallet(privateKey);
  
  console.log("=== WALLET INFO ===");
  console.log("Signer Address:", signer.address);
  
  // Create client with just L1 (signer)
  const client = new ClobClient(HOST, CHAIN_ID, signer);
  
  console.log("\n=== DERIVING API CREDENTIALS ===");
  try {
    const creds = await client.createOrDeriveApiKey();
    console.log("API Key:", creds.apiKey);
    console.log("Secret:", creds.secret?.substring(0, 20) + "...");
    console.log("Passphrase:", creds.passphrase);
    
    // Now create full client with creds
    console.log("\n=== CREATING FULL CLIENT ===");
    // Try signature type 1 (POLY_PROXY) first since this is likely a Polymarket wallet
    const fullClient = new ClobClient(HOST, CHAIN_ID, signer, creds, 1);
    
    // Check balance
    console.log("\n=== CHECKING BALANCE ===");
    const balance = await fullClient.getBalanceAllowance({ asset_type: "COLLATERAL" });
    console.log("Balance:", JSON.stringify(balance, null, 2));
    
  } catch (error: any) {
    console.error("Error:", error.message);
    if (error.response?.data) {
      console.error("Response:", JSON.stringify(error.response.data));
    }
  }
}

main();
