#!/usr/bin/env tsx
/**
 * Quick script to redeem all pending positions
 */

import { RedemptionService } from './redemption.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🔄 Starting redemption process...\n');
  
  const redemptionService = new RedemptionService();
  
  try {
    const result = await redemptionService.redeemAllPending();
    
    console.log('\n========================================');
    console.log('📊 REDEMPTION SUMMARY');
    console.log('========================================');
    console.log(`✅ Successful: ${result.successfulRedemptions}`);
    console.log(`❌ Failed: ${result.failedRedemptions}`);
    console.log(`💰 Total Redeemed: $${result.totalRedeemed.toFixed(2)}`);
    console.log(`💵 New Balance: $${result.newBalance.toFixed(2)}`);
    
    if (result.details.length > 0) {
      console.log('\n📋 Details:');
      for (const d of result.details) {
        const status = d.success ? '✅' : '❌';
        console.log(`  ${status} ${d.marketSlug}: $${d.amount.toFixed(2)}${d.error ? ` (${d.error})` : ''}`);
      }
    }
  } catch (e) {
    console.error('❌ Redemption failed:', e);
  }
}

main();
