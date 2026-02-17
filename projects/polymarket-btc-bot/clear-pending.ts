import 'dotenv/config';
import { ethers } from 'ethers';

async function main() {
  // Try Tatum RPC which might be less restrictive
  const provider = new ethers.providers.StaticJsonRpcProvider(process.env.TATUM_RPC, 137);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
  console.log('Wallet:', wallet.address);
  
  const confirmedNonce = await provider.getTransactionCount(wallet.address, 'latest');
  const pendingNonce = await provider.getTransactionCount(wallet.address, 'pending');
  
  console.log('Confirmed nonce:', confirmedNonce);
  console.log('Pending nonce:', pendingNonce);
  
  if (pendingNonce > confirmedNonce) {
    console.log(`🔄 ${pendingNonce - confirmedNonce} pending transactions`);
    
    // Send replacement transaction with higher gas to clear the queue
    for (let nonce = confirmedNonce; nonce < pendingNonce; nonce++) {
      console.log(`Cancelling nonce ${nonce}...`);
      const tx = await wallet.sendTransaction({
        to: wallet.address,
        value: 0,
        nonce: nonce,
        maxFeePerGas: ethers.utils.parseUnits('2000', 'gwei'),
        maxPriorityFeePerGas: ethers.utils.parseUnits('100', 'gwei'),
        gasLimit: 21000,
      });
      console.log('  TX:', tx.hash);
    }
  } else {
    console.log('No pending transactions');
  }
}

main().catch(e => console.error('Error:', e.message));
