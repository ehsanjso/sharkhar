import 'dotenv/config';
import { ClobClient } from "@polymarket/clob-client";
import { Wallet } from "ethers";

async function main() {
  const HOST = "https://clob.polymarket.com";
  const CHAIN_ID = 137;
  const signer = new Wallet(process.env.PRIVATE_KEY!);
  
  // Check what methods are available
  const client = new ClobClient(HOST, CHAIN_ID, signer);
  
  console.log("=== CLOB CLIENT METHODS ===");
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(client))
    .filter(m => !m.startsWith('_') && m !== 'constructor')
    .sort();
  
  methods.forEach(m => console.log(" -", m));
  
  // Check for deposit/allowance
  console.log("\n=== CHECKING ALLOWANCES ===");
  const allowance = await client.getBalanceAllowance({ asset_type: "COLLATERAL" });
  console.log(JSON.stringify(allowance, null, 2));
}

main().catch(console.error);
