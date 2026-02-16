import 'dotenv/config';
import { redeemAllWinningPositions } from './redemption.js';

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('PRIVATE_KEY not found in .env');
    process.exit(1);
  }
  
  const result = await redeemAllWinningPositions(privateKey);
  console.log('\nFinal Result:', JSON.stringify(result, null, 2));
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
