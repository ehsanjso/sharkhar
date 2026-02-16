/**
 * Multi-asset price tracker using Binance WebSocket
 * Tracks BTC, ETH, SOL prices in real-time
 */

import WebSocket from 'ws';
import { CryptoAsset, DEFAULT_PRICE_FEEDS } from './types-multi';

interface PriceData {
  price: number;
  openPrice: number;
  lastUpdate: Date;
  connected: boolean;
}

export class MultiPriceTracker {
  private prices: Map<CryptoAsset, PriceData> = new Map();
  private sockets: Map<CryptoAsset, WebSocket> = new Map();
  private assets: CryptoAsset[];

  constructor(assets: CryptoAsset[] = ['BTC', 'ETH']) {
    this.assets = assets;
    
    // Initialize price data
    for (const asset of assets) {
      this.prices.set(asset, {
        price: 0,
        openPrice: 0,
        lastUpdate: new Date(),
        connected: false,
      });
    }
  }

  async connect(): Promise<void> {
    console.log(`🔌 Connecting to price feeds for: ${this.assets.join(', ')}`);
    
    // Fetch initial prices
    await this.fetchInitialPrices();
    
    // Connect WebSockets
    for (const asset of this.assets) {
      this.connectWebSocket(asset);
    }
    
    // Wait for connections
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ All price feeds connected');
  }

  private async fetchInitialPrices(): Promise<void> {
    for (const asset of this.assets) {
      const feed = DEFAULT_PRICE_FEEDS.find(f => f.asset === asset);
      if (!feed) continue;

      try {
        const response = await fetch(feed.restUrl);
        const data: any = await response.json();
        const price = parseFloat(data.price);
        
        const priceData = this.prices.get(asset)!;
        priceData.price = price;
        priceData.lastUpdate = new Date();
        
        console.log(`  ${asset}: $${price.toLocaleString()}`);
      } catch (error) {
        console.error(`  Failed to fetch ${asset} price`);
      }
    }
  }

  private connectWebSocket(asset: CryptoAsset): void {
    const feed = DEFAULT_PRICE_FEEDS.find(f => f.asset === asset);
    if (!feed) return;

    const ws = new WebSocket(feed.wsUrl);
    
    ws.on('open', () => {
      const priceData = this.prices.get(asset)!;
      priceData.connected = true;
    });

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const parsed = JSON.parse(data.toString());
        const price = parseFloat(parsed.p);
        
        if (price > 0) {
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

    ws.on('close', () => {
      const priceData = this.prices.get(asset)!;
      priceData.connected = false;
      
      // Reconnect after 5 seconds
      setTimeout(() => this.connectWebSocket(asset), 5000);
    });

    this.sockets.set(asset, ws);
  }

  // Set the opening price for a market
  setOpenPrice(asset: CryptoAsset): void {
    const priceData = this.prices.get(asset);
    if (priceData) {
      priceData.openPrice = priceData.price;
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
    if (!data || !data.openPrice) return 0;
    return data.price - data.openPrice;
  }

  // Get percentage change
  getPriceChangePct(asset: CryptoAsset): number {
    const data = this.prices.get(asset);
    if (!data || !data.openPrice) return 0;
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
    return data.connected && staleMs < 30000; // 30 second timeout
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
    this.sockets.forEach((ws, asset) => {
      ws.close();
    });
    this.sockets.clear();
  }
}

// Singleton instance
let tracker: MultiPriceTracker | null = null;

export function getPriceTracker(assets?: CryptoAsset[]): MultiPriceTracker {
  if (!tracker) {
    tracker = new MultiPriceTracker(assets);
  }
  return tracker;
}
