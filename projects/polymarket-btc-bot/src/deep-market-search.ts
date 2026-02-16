/**
 * Deep search for Polymarket crypto candle markets
 */

const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

async function deepSearch() {
  console.log('🔍 Deep searching for crypto candle markets...\n');

  // 1. Check all events for any short-term patterns
  console.log('1️⃣ Searching events with time-based patterns...');
  const eventsRes = await fetch(`${GAMMA_API}/events?active=true&closed=false&limit=1000`);
  const events: any[] = await eventsRes.json();
  
  const timePatterns = ['5 min', '15 min', '1 hour', 'hourly', 'daily', 'candle', 
                        'next 5', 'next 15', 'next hour', '5-minute', '15-minute'];
  
  for (const event of events) {
    const title = (event.title || '').toLowerCase();
    for (const pattern of timePatterns) {
      if (title.includes(pattern)) {
        console.log(`  Found: ${event.title}`);
        console.log(`    ID: ${event.id}, Slug: ${event.slug}`);
      }
    }
  }

  // 2. Check sports/leagues endpoint (candles might be categorized differently)
  console.log('\n2️⃣ Checking sports endpoint...');
  const sportsRes = await fetch(`${GAMMA_API}/sports`);
  const sports: any[] = await sportsRes.json();
  
  for (const sport of sports) {
    const name = (sport.sport || sport.name || '').toLowerCase();
    if (name.includes('crypto') || name.includes('candle') || name.includes('btc') || 
        name.includes('eth') || name.includes('price')) {
      console.log(`  Found sport: ${JSON.stringify(sport)}`);
    }
  }

  // 3. Check tags
  console.log('\n3️⃣ Checking tags...');
  const tagsRes = await fetch(`${GAMMA_API}/tags?limit=500`);
  const tags: any[] = await tagsRes.json();
  
  for (const tag of tags) {
    const label = (tag.label || '').toLowerCase();
    if (label.includes('crypto') || label.includes('candle') || label.includes('btc') || 
        label.includes('bitcoin') || label.includes('eth') || label.includes('price')) {
      console.log(`  Tag: ${tag.label} (id: ${tag.id})`);
      
      // Fetch events with this tag
      const tagEventsRes = await fetch(`${GAMMA_API}/events?tag=${tag.id}&limit=20`);
      const tagEvents: any[] = await tagEventsRes.json();
      if (tagEvents.length > 0) {
        console.log(`    Events with this tag: ${tagEvents.length}`);
        for (const e of tagEvents.slice(0, 3)) {
          console.log(`      - ${e.title}`);
        }
      }
    }
  }

  // 4. Try CLOB API for markets
  console.log('\n4️⃣ Checking CLOB API for active markets...');
  try {
    const clobRes = await fetch(`${CLOB_API}/markets`);
    const clobData = await clobRes.json();
    
    let candleCount = 0;
    const clobMarkets = Array.isArray(clobData) ? clobData : (clobData.data || []);
    
    for (const market of clobMarkets) {
      const question = (market.question || market.title || '').toLowerCase();
      if (question.includes('candle') || question.includes('minute') || 
          question.includes('btc') || question.includes('eth') ||
          question.includes('up or down')) {
        if (candleCount < 20) {
          console.log(`  Market: ${market.question || market.title}`);
          console.log(`    ID: ${market.condition_id || market.id}`);
          candleCount++;
        }
      }
    }
    console.log(`  Total candle-related in CLOB: ${candleCount}+`);
  } catch (e: any) {
    console.log(`  CLOB API error: ${e.message}`);
  }

  // 5. Search for specific slugs
  console.log('\n5️⃣ Trying known candle slug patterns...');
  const slugPatterns = [
    'btc-5-minute', 'btc-15-minute', 'bitcoin-candle', 
    'eth-5-minute', 'eth-15-minute', 'ethereum-candle',
    'crypto-candle', 'btc-up-or-down', 'eth-up-or-down'
  ];
  
  for (const slug of slugPatterns) {
    try {
      const res = await fetch(`${GAMMA_API}/events?slug=${slug}`);
      const data = await res.json();
      if (data && data.length > 0) {
        console.log(`  Found slug ${slug}: ${data[0].title}`);
      }
    } catch (e) {
      // Skip
    }
  }

  console.log('\n✅ Deep search complete');
}

deepSearch().catch(console.error);
