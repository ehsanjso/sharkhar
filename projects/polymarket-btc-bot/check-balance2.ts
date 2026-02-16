import { ClobClient } from '@polymarket/clob-client';
import { Wallet, ethers } from 'ethers';
import 'dotenv/config';

async function checkBalance() {
  const signer = new Wallet(process.env.PRIVATE_KEY!);
  console.log('EOA Address:', signer.address);
  
  // Check on-chain USDC.e balance on Polygon
  const provider = new ethers.providers.JsonRpcProvider('https://polygon-rpc.com');
  const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC.e (bridged)
  const USDC_NATIVE = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'; // Native USDC
  
  const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];
  const usdcE = new ethers.Contract(USDC_E, ERC20_ABI, provider);
  const usdcNative = new ethers.Contract(USDC_NATIVE, ERC20_ABI, provider);
  
  const balanceE = await usdcE.balanceOf(signer.address);
  const balanceNative = await usdcNative.balanceOf(signer.address);
  
  console.log('USDC.e balance:', ethers.utils.formatUnits(balanceE, 6));
  console.log('Native USDC balance:', ethers.utils.formatUnits(balanceNative, 6));
  
  // Also check conditional tokens (CTF)
  const CTF = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
  const CTF_ABI = ['function balanceOf(address, uint256) view returns (uint256)'];
  
  // Now let's try the CLOB balance endpoint properly
  try {
    const client = new ClobClient(
      'https://clob.polymarket.com',
      137,
      signer
    );
    
    const apiCreds = await client.createOrDeriveApiKey();
    
    const authClient = new ClobClient(
      'https://clob.polymarket.com',
      137,
      signer,
      apiCreds,
      0
    );
    
    // Get balance with asset type
    const balanceCollateral = await authClient.getBalanceAllowance({ asset_type: 'COLLATERAL' });
    console.log('Collateral Balance:', JSON.stringify(balanceCollateral, null, 2));
  } catch (e: any) {
    console.log('CLOB error:', e.message);
  }
}

checkBalance().catch(e => console.error('Error:', e.message));
