/**
 * Multi-asset price tracker using Binance WebSocket
 * Tracks BTC, ETH, SOL prices in real-time
 * 
 * Fixed issues:
 * - Reconnection race condition prevention
 * - Proper cleanup on disconnect
 * - Better error handling
 * - Memory leak prevention
 */

import WebSocket from 'ws';
import { CryptoAsset, DEFAULT_PRICE_FEEDS } from './types-multi';

interface PriceData {
  price: number;
  openPrice: number;
  lastUpdate: Date;
  connected: boolean;
}

interface SocketState {
  ws: WebSocket | null;
  isConnecting: boolean;
  reconnectAttempts: number;
  reconnectTimeout: NodeJS.Timeout | null;
  pingInterval: NodeJS.Timeout | null;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const STALE_PRICE_THRESHOLD_MS = 30000;

export class MultiPriceTracker {
  private prices: Map<CryptoAsset, PriceData> = new Map();
  private socketStates: Map<CryptoAsset, SocketState> = new Map();
  private assets: CryptoAsset[];
  private isDisconnected = false;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(assets: CryptoAsset[] = ['BTC', 'ETH']) {
    this.assets = assets;
    
    // Initialize price data and socket states
    for (const asset of assets) {
      this.prices.set(asset, {
        price: 0,
        openPrice: 0,
        lastUpdate: new Date(),
        connected: false,
      });
      
      this.socketStates.set(asset, {
        ws: null,
        isConnecting: false,
        reconnectAttempts: 0,
        reconnectTimeout: null,
        pingInterval: null,
      });
    }
  }

  async connect(): Promise<void> {
    console.log(`🔌 Connecting to price feeds for: ${this.assets.join(', ')}`);
    
    // Fetch initial prices
    await this.fetchInitialPrices();
    
    // Connect WebSockets
    const connections = this.assets.map(asset => this.connectWebSocket(asset));
    await Promise.allSettled(connections);
    
    // Start backup polling
    this.startPolling();
    
    console.log('✅ All price feeds initialized');
  }

  private async fetchInitialPrices(): Promise<void> {
    const fetchPromises = this.assets.map(async (asset) => {
      const feed = DEFAULT_PRICE_FEEDS.find(f => f.asset === asset);
      if (!feed) return;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(feed.restUrl, { signal: controller.signal });
        clearTimeout(timeout);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data: any = await response.json();
        
        if (data && data.price) {
          const price = parseFloat(data.price);
          
          if (this.isValidPrice(asset, price)) {
            const priceData = this.prices.get(asset)!;
            priceData.price = price;
            priceData.lastUpdate = new Date();
            
            console.log(`  ${asset}: $${price.toLocaleString()}`);
          }
        }
      } catch (error: any) {
        console.error(`  Failed to fetch ${asset} price: ${error.message}`);
      }
    });
    
    await Promise.allSettled(fetchPromises);
  }

  /**
   * Basic price validation
   */
  private isValidPrice(asset: CryptoAsset, price: number): boolean {
    if (typeof price !== 'number' || isNaN(price) || price <= 0) {
      return false;
    }
    
    // Asset-specific sanity checks
    const ranges: Record<CryptoAsset, [number, number]> = {
      'BTC': [1000, 1000000],
      'ETH': [10, 100000],
      'SOL': [0.1, 10000],
    };
    
    const [min, max] = ranges[asset] || [0, Infinity];
    return price >= min && price <= max;
  }

  private async connectWebSocket(asset: CryptoAsset): Promise<void> {
    const state = this.socketStates.get(asset)!;
    
    // Prevent concurrent connection attempts
    if (state.isConnecting) {
      console.log(`⏳ ${asset}: Already connecting...`);
      return;
    }
    
    if (this.isDisconnected) {
      return;
    }
    
    const feed = DEFAULT_PRICE_FEEDS.find(f => f.asset === asset);
    if (!feed) return;

    state.isConnecting = true;
    
    // Cleanup any existing connection
    this.cleanupSocket(asset);
    
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(feed.wsUrl);
        state.ws = ws;
        
        const connectionTimeout = setTimeout(() => {
          if (state.isConnecting) {
            console.log(`⏳ ${asset}: Connection timeout`);
            this.cleanupSocket(asset);
            state.isConnecting = false;
            this.attemptReconnect(asset);
            resolve();
          }
        }, 10000);

        ws.on('open', () => {
          clearTimeout(connectionTimeout);
          const priceData = this.prices.get(asset)!;
          priceData.connected = true;
          state.isConnecting = false;
          state.reconnectAttempts = 0;
          
          // Start ping to keep connection alive
          this.startPing(asset);
          
          console.log(`  ✅ ${asset}: WebSocket connected`);
          resolve();
        });

        ws.on('message', (data: WebSocket.Data) => {
          try {
            const parsed = JSON.parse(data.toString());
            const price = parseFloat(parsed.p);
            
            if (this.isValidPrice(asset, price)) {
              const priceData = this.prices.get(asset)!;
              priceData.price = price;
              priceData.lastUpdate = new Date();
            }
          } catch {
            // Ignore parse errors
          }
        });

        ws.on('error', (error) => {
          console.error(`WebSocket error for ${asset}:`, error.message);
        });

        ws.on('close', (code, reason) => {
          clearTimeout(connectionTimeout);
          const priceData = this.prices.get(asset)!;
          priceData.connected = false;
          state.isConnecting = false;
          this.stopPing(asset);
          
          if (!this.isDisconnected) {
            console.log(`  📡 ${asset}: WebSocket closed (${code})`);
            this.attemptReconnect(asset);
          }
        });

        ws.on('pong', () => {
          // Connection alive
        });
        
      } catch (error: any) {
        console.error(`Failed to connect ${asset}:`, error.message);
        state.isConnecting = false;
        this.attemptReconnect(asset);
        resolve();
      }
    });
  }

  private cleanupSocket(asset: CryptoAsset): void {
    const state = this.socketStates.get(asset);
    if (!state) return;
    
    this.stopPing(asset);
    
    if (state.ws) {
      try {
        state.ws.removeAllListeners();
        if (state.ws.readyState === WebSocket.OPEN) {
          state.ws.close();
        }
      } catch {
        // Ignore cleanup errors
      }
      state.ws = null;
    }
  }

  private startPing(asset: CryptoAsset): void {
    const state = this.socketStates.get(asset);
    if (!state) return;
    
    this.stopPing(asset);
    
    state.pingInterval = setInterval(() => {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.ping();
      }
    }, 30000);
  }

  private stopPing(asset: CryptoAsset): void {
    const state = this.socketStates.get(asset);
    if (!state) return;
    
    if (state.pingInterval) {
      clearInterval(state.pingInterval);
      state.pingInterval = null;
    }
  }

  private attemptReconnect(asset: CryptoAsset): void {
    const state = this.socketStates.get(asset);
    if (!state || this.isDisconnected) return;
    
    // Cancel any pending reconnect
    if (state.reconnectTimeout) {
      clearTimeout(state.reconnectTimeout);
      state.reconnectTimeout = null;
    }
    
    if (state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log(`  ⚠️ ${asset}: Max reconnect attempts, relying on polling`);
      return;
    }
    
    state.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000);
    
    console.log(`  🔄 ${asset}: Reconnecting in ${delay / 1000}s...`);
    
    state.reconnectTimeout = setTimeout(() => {
      state.reconnectTimeout = null;
      this.connectWebSocket(asset);
    }, delay);
  }

  /**
   * Start backup REST polling for when WebSocket fails
   */
  private startPolling(): void {
    if (this.pollingInterval) return;
    
    this.pollingInterval = setInterval(async () => {
      if (this.isDisconnected) return;
      
      for (const asset of this.assets) {
        const priceData = this.prices.get(asset);
        if (!priceData) continue;
        
        // Check if price is stale
        const staleMs = Date.now() - priceData.lastUpdate.getTime();
        if (staleMs > STALE_PRICE_THRESHOLD_MS) {
          // Fetch from REST API
          await this.fetchPriceForAsset(asset);
        }
      }
    }, 10000); // Check every 10 seconds
  }

  private async fetchPriceForAsset(asset: CryptoAsset): Promise<void> {
    const feed = DEFAULT_PRICE_FEEDS.find(f => f.asset === asset);
    if (!feed) return;
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(feed.restUrl, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!response.ok) return;
      
      const data: any = await response.json();
      if (data && data.price) {
        const price = parseFloat(data.price);
        
        if (this.isValidPrice(asset, price)) {
          const priceData = this.prices.get(asset)!;
          priceData.price = price;
          priceData.lastUpdate = new Date();
        }
      }
    } catch {
      // Silent fail for polling
    }
  }

  // Set the opening price for a market
  setOpenPrice(asset: CryptoAsset): void {
    const priceData = this.prices.get(asset);
    if (priceData && priceData.price > 0) {
      priceData.openPrice = priceData.price;
      console.log(`📌 ${asset} open price set: $${priceData.openPrice.toLocaleString()}`);
    } else {
      console.warn(`⚠️ Cannot set ${asset} open price: no current price`);
    }
  }

  // Get current price
  getPrice(asset: CryptoAsset): number {
    return this.prices.get(asset)?.price || 0;
  }

  // Get open price
  getOpenPrice(asset: CryptoAsset): number {
    return this.prices.get(asset)?.openPrice || 0;
  }

  // Get price change from open
  getPriceChange(asset: CryptoAsset): number {
    const data = this.prices.get(asset);
    if (!data || !data.openPrice || data.openPrice === 0) return 0;
    return data.price - data.openPrice;
  }

  // Get percentage change
  getPriceChangePct(asset: CryptoAsset): number {
    const data = this.prices.get(asset);
    if (!data || !data.openPrice || data.openPrice === 0) return 0;
    return ((data.price - data.openPrice) / data.openPrice) * 100;
  }

  // Get movement strength (0-1)
  getMovementStrength(asset: CryptoAsset): number {
    const pctChange = Math.abs(this.getPriceChangePct(asset));
    // 0.5% change = strength 1.0
    return Math.min(1, pctChange / 0.5);
  }

  // Check if connection is healthy
  isConnected(asset: CryptoAsset): boolean {
    const data = this.prices.get(asset);
    if (!data) return false;
    
    const staleMs = Date.now() - data.lastUpdate.getTime();
    return data.connected && staleMs < STALE_PRICE_THRESHOLD_MS;
  }

  // Get all prices summary
  getSummary(): { [key in CryptoAsset]?: { price: number; change: number; changePct: number } } {
    const summary: any = {};
    
    for (const asset of this.assets) {
      summary[asset] = {
        price: this.getPrice(asset),
        change: this.getPriceChange(asset),
        changePct: this.getPriceChangePct(asset),
      };
    }
    
    return summary;
  }

  // Disconnect all
  disconnect(): void {
    this.isDisconnected = true;
    
    // Stop polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    // Cleanup all sockets
    for (const asset of this.assets) {
      const state = this.socketStates.get(asset);
      if (state) {
        if (state.reconnectTimeout) {
          clearTimeout(state.reconnectTimeout);
        }
        this.cleanupSocket(asset);
      }
    }
    
    this.socketStates.clear();
    console.log('📡 Multi-price tracker disconnected');
  }
}

// Singleton instance (with proper cleanup)
let tracker: MultiPriceTracker | null = null;

export function getPriceTracker(assets?: CryptoAsset[]): MultiPriceTracker {
  if (!tracker) {
    tracker = new MultiPriceTracker(assets);
  }
  return tracker;
}

export function resetPriceTracker(): void {
  if (tracker) {
    tracker.disconnect();
    tracker = null;
  }
}
