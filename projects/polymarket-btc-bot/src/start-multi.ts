#!/usr/bin/env node
/**
 * Start the Multi-Asset Polymarket Bot
 * 
 * Usage:
 *   npx tsx src/start-multi.ts
 *   npx tsx src/start-multi.ts --assets BTC,ETH --timeframes 5min,15min
 */

import 'dotenv/config';
import { MultiAssetBot } from './multi-bot';
import { CryptoAsset, Timeframe, createDefaultConfig } from './types-multi';

// Parse CLI args
const args = process.argv.slice(2);
const config = createDefaultConfig(process.env.DRY_RUN !== 'false');

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--assets' && args[i + 1]) {
    config.assets = args[i + 1].split(',') as CryptoAsset[];
    i++;
  }
  if (args[i] === '--timeframes' && args[i + 1]) {
    config.timeframes = args[i + 1].split(',') as Timeframe[];
    i++;
  }
  if (args[i] === '--live') {
    config.dryRun = false;
  }
  if (args[i] === '--no-news') {
    config.useNewsResearch = false;
  }
}

// Validate
if (!process.env.PRIVATE_KEY && !config.dryRun) {
  console.error('❌ PRIVATE_KEY required for live trading');
  process.exit(1);
}

console.log(`
╔═══════════════════════════════════════════════════════════╗
║           MULTI-ASSET POLYMARKET BOT                      ║
╠═══════════════════════════════════════════════════════════╣
║  Mode: ${config.dryRun ? 'DRY RUN (paper trading)' : '🔥 LIVE TRADING'}                      ║
║  Assets: ${config.assets.join(', ')}                                        
║  Timeframes: ${config.timeframes.join(', ')}                               
║  News Research: ${config.useNewsResearch ? 'ON' : 'OFF'}                                   
╚═══════════════════════════════════════════════════════════╝
`);

const bot = new MultiAssetBot(config);

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️ Shutting down...');
  bot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  bot.stop();
  process.exit(0);
});

// Start
bot.start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
