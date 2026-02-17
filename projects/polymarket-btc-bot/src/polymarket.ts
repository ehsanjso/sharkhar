import { ClobClient, Side } from '@polymarket/clob-client';
import { Wallet } from 'ethers';
import { BTCMarket, MarketOdds, OrderResult, BotConfig } from './types';

/**
 * Polymarket API Client
 * 
 * Fixed issues:
 * - Better null checks for API responses
 * - Proper error handling for JSON parsing
 * - Retry logic for transient failures
 * - Request timeouts
 */

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 10000;

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
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Retry wrapper for API calls
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error.status && error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Safe JSON parse with error handling
 */
function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export class PolymarketClient {
  private client: ClobClient | null = null;
  private config: BotConfig;
  private initialized = false;
  private initializing = false;

  constructor(config: BotConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    // Prevent concurrent initialization
    if (this.initializing) {
      // Wait for ongoing initialization
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.initializing = true;
    
    try {
      if (!this.config.privateKey) {
        throw new Error('Private key is required');
      }
      
      const signer = new Wallet(this.config.privateKey);
      
      // Create temp client to get API credentials
      const tempClient = new ClobClient(
        this.config.polymarketHost,
        this.config.chainId,
        signer
      );
      
      const apiCreds = await tempClient.createOrDeriveApiKey();
      
      // Create authenticated client
      this.client = new ClobClient(
        this.config.polymarketHost,
        this.config.chainId,
        signer,
        apiCreds,
        0 // signature type
      );

      this.initialized = true;
      console.log('✅ Polymarket client initialized');
    } catch (error: any) {
      console.error('❌ Failed to initialize Polymarket client:', error.message);
      throw error;
    } finally {
      this.initializing = false;
    }
  }

  async getMarketOdds(tokenId: string): Promise<{ price: number }> {
    if (!tokenId) {
      return { price: 0.5 };
    }
    
    return withRetry(async () => {
      const response = await fetchWithTimeout(
        `${this.config.polymarketHost}/price?token_id=${tokenId}&side=buy`
      );
      
      if (!response.ok) {
        throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status });
      }
      
      const text = await response.text();
      const data = safeJsonParse(text, { price: 0.5 });
      
      return {
        price: typeof data.price === 'number' ? data.price : parseFloat(data.price || '0.5'),
      };
    });
  }

  async getBTCMarketOdds(market: BTCMarket): Promise<MarketOdds> {
    if (!market.upTokenId || !market.downTokenId) {
      return {
        upPrice: 0.5,
        downPrice: 0.5,
        upProbability: 0.5,
        downProbability: 0.5,
      };
    }
    
    try {
      const [upRes, downRes] = await Promise.all([
        this.getMarketOdds(market.upTokenId),
        this.getMarketOdds(market.downTokenId),
      ]);

      const upPrice = parseFloat(upRes.price.toString()) || 0.5;
      const downPrice = parseFloat(downRes.price.toString()) || 0.5;

      return {
        upPrice,
        downPrice,
        upProbability: upPrice,
        downProbability: downPrice,
      };
    } catch (error: any) {
      console.error('Error fetching market odds:', error.message);
      return {
        upPrice: 0.5,
        downPrice: 0.5,
        upProbability: 0.5,
        downProbability: 0.5,
      };
    }
  }

  async placeMakerOrder(
    tokenId: string,
    price: number,
    amount: number
  ): Promise<OrderResult> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }
    
    if (!tokenId) {
      return { success: false, error: 'Token ID is required' };
    }
    
    if (price <= 0 || price >= 1) {
      return { success: false, error: `Invalid price: ${price}` };
    }
    
    if (amount <= 0) {
      return { success: false, error: `Invalid amount: ${amount}` };
    }

    if (this.config.dryRun) {
      const shares = Math.floor(amount / price);
      console.log(`🔸 [DRY RUN] Would buy ${shares} shares at $${price.toFixed(2)}`);
      return {
        success: true,
        orderId: `dry-run-${Date.now()}`,
        shares,
        price,
      };
    }

    try {
      const size = Math.floor(amount / price);
      
      if (size <= 0) {
        return { success: false, error: 'Order size would be 0' };
      }
      
      const response = await this.client.createAndPostOrder({
        tokenID: tokenId,
        price,
        size,
        side: Side.BUY,
      });

      if (!response || !response.orderID) {
        return { success: false, error: 'Empty response from API' };
      }

      return {
        success: true,
        orderId: response.orderID,
        shares: size,
        price,
      };
    } catch (error: any) {
      console.error('Order failed:', error.message);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }

  async getOrderbook(tokenId: string): Promise<{ bids: any[]; asks: any[] }> {
    if (!tokenId) {
      return { bids: [], asks: [] };
    }
    
    try {
      const response = await fetchWithTimeout(
        `${this.config.polymarketHost}/book?token_id=${tokenId}`
      );
      
      if (!response.ok) {
        return { bids: [], asks: [] };
      }
      
      const text = await response.text();
      return safeJsonParse(text, { bids: [], asks: [] });
    } catch (error: any) {
      console.error('Error fetching orderbook:', error.message);
      return { bids: [], asks: [] };
    }
  }

  async getConditionId(marketId: string): Promise<string | null> {
    if (!marketId) {
      return null;
    }
    
    try {
      const response = await fetchWithTimeout(
        `${this.config.gammaApi}/markets/${marketId}`
      );
      
      if (!response.ok) {
        return null;
      }
      
      const text = await response.text();
      const market = safeJsonParse<{ conditionId?: string }>(text, {});
      
      return market.conditionId || null;
    } catch (error: any) {
      console.error('Error fetching condition ID:', error.message);
      return null;
    }
  }

  async findActiveBTCMarket(): Promise<BTCMarket | null> {
    try {
      const response = await fetchWithTimeout(
        `${this.config.gammaApi}/events?active=true&closed=false&limit=100`
      );
      
      if (!response.ok) {
        console.error(`Failed to fetch events: HTTP ${response.status}`);
        return null;
      }
      
      const text = await response.text();
      const events = safeJsonParse<any[]>(text, []);
      
      if (!Array.isArray(events)) {
        console.error('Events response is not an array');
        return null;
      }

      // Look for BTC up/down minute markets
      for (const event of events) {
        if (!event || typeof event !== 'object') continue;
        
        const title = (event.title || '').toLowerCase();
        if (
          (title.includes('btc') || title.includes('bitcoin')) &&
          (title.includes('up') || title.includes('down') || title.includes('minute'))
        ) {
          // Found a potential match
          const market = event.markets?.[0];
          if (!market) continue;
          
          // Safe parsing of market data
          const outcomes = safeJsonParse<string[]>(market.outcomes || '[]', []);
          const prices = safeJsonParse<number[]>(market.outcomePrices || '[]', []);
          const tokenIds = market.clobTokenIds || [];

          if (!Array.isArray(outcomes) || !Array.isArray(tokenIds) || tokenIds.length < 2) {
            continue;
          }

          const upIndex = outcomes.findIndex((o: string) => 
            typeof o === 'string' && (o.toLowerCase().includes('up') || o.toLowerCase() === 'yes')
          );
          const downIndex = outcomes.findIndex((o: string) => 
            typeof o === 'string' && (o.toLowerCase().includes('down') || o.toLowerCase() === 'no')
          );

          if (upIndex >= 0 && downIndex >= 0 && tokenIds[upIndex] && tokenIds[downIndex]) {
            return {
              marketId: market.id || '',
              upTokenId: tokenIds[upIndex],
              downTokenId: tokenIds[downIndex],
              openPrice: 0, // Will be set from BTC price feed
              currentPrice: 0,
              upProbability: parseFloat(String(prices[upIndex])) || 0.5,
              downProbability: parseFloat(String(prices[downIndex])) || 0.5,
              startTime: new Date(event.startTime || Date.now()),
              endTime: new Date(event.endTime || Date.now() + 15 * 60 * 1000),
              minutesSinceStart: 0,
            };
          }
        }
      }

      return null;
    } catch (error: any) {
      console.error('Error finding BTC market:', error.message);
      return null;
    }
  }
}
