import 'dotenv/config';
import { ClobClient } from "@polymarket/clob-client";
import { Wallet, ethers } from "ethers";

async function main() {
  const signer = new Wallet(process.env.PRIVATE_KEY!);
  const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");
  
  // CLOB balance
  const tempClient = new ClobClient("https://clob.polymarket.com", 137, signer);
  const creds = await tempClient.createOrDeriveApiKey();
  const client = new ClobClient("https://clob.polymarket.com", 137, signer, creds, 0);
  
  const clobBalance = await client.getBalanceAllowance({ asset_type: "COLLATERAL" });
  console.log("💵 CLOB Balance: $" + (parseInt(clobBalance.balance) / 1e6).toFixed(2));
  
  // On-chain USDC
  const USDC_E = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
  const USDC_NATIVE = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
  const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
  
  const usdcE = new ethers.Contract(USDC_E, erc20Abi, provider);
  const usdcNative = new ethers.Contract(USDC_NATIVE, erc20Abi, provider);
  
  const balE = await usdcE.balanceOf(signer.address);
  const balN = await usdcNative.balanceOf(signer.address);
  
  console.log("💵 USDC.e (wallet): $" + ethers.utils.formatUnits(balE, 6));
  console.log("💵 USDC Native (wallet): $" + ethers.utils.formatUnits(balN, 6));
  
  // Check open orders/positions
  console.log("\n📊 Open Orders:");
  const orders = await client.getOpenOrders();
  if (orders.length === 0) {
    console.log("   (none)");
  } else {
    orders.forEach((o: any) => console.log(`   ${o.side} ${o.size} @ ${o.price}`));
  }
  
  // Total
  const total = (parseInt(clobBalance.balance) / 1e6) + parseFloat(ethers.utils.formatUnits(balE, 6)) + parseFloat(ethers.utils.formatUnits(balN, 6));
  console.log("\n💰 Total Available: $" + total.toFixed(2));
}

main().catch(console.error);
