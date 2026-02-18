import 'dotenv/config';
import { ethers } from "ethers";

async function main() {
  const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // USDC.e on Polygon
  const USDC_NATIVE = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"; // Native USDC on Polygon
  const WALLET = "0x923C9c79ADF737A878f6fFb4946D7da889d78E1d";
  
  const provider = new ethers.providers.JsonRpcProvider("https://polygon-rpc.com");
  
  // ERC20 ABI for balanceOf
  const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
  
  // Check MATIC
  const maticBalance = await provider.getBalance(WALLET);
  console.log("MATIC:", ethers.utils.formatEther(maticBalance));
  
  // Check USDC.e (bridged)
  const usdcE = new ethers.Contract(USDC_ADDRESS, erc20Abi, provider);
  const usdcEBalance = await usdcE.balanceOf(WALLET);
  console.log("USDC.e:", ethers.utils.formatUnits(usdcEBalance, 6));
  
  // Check native USDC
  const usdcNative = new ethers.Contract(USDC_NATIVE, erc20Abi, provider);
  const usdcNativeBalance = await usdcNative.balanceOf(WALLET);
  console.log("USDC (native):", ethers.utils.formatUnits(usdcNativeBalance, 6));
  
  // Check Polymarket Exchange contract
  const EXCHANGE = "0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E";
  const exchangeAbi = ["function balanceOf(address, address) view returns (uint256)"];
  try {
    const exchange = new ethers.Contract(EXCHANGE, exchangeAbi, provider);
    const exchangeBalance = await exchange.balanceOf(USDC_ADDRESS, WALLET);
    console.log("Polymarket Exchange USDC:", ethers.utils.formatUnits(exchangeBalance, 6));
  } catch (e) {
    console.log("Polymarket Exchange: (can't read directly)");
  }
}

main().catch(console.error);
