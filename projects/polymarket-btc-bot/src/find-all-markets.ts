/**
 * Find all crypto candle markets (BTC, ETH, various timeframes)
 */

const GAMMA_API = 'https://gamma-api.polymarket.com';

async function findAllCryptoMarkets() {
  console.log('🔍 Searching for ALL crypto candle markets...\n');

  const response = await fetch(`${GAMMA_API}/events?active=true&closed=false&limit=1000`);
  const events: any[] = await response.json();

  console.log(`Total active events: ${events.length}\n`);

  // Search patterns
  const patterns = [
    'candle', 'minute', '5-min', '15-min', '1-hour', 
    'up or down', 'eth', 'ethereum', 'btc', 'bitcoin',
    'price movement', 'close above', 'close below'
  ];

  const relevantEvents = events.filter((event: any) => {
    const title = (event.title || '').toLowerCase();
    const desc = (event.description || '').toLowerCase();
    const combined = title + ' ' + desc;
    
    return patterns.some(p => combined.includes(p));
  });

  console.log(`Found ${relevantEvents.length} crypto-related events\n`);
  console.log('=' .repeat(60) + '\n');

  // Categorize by type
  const btcMarkets: any[] = [];
  const ethMarkets: any[] = [];
  const candleMarkets: any[] = [];
  const otherCrypto: any[] = [];

  for (const event of relevantEvents) {
    const title = (event.title || '').toLowerCase();
    
    if (title.includes('candle') || title.includes('minute') || title.includes('up or down')) {
      candleMarkets.push(event);
    } else if (title.includes('eth') || title.includes('ethereum')) {
      ethMarkets.push(event);
    } else if (title.includes('btc') || title.includes('bitcoin')) {
      btcMarkets.push(event);
    } else {
      otherCrypto.push(event);
    }
  }

  // Print candle markets first (most relevant)
  console.log('🕯️ CANDLE/MINUTE MARKETS (Short-term trading):');
  console.log('-'.repeat(60));
  for (const event of candleMarkets) {
    console.log(`\n📌 ${event.title}`);
    console.log(`   ID: ${event.id} | Slug: ${event.slug}`);
    if (event.markets) {
      for (const m of event.markets.slice(0, 5)) {
        const prices = JSON.parse(m.outcomePrices || '["0","0"]');
        console.log(`   → ${m.question}`);
        console.log(`     Yes: ${(parseFloat(prices[0]) * 100).toFixed(1)}% | No: ${(parseFloat(prices[1]) * 100).toFixed(1)}%`);
      }
    }
  }

  console.log('\n\n📊 ETH MARKETS:');
  console.log('-'.repeat(60));
  for (const event of ethMarkets.slice(0, 10)) {
    console.log(`\n📌 ${event.title}`);
    console.log(`   ID: ${event.id}`);
  }

  console.log('\n\n₿ BTC MARKETS (Long-term):');
  console.log('-'.repeat(60));
  for (const event of btcMarkets.slice(0, 10)) {
    console.log(`\n📌 ${event.title}`);
    console.log(`   ID: ${event.id}`);
  }

  // Summary
  console.log('\n\n📈 SUMMARY:');
  console.log('='.repeat(60));
  console.log(`Candle/Minute markets: ${candleMarkets.length}`);
  console.log(`ETH markets: ${ethMarkets.length}`);
  console.log(`BTC markets: ${btcMarkets.length}`);
  console.log(`Other crypto: ${otherCrypto.length}`);
}

findAllCryptoMarkets().catch(console.error);
