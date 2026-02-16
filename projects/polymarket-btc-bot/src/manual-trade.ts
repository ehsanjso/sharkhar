/**
 * Manual trading mode - use when you have specific market IDs
 * 
 * Usage:
 *   npx tsx src/manual-trade.ts <UP_TOKEN_ID> <DOWN_TOKEN_ID>
 * 
 * Example:
 *   npx tsx src/manual-trade.ts 12345... 67890...
 */

import 'dotenv/config';
import { PolymarketClient } from './polymarket';
import { BTCPriceTracker } from './btc-price';
import { TradingStrategy } from './strategy';
import { BotConfig, BTCMarket, TradingSession } from './types';

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
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
╔══════════════════════════════════════════════════╗
║     📊 POLYMARKET MANUAL TRADE                   ║
╚══════════════════════════════════════════════════╝

Usage: npx tsx src/manual-trade.ts <UP_TOKEN_ID> <DOWN_TOKEN_ID>

Example:
  npx tsx src/manual-trade.ts \\
    "12345678901234567890123456789012345678901234567890" \\
    "09876543210987654321098765432109876543210987654321"

You can find token IDs by:
1. Running: npx tsx src/find-markets.ts
2. Looking at Polymarket URLs
3. Using the Gamma API: https://gamma-api.polymarket.com/events

The bot will:
1. Connect to BTC price feed
2. Get current market odds
3. Decide UP or DOWN based on price movement
4. Scale in bets at minutes 1, 4, 7, 10
5. Only bet if probability ≥ 60%
    `);
    return;
  }

  const [upTokenId, downTokenId] = args;

  console.log(`
╔══════════════════════════════════════════════════╗
║     🤖 POLYMARKET MANUAL TRADE                   ║
╚══════════════════════════════════════════════════╝
  `);

  const config = loadConfig();

  console.log('📋 Configuration:');
  console.log(`   UP Token: ${upTokenId.substring(0, 20)}...`);
  console.log(`   DOWN Token: ${downTokenId.substring(0, 20)}...`);
  console.log(`   Budget: $${config.totalBudget}`);
  console.log(`   Min Probability: ${(config.minProbability * 100).toFixed(0)}%`);
  console.log(`   Dry Run: ${config.dryRun}`);
  console.log('');

  const polymarket = new PolymarketClient(config);
  const priceTracker = new BTCPriceTracker(config.wsUrl);
  const strategy = new TradingStrategy(config);

  // Initialize
  await polymarket.initialize();
  await priceTracker.connect();

  // Wait for initial price
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Create market object
  const market: BTCMarket = {
    marketId: 'manual-trade',
    upTokenId,
    downTokenId,
    openPrice: priceTracker.getPrice(),
    currentPrice: priceTracker.getPrice(),
    upProbability: 0,
    downProbability: 0,
    startTime: new Date(),
    endTime: new Date(Date.now() + 15 * 60 * 1000),
    minutesSinceStart: 0,
  };

  // Get current odds
  const odds = await polymarket.getBTCMarketOdds(market);
  market.upProbability = odds.upProbability;
  market.downProbability = odds.downProbability;

  priceTracker.setOpenPrice();

  console.log(`
┌─────────────────────────────────────────┐
│ 📈 MARKET STATUS                        │
├─────────────────────────────────────────┤
│ BTC Price: $${priceTracker.getPrice().toLocaleString()}
│ UP Probability: ${(odds.upProbability * 100).toFixed(1)}%
│ DOWN Probability: ${(odds.downProbability * 100).toFixed(1)}%
└─────────────────────────────────────────┘
  `);

  // Create session
  const session = strategy.createSession(market, priceTracker.getOpenPrice());

  // Trading loop
  let running = true;

  process.on('SIGINT', () => {
    console.log('\n\n⚠️ Stopping...');
    running = false;
  });

  const startTime = Date.now();

  while (running) {
    const minutesSinceStart = (Date.now() - startTime) / (60 * 1000);

    // Check if market ended
    if (minutesSinceStart >= 15) {
      console.log('\n\n⏰ Market ended!');
      break;
    }

    // Update market data
    market.currentPrice = priceTracker.getPrice();
    const currentOdds = await polymarket.getBTCMarketOdds(market);
    market.upProbability = currentOdds.upProbability;
    market.downProbability = currentOdds.downProbability;

    // Decide side if not locked
    if (!session.side && minutesSinceStart >= 1) {
      const side = strategy.decideSide(priceTracker, currentOdds);
      if (side) {
        session.side = side;
        session.lockedAt = new Date();
        console.log(`\n🔒 LOCKED IN: ${side}\n`);
      }
    }

    // Check for bets
    if (session.side) {
      const betToPlace = strategy.shouldBet(session, minutesSinceStart);

      if (betToPlace && !betToPlace.executed) {
        if (strategy.meetsThreshold(session, currentOdds)) {
          const tokenId = session.side === 'UP' ? upTokenId : downTokenId;
          const price = strategy.calculateMakerPrice(session, currentOdds);

          console.log(
            `\n💸 Placing bet: $${betToPlace.amount} on ${session.side} @ $${price.toFixed(2)}`
          );

          const result = await polymarket.placeMakerOrder(
            tokenId,
            price,
            betToPlace.amount
          );

          if (result.success) {
            betToPlace.executed = true;
            betToPlace.orderId = result.orderId;
            betToPlace.shares = result.shares;
            betToPlace.price = result.price;
            session.totalInvested += betToPlace.amount;
            session.totalShares += result.shares || 0;
            console.log(`✅ ${result.shares} shares @ $${price.toFixed(2)}\n`);
          } else {
            console.log(`❌ Order failed: ${result.error}\n`);
          }
        } else {
          console.log(
            `\n⏭️ Skipping bet at minute ${betToPlace.minute} - prob below threshold\n`
          );
          betToPlace.executed = true;
        }
      }
    }

    // Status update
    const btcChange = priceTracker.getPriceChange();
    process.stdout.write(
      `\r⏱️ Min ${minutesSinceStart.toFixed(1)} | ` +
        `BTC: $${market.currentPrice.toLocaleString()} (${btcChange >= 0 ? '+' : ''}$${btcChange.toFixed(2)}) | ` +
        `UP: ${(currentOdds.upProbability * 100).toFixed(1)}% | ` +
        `DOWN: ${(currentOdds.downProbability * 100).toFixed(1)}% | ` +
        `Side: ${session.side || 'DECIDING'}   `
    );

    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  // Print summary
  console.log(strategy.getSummary(session));

  priceTracker.disconnect();
}

main().catch(console.error);
