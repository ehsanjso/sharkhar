import 'dotenv/config';
import { PolymarketBTCBot } from './bot';
import { BotConfig } from './types';

function loadConfig(): BotConfig {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  return {
    privateKey,
    totalBudget: parseFloat(process.env.TOTAL_BUDGET || '40'),
    minProbability: parseFloat(process.env.MIN_PROBABILITY || '0.60'),
    betSchedule: [
      { minute: 1, amount: parseFloat(process.env.BET_MINUTE_1 || '5') },
      { minute: 4, amount: parseFloat(process.env.BET_MINUTE_4 || '10') },
      { minute: 7, amount: parseFloat(process.env.BET_MINUTE_7 || '15') },
      { minute: 10, amount: parseFloat(process.env.BET_MINUTE_10 || '10') },
    ],
    dryRun: process.env.DRY_RUN !== 'false',
    chainId: parseInt(process.env.CHAIN_ID || '137'),
    polymarketHost: process.env.POLYMARKET_HOST || 'https://clob.polymarket.com',
    gammaApi: process.env.GAMMA_API || 'https://gamma-api.polymarket.com',
    wsUrl: process.env.WS_URL || 'wss://rtds.polymarket.com',
  };
}

async function main() {
  console.log('🚀 Starting Polymarket BTC Bot...\n');

  const config = loadConfig();

  console.log('📋 Configuration:');
  console.log(`   Budget: $${config.totalBudget}`);
  console.log(`   Min Probability: ${(config.minProbability * 100).toFixed(0)}%`);
  console.log(`   Dry Run: ${config.dryRun}`);
  console.log(`   Bet Schedule:`);
  config.betSchedule.forEach((b) => {
    console.log(`     - Minute ${b.minute}: $${b.amount}`);
  });
  console.log('');

  const bot = new PolymarketBTCBot(config);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n⚠️ Received SIGINT, shutting down...');
    bot.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n⚠️ Received SIGTERM, shutting down...');
    bot.stop();
    process.exit(0);
  });

  try {
    await bot.start();
  } catch (error) {
    console.error('❌ Bot failed to start:', error);
    process.exit(1);
  }
}

main();
