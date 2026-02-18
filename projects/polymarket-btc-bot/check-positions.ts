import 'dotenv/config';
import { ClobClient } from "@polymarket/clob-client";
import { Wallet, ethers } from "ethers";

async function main() {
  const signer = new Wallet(process.env.PRIVATE_KEY!);
  const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");
  
  // CLOB client
  const tempClient = new ClobClient("https://clob.polymarket.com", 137, signer);
  const creds = await tempClient.createOrDeriveApiKey();
  const client = new ClobClient("https://clob.polymarket.com", 137, signer, creds, 0);
  
  console.log("=== CLOB Balance ===");
  const balance = await client.getBalanceAllowance({ asset_type: "COLLATERAL" });
  console.log("USDC: $" + (parseInt(balance.balance) / 1e6).toFixed(2));
  
  // Check CTF token balances (positions)
  console.log("\n=== CTF Positions ===");
  const CTF = "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045"; // CTF contract
  const ctfAbi = ["function balanceOf(address, uint256) view returns (uint256)"];
  const ctf = new ethers.Contract(CTF, ctfAbi, provider);
  
  // Recent market tokens (from the 5:45 market we bet on)
  const tokens = [
    { name: "DOWN 5:45", id: "58782576141490873340469754912654074082409651282694363572749791051552722251326" },
    { name: "UP 5:45", id: "96396159646317947802692856576974616000063244794095865532640250246445919364225" },
  ];
  
  for (const t of tokens) {
    try {
      const bal = await ctf.balanceOf(signer.address, t.id);
      if (!bal.isZero()) {
        console.log(`${t.name}: ${ethers.utils.formatUnits(bal, 6)} shares`);
      }
    } catch (e) {}
  }
  
  console.log("\n(Positions show shares in outcome tokens)");
}

main().catch(console.error);
