/**
 * Utility to find BTC 15-minute markets on Polymarket
 * Run with: npx tsx src/find-markets.ts
 */
async function findBTCMarkets() {
    console.log('🔍 Searching for BTC markets on Polymarket...\n');
    const GAMMA_API = 'https://gamma-api.polymarket.com';
    try {
        // Fetch all active events
        const response = await fetch(`${GAMMA_API}/events?active=true&closed=false&limit=500`);
        const events = await response.json();
        console.log(`Found ${events.length} active events\n`);
        // Filter for BTC-related markets
        const btcEvents = events.filter((event) => {
            const title = (event.title || '').toLowerCase();
            const description = (event.description || '').toLowerCase();
            return (title.includes('btc') ||
                title.includes('bitcoin') ||
                description.includes('btc') ||
                description.includes('bitcoin') ||
                title.includes('minute') ||
                title.includes('up or down') ||
                title.includes('price'));
        });
        console.log(`Found ${btcEvents.length} BTC-related events:\n`);
        for (const event of btcEvents) {
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📌 ${event.title}`);
            console.log(`   ID: ${event.id}`);
            console.log(`   Slug: ${event.slug}`);
            console.log(`   Start: ${event.startTime || 'N/A'}`);
            console.log(`   End: ${event.endTime || 'N/A'}`);
            if (event.markets && event.markets.length > 0) {
                console.log(`   Markets:`);
                for (const market of event.markets) {
                    const outcomes = JSON.parse(market.outcomes || '[]');
                    const prices = JSON.parse(market.outcomePrices || '[]');
                    console.log(`     - ${market.question}`);
                    const tokenIds = Array.isArray(market.clobTokenIds) ? market.clobTokenIds : [market.clobTokenIds];
                    console.log(`       Token IDs: ${tokenIds.join(', ')}`);
                    outcomes.forEach((outcome, i) => {
                        console.log(`       ${outcome}: ${(parseFloat(prices[i] || 0) * 100).toFixed(1)}%`);
                    });
                }
            }
            console.log('');
        }
        // Also search for specific tags
        console.log('\n🏷️ Searching for relevant tags...\n');
        const tagsResponse = await fetch(`${GAMMA_API}/tags?limit=200`);
        const tags = await tagsResponse.json();
        const cryptoTags = tags.filter((tag) => {
            const label = (tag.label || '').toLowerCase();
            return (label.includes('crypto') ||
                label.includes('btc') ||
                label.includes('bitcoin') ||
                label.includes('price') ||
                label.includes('candle') ||
                label.includes('minute'));
        });
        console.log('Relevant tags:');
        for (const tag of cryptoTags) {
            console.log(`  - ${tag.label} (ID: ${tag.id})`);
        }
        // Check sports endpoint for crypto markets
        console.log('\n🎮 Checking sports endpoint...\n');
        const sportsResponse = await fetch(`${GAMMA_API}/sports`);
        const sports = await sportsResponse.json();
        const cryptoSports = sports.filter((sport) => {
            const name = (sport.sport || '').toLowerCase();
            return (name.includes('crypto') ||
                name.includes('btc') ||
                name.includes('bitcoin') ||
                name.includes('candle'));
        });
        if (cryptoSports.length > 0) {
            console.log('Crypto-related sports:');
            for (const sport of cryptoSports) {
                console.log(`  - ${sport.sport} (ID: ${sport.id})`);
                console.log(`    Series: ${sport.series}`);
                console.log(`    Tags: ${sport.tags}`);
            }
        }
        else {
            console.log('No crypto-specific sports found in sports endpoint');
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
}
findBTCMarkets();
//# sourceMappingURL=find-markets.js.map