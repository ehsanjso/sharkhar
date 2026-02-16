import { Wallet, ethers } from 'ethers';
import 'dotenv/config';

async function approveUSDC() {
  // Use quicknode public endpoint
  const provider = new ethers.providers.StaticJsonRpcProvider(
    'https://rpc-mainnet.matic.quiknode.pro',
    { chainId: 137, name: 'polygon' }
  );
  
  const signer = new Wallet(process.env.PRIVATE_KEY!, provider);
  
  console.log('Wallet:', signer.address);
  
  // Native USDC on Polygon
  const USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
  
  // Polymarket contracts that need approval
  const POLYMARKET_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';
  const POLYMARKET_NEG_RISK_EXCHANGE = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
  const POLYMARKET_NEG_RISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296';
  
  const ERC20_ABI = [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address) view returns (uint256)'
  ];
  
  const usdc = new ethers.Contract(USDC, ERC20_ABI, signer);
  
  // Check current allowances first
  console.log('\nChecking current allowances...');
  const allowance1 = await usdc.allowance(signer.address, POLYMARKET_EXCHANGE);
  const allowance2 = await usdc.allowance(signer.address, POLYMARKET_NEG_RISK_EXCHANGE);
  const allowance3 = await usdc.allowance(signer.address, POLYMARKET_NEG_RISK_ADAPTER);
  
  console.log('Exchange allowance:', ethers.utils.formatUnits(allowance1, 6));
  console.log('Neg Risk Exchange allowance:', ethers.utils.formatUnits(allowance2, 6));
  console.log('Neg Risk Adapter allowance:', ethers.utils.formatUnits(allowance3, 6));
  
  const balance = await usdc.balanceOf(signer.address);
  console.log('\nUSDC Balance:', ethers.utils.formatUnits(balance, 6));
  
  const maxApproval = ethers.constants.MaxUint256;
  
  // Only approve if not already approved
  if (allowance1.eq(0)) {
    console.log('\nApproving Polymarket Exchange...');
    const tx1 = await usdc.approve(POLYMARKET_EXCHANGE, maxApproval, { gasLimit: 100000 });
    console.log('TX1:', tx1.hash);
    await tx1.wait();
    console.log('✅ Exchange approved');
  } else {
    console.log('✅ Exchange already approved');
  }
  
  if (allowance2.eq(0)) {
    console.log('\nApproving Neg Risk Exchange...');
    const tx2 = await usdc.approve(POLYMARKET_NEG_RISK_EXCHANGE, maxApproval, { 
      gasLimit: 100000,
      maxFeePerGas: ethers.utils.parseUnits('100', 'gwei'),
      maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei')
    });
    console.log('TX2:', tx2.hash);
    await tx2.wait();
    console.log('✅ Neg Risk Exchange approved');
  } else {
    console.log('✅ Neg Risk Exchange already approved');
  }
  
  if (allowance3.eq(0)) {
    console.log('\nApproving Neg Risk Adapter...');
    const tx3 = await usdc.approve(POLYMARKET_NEG_RISK_ADAPTER, maxApproval, { 
      gasLimit: 100000,
      maxFeePerGas: ethers.utils.parseUnits('100', 'gwei'),
      maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei')
    });
    console.log('TX3:', tx3.hash);
    await tx3.wait();
    console.log('✅ Neg Risk Adapter approved');
  } else {
    console.log('✅ Neg Risk Adapter already approved');
  }
  
  console.log('\n🎉 All approvals complete! Your bot can now trade with $' + ethers.utils.formatUnits(balance, 6));
}

approveUSDC().catch(e => console.error('Error:', e.message));
