import 'dotenv/config';
import { RedemptionService } from './src/redemption.js';

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ PRIVATE_KEY not set');
  process.exit(1);
}

const service = new RedemptionService(privateKey);

console.log('🔍 Checking for redeemable positions...\n');
const result = await service.redeemAllPending();

console.log('\n📊 Summary:');
console.log(`  Total redeemed: $${result.totalRedeemed.toFixed(2)}`);
console.log(`  Successful: ${result.successfulRedemptions}`);
console.log(`  Failed: ${result.failedRedemptions}`);
console.log(`  New balance: $${result.newBalance.toFixed(2)}`);
