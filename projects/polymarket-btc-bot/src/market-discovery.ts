/**
 * Market Discovery for Crypto Candle Markets
 * Finds BTC, ETH, SOL, XRP up/down markets across all timeframes
 */

import { CryptoAsset, Timeframe, CandleMarket, timeframeToDuration } from './types-multi';

const GAMMA_API = 'https://gamma-api.polymarket.com';

// Asset to slug prefix mapping
const ASSET_SLUGS: Record<CryptoAsset, string> = {
  'BTC': 'btc',
  'ETH': 'eth',
  'SOL': 'sol',
};

// Timeframe to slug suffix mapping  
const TIMEFRAME_SLUGS: Record<Timeframe, string> = {
  '5min': '5m',
  '15min': '15m',
  '1hr': '1h',
  '4hr': '4h',
  '1day': '1d',
};

// Polymarket crypto page categories
const CATEGORY_URLS: Record<Timeframe, string> = {
  '5min': '/crypto/5M',
  '15min': '/crypto/15M',
  '1hr': '/crypto/hourly',
  '4hr': '/crypto/4hour',
  '1day': '/crypto/daily',
};

export interface DiscoveredMarket {
  eventId: string;
  slug: string;
  title: string;
  asset: CryptoAsset;
  timeframe: Timeframe;
  startTime: Date;
  endTime: Date;
  upTokenId: string;
  downTokenId: string;
  upPrice: number;
  downPrice: number;
  isLive: boolean;
}

/**
 * Discover all active candle markets
 */
export async function discoverCandleMarkets(
  assets: CryptoAsset[] = ['BTC', 'ETH', 'SOL'],
  timeframes: Timeframe[] = ['5min', '15min', '1hr']
): Promise<DiscoveredMarket[]> {
  const markets: DiscoveredMarket[] = [];
  const seenSlugs = new Set<string>();

  // Fetch all events and strictly filter for crypto up/down markets
  try {
    const response = await fetch(
      `${GAMMA_API}/events?active=true&closed=false&limit=500`
    );
    const events: any[] = await response.json();
    
    for (const event of events) {
      const slug = (event.slug || '').toLowerCase();
      const title = (event.title || '').toLowerCase();
      
      // STRICT check: Must have "updown" in slug OR "up or down" in title
      // AND must be about a crypto asset price
      const isUpDownMarket = slug.includes('updown') || title.includes('up or down');
      if (!isUpDownMarket) continue;
      
      // Check each asset
      for (const asset of assets) {
        const assetSlug = ASSET_SLUGS[asset]?.toLowerCase();
        const assetNames = getAssetNames(asset);
        
        // Must explicitly mention the asset
        const hasAsset = assetNames.some(name => 
          slug.includes(name.toLowerCase()) || title.includes(name.toLowerCase())
        );
        if (!hasAsset) continue;
        
        // Determine timeframe from slug or title
        for (const timeframe of timeframes) {
          const tfSlug = TIMEFRAME_SLUGS[timeframe];
          const tfLabels = getTimeframeLabels(timeframe);
          
          const hasTimeframe = tfLabels.some(label =>
            slug.includes(label.toLowerCase()) || title.includes(label.toLowerCase())
          );
          if (!hasTimeframe) continue;
          
          // Unique key to avoid duplicates
          const key = `${asset}-${timeframe}-${event.id}`;
          if (seenSlugs.has(key)) continue;
          seenSlugs.add(key);
          
          const market = parseEventToMarket(event, asset, timeframe);
          if (market) {
            markets.push(market);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch events:', error);
  }

  return markets;
}

function getAssetNames(asset: CryptoAsset): string[] {
  const names: Record<CryptoAsset, string[]> = {
    'BTC': ['btc', 'bitcoin'],
    'ETH': ['eth', 'ethereum'],
    'SOL': ['sol', 'solana'],
  };
  return names[asset] || [asset.toLowerCase()];
}

function getTimeframeLabels(tf: Timeframe): string[] {
  const labels: Record<Timeframe, string[]> = {
    '5min': ['5m', '5 min', '5-min', '5min'],
    '15min': ['15m', '15 min', '15-min', '15min'],
    '1hr': ['1h', '1 hour', 'hourly', '1hr'],
    '4hr': ['4h', '4 hour', '4hr'],
    '1day': ['1d', 'daily', '1day', '24h'],
  };
  return labels[tf] || [tf];
}

/**
 * Parse a Gamma API event into our market structure
 */
function parseEventToMarket(
  event: any,
  providedAsset?: CryptoAsset,
  providedTimeframe?: Timeframe
): DiscoveredMarket | null {
  try {
    if (!event.markets || event.markets.length === 0) {
      return null;
    }

    const slug = (event.slug || '').toLowerCase();
    const title = (event.title || '').toLowerCase();
    
    // Detect asset from slug
    let asset: CryptoAsset;
    if (slug.startsWith('btc-') || title.includes('bitcoin')) {
      asset = 'BTC';
    } else if (slug.startsWith('eth-') || title.includes('ethereum')) {
      asset = 'ETH';
    } else if (slug.startsWith('sol-') || title.includes('solana')) {
      asset = 'SOL';
    } else if (providedAsset) {
      asset = providedAsset;
    } else {
      return null; // Can't determine asset
    }
    
    // Detect timeframe from slug
    let timeframe: Timeframe;
    if (slug.includes('-5m-') || title.includes('5 min') || title.includes('5-min')) {
      timeframe = '5min';
    } else if (slug.includes('-15m-') || title.includes('15 min') || title.includes('15-min')) {
      timeframe = '15min';
    } else if (slug.includes('-1h-') || title.includes('1 hour') || title.includes('hourly')) {
      timeframe = '1hr';
    } else if (slug.includes('-4h-') || title.includes('4 hour')) {
      timeframe = '4hr';
    } else if (slug.includes('-1d-') || title.includes('daily') || title.includes('24 hour')) {
      timeframe = '1day';
    } else if (providedTimeframe) {
      timeframe = providedTimeframe;
    } else {
      return null; // Can't determine timeframe
    }

    const marketData = event.markets[0];
    const tokenIds = marketData.clobTokenIds || [];
    const outcomes = JSON.parse(marketData.outcomes || '["Up","Down"]');
    const prices = JSON.parse(marketData.outcomePrices || '[0.5,0.5]');
    
    if (tokenIds.length < 2) {
      return null;
    }

    // Determine which token is Up vs Down
    let upIndex = outcomes.findIndex((o: string) => o.toLowerCase().includes('up'));
    let downIndex = outcomes.findIndex((o: string) => o.toLowerCase().includes('down'));
    
    if (upIndex === -1) upIndex = 0;
    if (downIndex === -1) downIndex = 1;

    const startTime = event.startTime 
      ? new Date(event.startTime) 
      : new Date();
    const endTime = event.endTime 
      ? new Date(event.endTime) 
      : new Date(startTime.getTime() + timeframeToDuration(timeframe) * 60000);

    return {
      eventId: event.id?.toString() || event.slug,
      slug: event.slug,
      title: event.title,
      asset,
      timeframe,
      startTime,
      endTime,
      upTokenId: tokenIds[upIndex],
      downTokenId: tokenIds[downIndex],
      upPrice: parseFloat(prices[upIndex]) || 0.5,
      downPrice: parseFloat(prices[downIndex]) || 0.5,
      isLive: event.active && !event.closed,
    };
  } catch (error) {
    return null;
  }
}

function getTimeframeLabel(tf: Timeframe): string {
  const labels: Record<Timeframe, string> = {
    '5min': '5 min',
    '15min': '15 min',
    '1hr': '1 hour',
    '4hr': '4 hour',
    '1day': 'daily',
  };
  return labels[tf];
}

/**
 * Fetch market details from a specific event slug
 */
export async function fetchMarketBySlug(slug: string): Promise<DiscoveredMarket | null> {
  try {
    const response = await fetch(`${GAMMA_API}/events?slug=${slug}`);
    const events: any[] = await response.json();
    
    if (events.length === 0) return null;
    
    return parseEventToMarket(events[0]);
  } catch (error) {
    return null;
  }
}

/**
 * Watch for new markets being created
 */
export async function watchForNewMarkets(
  assets: CryptoAsset[],
  timeframes: Timeframe[],
  onNewMarket: (market: DiscoveredMarket) => void,
  intervalMs: number = 30000
): Promise<() => void> {
  const seenMarkets = new Set<string>();
  
  const check = async () => {
    const markets = await discoverCandleMarkets(assets, timeframes);
    
    for (const market of markets) {
      if (!seenMarkets.has(market.eventId) && market.isLive) {
        seenMarkets.add(market.eventId);
        onNewMarket(market);
      }
    }
  };
  
  // Initial check
  await check();
  
  // Periodic checks
  const interval = setInterval(check, intervalMs);
  
  // Return cleanup function
  return () => clearInterval(interval);
}

/**
 * Discover markets by fetching from Polymarket's crypto category pages
 * This is needed because Gamma API doesn't index the candle markets
 */
export async function discoverFromPolymarket(
  timeframe: Timeframe
): Promise<DiscoveredMarket[]> {
  const markets: DiscoveredMarket[] = [];
  const categoryUrl = CATEGORY_URLS[timeframe];
  
  if (!categoryUrl) return markets;
  
  try {
    // Fetch the HTML page
    const response = await fetch(`https://polymarket.com${categoryUrl}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Accept': 'text/html,application/json',
      }
    });
    
    const html = await response.text();
    
    // Extract event slugs from the HTML
    // Pattern: /event/{slug} where slug contains updown
    const slugRegex = /\/event\/((?:btc|eth|sol|xrp)-updown-\d+m?-\d+)/gi;
    const slugs: string[] = [];
    let match;
    while ((match = slugRegex.exec(html)) !== null) {
      if (!slugs.includes(match[1])) {
        slugs.push(match[1]);
      }
    }
    
    // Fetch details for each discovered slug
    for (const slug of slugs) {
      const market = await fetchMarketBySlug(slug);
      if (market) {
        markets.push(market);
      }
    }
  } catch (error) {
    console.error(`Failed to discover from ${categoryUrl}:`, error);
  }
  
  return markets;
}

/**
 * Discover all markets across all timeframes
 */
export async function discoverAllMarkets(
  assets: CryptoAsset[] = ['BTC', 'ETH', 'SOL'],
  timeframes: Timeframe[] = ['5min', '15min', '1hr']
): Promise<DiscoveredMarket[]> {
  const allMarkets: DiscoveredMarket[] = [];
  
  // First try the standard API discovery
  const apiMarkets = await discoverCandleMarkets(assets, timeframes);
  allMarkets.push(...apiMarkets);
  
  // Then try web scraping for each timeframe
  for (const tf of timeframes) {
    const webMarkets = await discoverFromPolymarket(tf);
    
    // Add markets not already found
    for (const m of webMarkets) {
      if (assets.includes(m.asset) && !allMarkets.find(x => x.slug === m.slug)) {
        allMarkets.push(m);
      }
    }
  }
  
  return allMarkets;
}

// CLI test
const isMainModule = process.argv[1]?.includes('market-discovery');
if (isMainModule) {
  (async () => {
    console.log('🔍 Discovering crypto candle markets...\n');
    
    const markets = await discoverAllMarkets(
      ['BTC', 'ETH', 'SOL'],
      ['5min', '15min', '1hr']
    );
    
    console.log(`Found ${markets.length} markets:\n`);
    
    for (const m of markets) {
      console.log(`${m.asset} ${m.timeframe} - ${m.title}`);
      console.log(`  Slug: ${m.slug}`);
      console.log(`  Up: ${(m.upPrice * 100).toFixed(1)}% | Down: ${(m.downPrice * 100).toFixed(1)}%`);
      console.log(`  Live: ${m.isLive}`);
      console.log('');
    }
  })();
}
