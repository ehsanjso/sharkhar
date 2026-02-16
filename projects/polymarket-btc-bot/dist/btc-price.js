import WebSocket from 'ws';
import { EventEmitter } from 'events';
export class BTCPriceTracker extends EventEmitter {
    wsUrl;
    ws = null;
    currentPrice = 0;
    openPrice = 0;
    priceHistory = [];
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    constructor(wsUrl = 'wss://rtds.polymarket.com') {
        super();
        this.wsUrl = wsUrl;
    }
    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.on('open', () => {
                console.log('📡 Connected to Polymarket RTDS');
                this.subscribeToBTC();
                this.reconnectAttempts = 0;
                resolve();
            });
            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(message);
                }
                catch (error) {
                    // Ignore parse errors
                }
            });
            this.ws.on('error', (error) => {
                console.error('WebSocket error:', error.message);
            });
            this.ws.on('close', () => {
                console.log('📡 WebSocket closed');
                this.attemptReconnect();
            });
            setTimeout(() => {
                if (this.currentPrice === 0) {
                    // Fallback to Binance API if no price received
                    this.fetchBinancePrice();
                }
            }, 5000);
        });
    }
    subscribeToBTC() {
        if (!this.ws)
            return;
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
        this.ws.send(JSON.stringify(subscription));
        console.log('📊 Subscribed to BTC price feed');
    }
    handleMessage(message) {
        if (message.topic === 'crypto_prices' && message.payload?.symbol === 'btcusdt') {
            const price = message.payload.value;
            this.updatePrice(price, message.payload.timestamp);
        }
    }
    updatePrice(price, timestamp) {
        this.currentPrice = price;
        this.priceHistory.push({ timestamp, price });
        // Keep last 30 minutes of history
        const cutoff = Date.now() - 30 * 60 * 1000;
        this.priceHistory = this.priceHistory.filter((p) => p.timestamp > cutoff);
        const priceUpdate = {
            symbol: 'btcusdt',
            timestamp,
            value: price,
        };
        this.emit('price', priceUpdate);
    }
    async fetchBinancePrice() {
        try {
            const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
            const data = await response.json();
            const price = parseFloat(data.price);
            this.updatePrice(price, Date.now());
            console.log(`📊 BTC price from Binance: $${price.toLocaleString()}`);
        }
        catch (error) {
            console.error('Failed to fetch Binance price:', error);
        }
    }
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnect attempts reached');
            return;
        }
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        console.log(`Reconnecting in ${delay / 1000}s...`);
        setTimeout(() => {
            this.connect();
        }, delay);
    }
    setOpenPrice(price) {
        this.openPrice = price || this.currentPrice;
        console.log(`📌 Open price set: $${this.openPrice.toLocaleString()}`);
    }
    getPrice() {
        return this.currentPrice;
    }
    getOpenPrice() {
        return this.openPrice;
    }
    getPriceChange() {
        if (this.openPrice === 0)
            return 0;
        return this.currentPrice - this.openPrice;
    }
    getPriceChangePercent() {
        if (this.openPrice === 0)
            return 0;
        return ((this.currentPrice - this.openPrice) / this.openPrice) * 100;
    }
    isUp() {
        return this.currentPrice > this.openPrice;
    }
    isDown() {
        return this.currentPrice < this.openPrice;
    }
    getMovementStrength() {
        // Returns a value 0-1 indicating how strong the price movement is
        const changePercent = Math.abs(this.getPriceChangePercent());
        // Normalize: 0.1% = moderate, 0.5% = strong
        return Math.min(changePercent / 0.5, 1);
    }
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
//# sourceMappingURL=btc-price.js.map