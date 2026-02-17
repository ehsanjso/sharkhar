/**
 * Swap USDC (native) to USDC.e (bridged) on Polygon
 * Uses Uniswap V3 router
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

// Polygon addresses
const USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';  // Native USDC
const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // Bridged USDC.e
const UNISWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Uniswap V3 SwapRouter

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const SWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
];

async function main() {
  const amount = parseFloat(process.argv[2] || '20');
  
  console.log(`\n🔄 USDC → USDC.e Swap on Polygon`);
  console.log(`   Amount: $${amount}`);
  console.log('');
  
  const provider = new ethers.providers.JsonRpcProvider('https://polygon.drpc.org');
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
  console.log(`Wallet: ${wallet.address}`);
  
  const usdc = new ethers.Contract(USDC, ERC20_ABI, wallet);
  const usdce = new ethers.Contract(USDC_E, ERC20_ABI, provider);
  const router = new ethers.Contract(UNISWAP_ROUTER, SWAP_ROUTER_ABI, wallet);
  
  // Check balances
  const usdcBal = await usdc.balanceOf(wallet.address);
  const usdceBal = await usdce.balanceOf(wallet.address);
  
  console.log(`\nBefore swap:`);
  console.log(`  USDC:   $${ethers.utils.formatUnits(usdcBal, 6)}`);
  console.log(`  USDC.e: $${ethers.utils.formatUnits(usdceBal, 6)}`);
  
  const amountIn = ethers.utils.parseUnits(amount.toString(), 6);
  
  if (usdcBal.lt(amountIn)) {
    console.error(`\n❌ Insufficient USDC balance. Have $${ethers.utils.formatUnits(usdcBal, 6)}, need $${amount}`);
    process.exit(1);
  }
  
  // Check and set allowance
  const allowance = await usdc.allowance(wallet.address, UNISWAP_ROUTER);
  if (allowance.lt(amountIn)) {
    console.log(`\n📝 Approving USDC spend...`);
    const approveTx = await usdc.approve(UNISWAP_ROUTER, ethers.constants.MaxUint256);
    console.log(`   Tx: ${approveTx.hash}`);
    await approveTx.wait();
    console.log(`   ✅ Approved`);
  }
  
  // Execute swap
  console.log(`\n🔄 Executing swap...`);
  
  const deadline = Math.floor(Date.now() / 1000) + 300; // 5 min deadline
  const amountOutMin = amountIn.mul(99).div(100); // 1% slippage tolerance (stablecoin pair)
  
  const params = {
    tokenIn: USDC,
    tokenOut: USDC_E,
    fee: 100, // 0.01% fee tier (stablecoin pair)
    recipient: wallet.address,
    deadline,
    amountIn,
    amountOutMinimum: amountOutMin,
    sqrtPriceLimitX96: 0,
  };
  
  try {
    // Get current gas price and add buffer
    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas?.mul(2) || ethers.utils.parseUnits('100', 'gwei');
    const maxPriorityFeePerGas = ethers.utils.parseUnits('50', 'gwei');
    
    const tx = await router.exactInputSingle(params, {
      gasLimit: 300000,
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
    console.log(`   Tx: ${tx.hash}`);
    console.log(`   Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
    
    // Check new balances
    const newUsdcBal = await usdc.balanceOf(wallet.address);
    const newUsdceBal = await usdce.balanceOf(wallet.address);
    
    console.log(`\nAfter swap:`);
    console.log(`  USDC:   $${ethers.utils.formatUnits(newUsdcBal, 6)}`);
    console.log(`  USDC.e: $${ethers.utils.formatUnits(newUsdceBal, 6)}`);
    
    const received = newUsdceBal.sub(usdceBal);
    console.log(`\n✅ Swapped $${amount} USDC → $${ethers.utils.formatUnits(received, 6)} USDC.e`);
    
  } catch (error: any) {
    console.error(`\n❌ Swap failed: ${error.message}`);
    
    // Try with higher fee tier if 0.01% pool doesn't exist
    if (error.message.includes('STF') || error.message.includes('revert')) {
      console.log(`\n🔄 Retrying with 0.05% fee tier...`);
      params.fee = 500;
      
      try {
        const feeData2 = await provider.getFeeData();
        const tx = await router.exactInputSingle(params, { 
          gasLimit: 300000,
          maxFeePerGas: feeData2.maxFeePerGas?.mul(2) || ethers.utils.parseUnits('100', 'gwei'),
          maxPriorityFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
        });
        console.log(`   Tx: ${tx.hash}`);
        await tx.wait();
        console.log(`   ✅ Success with 0.05% pool`);
      } catch (e2: any) {
        console.error(`   ❌ Also failed: ${e2.message}`);
      }
    }
  }
}

main().catch(console.error);
