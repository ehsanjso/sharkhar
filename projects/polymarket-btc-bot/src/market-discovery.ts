/**
 * Market Discovery for Crypto Candle Markets
 * Finds BTC, ETH, SOL, XRP up/down markets across all timeframes
 * 
 * Fixed issues:
 * - Safe JSON parsing
 * - Request timeouts
 * - Better error boundaries
 * - Memory leak prevention in watcher
 */

import { CryptoAsset, Timeframe, CandleMarket, timeframeToDuration } from './types-multi';

const GAMMA_API = 'https://gamma-api.polymarket.com';
const REQUEST_TIMEOUT_MS = 10000;

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
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Safe JSON parse
 */
function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    const parsed = JSON.parse(text);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch {
    return fallback;
  }
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

  try {
    const response = await fetchWithTimeout(
      `${GAMMA_API}/events?active=true&closed=false&limit=500`
    );
    
    if (!response.ok) {
      console.error(`Failed to fetch events: HTTP ${response.status}`);
      return markets;
    }
    
    const text = await response.text();
    const events = safeJsonParse<any[]>(text, []);
    
    if (!Array.isArray(events)) {
      console.error('Events response is not an array');
      return markets;
    }
    
    for (const event of events) {
      if (!event || typeof event !== 'object') continue;
      
      const slug = (event.slug || '').toLowerCase();
      const title = (event.title || '').toLowerCase();
      
      // STRICT check: Must have "updown" in slug OR "up or down" in title
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
  } catch (error: any) {
    console.error('Failed to discover markets:', error.message);
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
    if (!event || !event.markets || !Array.isArray(event.markets) || event.markets.length === 0) {
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
      return null;
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
      return null;
    }

    const marketData = event.markets[0];
    if (!marketData) return null;
    
    const tokenIds = marketData.clobTokenIds || [];
    
    // Safe parse outcomes and prices
    const outcomes = safeJsonParse<string[]>(
      typeof marketData.outcomes === 'string' ? marketData.outcomes : JSON.stringify(marketData.outcomes || []),
      ['Up', 'Down']
    );
    const prices = safeJsonParse<number[]>(
      typeof marketData.outcomePrices === 'string' ? marketData.outcomePrices : JSON.stringify(marketData.outcomePrices || []),
      [0.5, 0.5]
    );
    
    if (!Array.isArray(tokenIds) || tokenIds.length < 2) {
      return null;
    }

    // Determine which token is Up vs Down
    let upIndex = outcomes.findIndex((o: any) => 
      typeof o === 'string' && o.toLowerCase().includes('up')
    );
    let downIndex = outcomes.findIndex((o: any) => 
      typeof o === 'string' && o.toLowerCase().includes('down')
    );
    
    if (upIndex === -1) upIndex = 0;
    if (downIndex === -1) downIndex = 1;
    
    if (!tokenIds[upIndex] || !tokenIds[downIndex]) {
      return null;
    }

    const startTime = event.startTime 
      ? new Date(event.startTime) 
      : new Date();
    const endTime = event.endTime 
      ? new Date(event.endTime) 
      : new Date(startTime.getTime() + timeframeToDuration(timeframe) * 60000);

    return {
      eventId: String(event.id || event.slug || ''),
      slug: event.slug || '',
      title: event.title || '',
      asset,
      timeframe,
      startTime,
      endTime,
      upTokenId: tokenIds[upIndex],
      downTokenId: tokenIds[downIndex],
      upPrice: parseFloat(String(prices[upIndex])) || 0.5,
      downPrice: parseFloat(String(prices[downIndex])) || 0.5,
      isLive: Boolean(event.active && !event.closed),
    };
  } catch (error: any) {
    console.error('Error parsing event:', error.message);
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
  if (!slug) return null;
  
  try {
    const response = await fetchWithTimeout(`${GAMMA_API}/events?slug=${encodeURIComponent(slug)}`);
    
    if (!response.ok) {
      return null;
    }
    
    const text = await response.text();
    const events = safeJsonParse<any[]>(text, []);
    
    if (!Array.isArray(events) || events.length === 0) {
      return null;
    }
    
    return parseEventToMarket(events[0]);
  } catch (error: any) {
    console.error(`Failed to fetch market ${slug}:`, error.message);
    return null;
  }
}

/**
 * Watch for new markets being created
 * Returns cleanup function
 */
export function watchForNewMarkets(
  assets: CryptoAsset[],
  timeframes: Timeframe[],
  onNewMarket: (market: DiscoveredMarket) => void,
  intervalMs: number = 30000
): () => void {
  const seenMarkets = new Set<string>();
  let stopped = false;
  let timeoutId: NodeJS.Timeout | null = null;
  
  const check = async () => {
    if (stopped) return;
    
    try {
      const markets = await discoverCandleMarkets(assets, timeframes);
      
      for (const market of markets) {
        const key = market.eventId || market.slug;
        if (!seenMarkets.has(key) && market.isLive) {
          seenMarkets.add(key);
          try {
            onNewMarket(market);
          } catch (error: any) {
            console.error('Error in onNewMarket callback:', error.message);
          }
        }
      }
    } catch (error: any) {
      console.error('Error in market watcher:', error.message);
    }
    
    // Schedule next check
    if (!stopped) {
      timeoutId = setTimeout(check, intervalMs);
    }
  };
  
  // Initial check
  check();
  
  // Return cleanup function
  return () => {
    stopped = true;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    seenMarkets.clear();
  };
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
    const response = await fetchWithTimeout(`https://polymarket.com${categoryUrl}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Accept': 'text/html,application/json',
      }
    });
    
    if (!response.ok) {
      return markets;
    }
    
    const html = await response.text();
    
    // Extract event slugs from the HTML
    const slugRegex = /\/event\/((?:btc|eth|sol|xrp)-updown-\d+m?-\d+)/gi;
    const slugs: string[] = [];
    let match;
    while ((match = slugRegex.exec(html)) !== null) {
      if (!slugs.includes(match[1])) {
        slugs.push(match[1]);
      }
    }
    
    // Fetch details for each discovered slug (with concurrency limit)
    const CONCURRENT_LIMIT = 3;
    for (let i = 0; i < slugs.length; i += CONCURRENT_LIMIT) {
      const batch = slugs.slice(i, i + CONCURRENT_LIMIT);
      const results = await Promise.allSettled(
        batch.map(slug => fetchMarketBySlug(slug))
      );
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          markets.push(result.value);
        }
      }
    }
  } catch (error: any) {
    console.error(`Failed to discover from ${categoryUrl}:`, error.message);
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
  const seenSlugs = new Set<string>();
  
  // First try the standard API discovery
  try {
    const apiMarkets = await discoverCandleMarkets(assets, timeframes);
    for (const m of apiMarkets) {
      const key = m.slug || m.eventId;
      if (!seenSlugs.has(key)) {
        seenSlugs.add(key);
        allMarkets.push(m);
      }
    }
  } catch (error: any) {
    console.error('API discovery failed:', error.message);
  }
  
  // Then try web scraping for each timeframe (in parallel with limit)
  try {
    const webResults = await Promise.allSettled(
      timeframes.map(tf => discoverFromPolymarket(tf))
    );
    
    for (const result of webResults) {
      if (result.status === 'fulfilled') {
        for (const m of result.value) {
          const key = m.slug || m.eventId;
          if (assets.includes(m.asset) && !seenSlugs.has(key)) {
            seenSlugs.add(key);
            allMarkets.push(m);
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Web discovery failed:', error.message);
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
