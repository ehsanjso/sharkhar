import { ClobClient } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import 'dotenv/config';

async function checkBalance() {
  const signer = new Wallet(process.env.PRIVATE_KEY!);
  console.log('EOA Address:', signer.address);
  
  const client = new ClobClient(
    'https://clob.polymarket.com',
    137,
    signer
  );
  
  // Get API creds
  const apiCreds = await client.createOrDeriveApiKey();
  console.log('API Key derived');
  
  const authClient = new ClobClient(
    'https://clob.polymarket.com',
    137,
    signer,
    apiCreds,
    0
  );
  
  // Get balance allowances
  const balance = await authClient.getBalanceAllowance();
  console.log('USDC Balance:', JSON.stringify(balance, null, 2));
}

checkBalance().catch(e => console.error('Error:', e.message));
