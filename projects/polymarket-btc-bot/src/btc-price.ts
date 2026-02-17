import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { PriceUpdate } from './types';

/**
 * BTC Price Tracker with WebSocket connection
 * 
 * Fixed issues:
 * - Reconnection race condition prevention
 * - Proper cleanup on disconnect
 * - Better error handling
 */
export class BTCPriceTracker extends EventEmitter {
  private ws: WebSocket | null = null;
  private currentPrice: number = 0;
  private openPrice: number = 0;
  private priceHistory: { timestamp: number; price: number }[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private wsUrl: string;
  
  // Reconnection state management
  private isConnecting = false;
  private isDisconnected = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(wsUrl: string = 'wss://rtds.polymarket.com') {
    super();
    this.wsUrl = wsUrl;
  }

  async connect(): Promise<void> {
    // Prevent concurrent connection attempts
    if (this.isConnecting) {
      console.log('⏳ Already connecting, waiting...');
      return new Promise<void>((resolve) => {
        this.once('connected', () => resolve());
      });
    }
    
    if (this.isDisconnected) {
      console.log('⚠️ Tracker was disconnected, cannot reconnect');
      return;
    }

    this.isConnecting = true;

    return new Promise<void>((resolve, reject) => {
      try {
        // Clean up any existing connection
        this.cleanup();
        
        this.ws = new WebSocket(this.wsUrl);

        const connectionTimeout = setTimeout(() => {
          if (this.isConnecting) {
            console.error('WebSocket connection timeout');
            this.cleanup();
            this.isConnecting = false;
            this.attemptReconnect();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.ws.on('open', () => {
          clearTimeout(connectionTimeout);
          console.log('📡 Connected to Polymarket RTDS');
          this.subscribeToBTC();
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          this.startPingInterval();
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            // Ignore parse errors (pong messages, etc.)
          }
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error.message);
          // Don't reject here - let close handler deal with reconnection
        });

        this.ws.on('close', (code, reason) => {
          clearTimeout(connectionTimeout);
          console.log(`📡 WebSocket closed: ${code} - ${reason || 'no reason'}`);
          this.stopPingInterval();
          
          if (!this.isDisconnected) {
            this.isConnecting = false;
            this.attemptReconnect();
          }
        });

        this.ws.on('pong', () => {
          // Connection is alive
        });

      } catch (error: any) {
        this.isConnecting = false;
        reject(error);
      }
    }).catch((error) => {
      // Fallback to Binance if initial connection fails
      console.log('⚠️ Primary connection failed, using Binance fallback');
      return this.fetchBinancePrice();
    });
  }

  private cleanup(): void {
    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.close();
        }
      } catch {
        // Ignore cleanup errors
      }
      this.ws = null;
    }
    this.stopPingInterval();
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private subscribeToBTC(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const subscription = {
      action: 'subscribe',
      subscriptions: [
        {
          topic: 'crypto_prices',
          type: 'update',
          filters: 'btcusdt',
        },
      ],
    };

    try {
      this.ws.send(JSON.stringify(subscription));
      console.log('📊 Subscribed to BTC price feed');
    } catch (error: any) {
      console.error('Failed to subscribe:', error.message);
    }
    
    // Fetch initial price if we don't have one
    setTimeout(() => {
      if (this.currentPrice === 0) {
        this.fetchBinancePrice();
      }
    }, 3000);
  }

  private handleMessage(message: any): void {
    if (message.topic === 'crypto_prices' && message.payload?.symbol === 'btcusdt') {
      const price = message.payload.value;
      if (typeof price === 'number' && price > 0) {
        this.updatePrice(price, message.payload.timestamp || Date.now());
      }
    }
  }

  private updatePrice(price: number, timestamp: number): void {
    // Validate price is reasonable (basic sanity check)
    if (price < 1000 || price > 1000000) {
      console.warn(`⚠️ Ignoring suspicious BTC price: $${price}`);
      return;
    }
    
    this.currentPrice = price;
    this.priceHistory.push({ timestamp, price });

    // Keep last 30 minutes of history
    const cutoff = Date.now() - 30 * 60 * 1000;
    this.priceHistory = this.priceHistory.filter((p) => p.timestamp > cutoff);

    const priceUpdate: PriceUpdate = {
      symbol: 'btcusdt',
      timestamp,
      value: price,
    };

    this.emit('price', priceUpdate);
  }

  private async fetchBinancePrice(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
        { signal: controller.signal }
      );
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json() as { price?: string };
      
      if (data && data.price) {
        const price = parseFloat(data.price);
        if (price > 0) {
          this.updatePrice(price, Date.now());
          console.log(`📊 BTC price from Binance: $${price.toLocaleString()}`);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch Binance price:', error.message);
    }
  }

  private attemptReconnect(): void {
    // Cancel any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.isDisconnected) {
      return;
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached, falling back to Binance polling');
      this.startBinancePolling();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    console.log(`Reconnecting in ${delay / 1000}s... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect().catch((error) => {
        console.error('Reconnect failed:', error.message);
      });
    }, delay);
  }

  private startBinancePolling(): void {
    console.log('📊 Starting Binance price polling (every 5s)');
    
    // Fetch immediately
    this.fetchBinancePrice();
    
    // Then poll every 5 seconds
    setInterval(() => {
      if (!this.isDisconnected) {
        this.fetchBinancePrice();
      }
    }, 5000);
  }

  setOpenPrice(price?: number): void {
    if (price !== undefined) {
      this.openPrice = price;
    } else if (this.currentPrice > 0) {
      this.openPrice = this.currentPrice;
    } else {
      console.warn('⚠️ Cannot set open price: no current price available');
      return;
    }
    console.log(`📌 Open price set: $${this.openPrice.toLocaleString()}`);
  }

  getPrice(): number {
    return this.currentPrice;
  }

  getOpenPrice(): number {
    return this.openPrice;
  }

  getPriceChange(): number {
    if (this.openPrice === 0) return 0;
    return this.currentPrice - this.openPrice;
  }

  getPriceChangePercent(): number {
    if (this.openPrice === 0) return 0;
    return ((this.currentPrice - this.openPrice) / this.openPrice) * 100;
  }

  isUp(): boolean {
    return this.currentPrice > this.openPrice;
  }

  isDown(): boolean {
    return this.currentPrice < this.openPrice;
  }

  getMovementStrength(): number {
    // Returns a value 0-1 indicating how strong the price movement is
    const changePercent = Math.abs(this.getPriceChangePercent());
    // Normalize: 0.1% = moderate, 0.5% = strong
    return Math.min(changePercent / 0.5, 1);
  }

  disconnect(): void {
    this.isDisconnected = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.cleanup();
    console.log('📡 BTC price tracker disconnected');
  }
}
