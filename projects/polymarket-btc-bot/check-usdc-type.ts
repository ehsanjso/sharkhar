import 'dotenv/config';
import { ethers } from "ethers";

async function main() {
  const WALLET = "0x923C9c79ADF737A878f6fFb4946D7da889d78E1d";
  const USDC_E = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";     // USDC.e (bridged) - 6 decimals
  const USDC_NATIVE = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"; // Native USDC - 6 decimals
  
  // Polymarket Exchange
  const EXCHANGE = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E";
  
  const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");
  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)"
  ];
  
  const usdcE = new ethers.Contract(USDC_E, erc20Abi, provider);
  const usdcNative = new ethers.Contract(USDC_NATIVE, erc20Abi, provider);
  
  console.log("=== USDC Balances ===");
  console.log("USDC.e (bridged):", ethers.utils.formatUnits(await usdcE.balanceOf(WALLET), 6));
  console.log("USDC (native):", ethers.utils.formatUnits(await usdcNative.balanceOf(WALLET), 6));
  
  console.log("\n=== Allowances to Exchange ===");
  console.log("USDC.e → Exchange:", ethers.utils.formatUnits(await usdcE.allowance(WALLET, EXCHANGE), 6));
  console.log("USDC → Exchange:", ethers.utils.formatUnits(await usdcNative.allowance(WALLET, EXCHANGE), 6));
  
  // Check what collateral the Polymarket Exchange uses
  console.log("\n=== Polymarket Exchange Info ===");
  const exchangeAbi = ["function getCollateral() view returns (address)"];
  try {
    const exchange = new ethers.Contract(EXCHANGE, exchangeAbi, provider);
    const collateral = await exchange.getCollateral();
    console.log("Exchange collateral token:", collateral);
    if (collateral.toLowerCase() === USDC_E.toLowerCase()) {
      console.log("→ Uses USDC.e (bridged)");
    } else if (collateral.toLowerCase() === USDC_NATIVE.toLowerCase()) {
      console.log("→ Uses Native USDC");
    }
  } catch (e) {
    console.log("Can't read collateral directly");
  }
}

main().catch(console.error);
