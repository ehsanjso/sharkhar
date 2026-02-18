/**
 * Polybot Fixed v2 - WebSocket Prices + Conservative Strategy
 */

import 'dotenv/config';
import { ClobClient, Side, OrderType } from "@polymarket/clob-client";
import { Wallet } from "ethers";
import WebSocket from "ws";

const HOST = "https://clob.polymarket.com";
const GAMMA_API = "https://gamma-api.polymarket.com";
const CHAIN_ID = 137;
const BINANCE_WS = "wss://stream.binance.com:9443/ws/btcusdt@miniTicker";
const CLOB_WS = "wss://ws-subscriptions-clob.polymarket.com/ws/market";

// Conservative settings
const MIN_CONFIDENCE = 0.65;  // Higher threshold
const MIN_PRICE_MOVEMENT = 0.05; // Need 0.05% BTC movement
const MAX_BET_PERCENT = 0.3;  // Max 30% of balance per bet
const MIN_BET = 1;

interface PriceData {
  current: number;
  open: number;
  high: number;
  low: number;
  history: number[];
}

interface MarketPrices {
  upBid: number;
  upAsk: number;
  downBid: number;
  downAsk: number;
}

class PolybotFixed {
  private client: ClobClient | null = null;
  private signer: Wallet;
  private btcPrices: PriceData = { current: 0, open: 0, high: 0, low: 0, history: [] };
  private marketPrices: MarketPrices = { upBid: 0, upAsk: 0, downBid: 0, downAsk: 0 };
  private binanceWs: WebSocket | null = null;
  private clobWs: WebSocket | null = null;
  private running = false;
  private currentTokenIds: string[] = [];

  constructor() {
    this.signer = new Wallet(process.env.PRIVATE_KEY!);
  }

  async start() {
    console.log(`
╔══════════════════════════════════════════════════╗
║     🤖 POLYBOT FIXED v2                          ║
║     WebSocket Prices + Conservative Strategy     ║
╚══════════════════════════════════════════════════╝
    `);

    // Initialize client
    console.log("🔑 Initializing auth...");
    const tempClient = new ClobClient(HOST, CHAIN_ID, this.signer);
    const creds = await tempClient.createOrDeriveApiKey();
    this.client = new ClobClient(HOST, CHAIN_ID, this.signer, creds, 0);
    console.log("✅ Auth successful");

    // Check balance
    const balance = await this.getBalance();
    console.log(`💰 Balance: $${balance.toFixed(2)}`);
    console.log(`📊 Max bet: $${(balance * MAX_BET_PERCENT).toFixed(2)} (${MAX_BET_PERCENT * 100}%)`);

    if (balance < MIN_BET) {
      console.log("❌ Insufficient balance");
      return;
    }

    // Connect to Binance
    console.log("📡 Connecting to Binance...");
    this.connectBinance();

    // Start trading loop
    this.running = true;
    this.startTradingLoop();

    process.on("SIGINT", () => this.stop());
    process.on("SIGTERM", () => this.stop());
  }

  private async getBalance(): Promise<number> {
    const balance = await this.client!.getBalanceAllowance({ asset_type: "COLLATERAL" });
    return parseInt(balance.balance) / 1e6;
  }

  private connectBinance() {
    this.binanceWs = new WebSocket(BINANCE_WS);
    
    this.binanceWs.on("open", () => console.log("✅ Binance connected"));
    
    this.binanceWs.on("message", (data: Buffer) => {
      const ticker = JSON.parse(data.toString());
      const price = parseFloat(ticker.c);
      
      if (this.btcPrices.open === 0) {
        this.btcPrices.open = price;
        this.btcPrices.high = price;
        this.btcPrices.low = price;
      }
      
      this.btcPrices.current = price;
      this.btcPrices.high = Math.max(this.btcPrices.high, price);
      this.btcPrices.low = Math.min(this.btcPrices.low, price);
      this.btcPrices.history.push(price);
      if (this.btcPrices.history.length > 60) this.btcPrices.history.shift();
    });

    this.binanceWs.on("close", () => {
      if (this.running) {
        console.log("🔄 Reconnecting Binance...");
        setTimeout(() => this.connectBinance(), 2000);
      }
    });

    this.binanceWs.on("error", () => {});
  }

  private async connectClobWs(tokenIds: string[]) {
    if (this.clobWs) {
      this.clobWs.close();
    }

    this.currentTokenIds = tokenIds;
    this.clobWs = new WebSocket(CLOB_WS);

    this.clobWs.on("open", () => {
      // Subscribe to market updates
      const subscribeMsg = {
        type: "MARKET",
        assets_ids: tokenIds,
      };
      this.clobWs!.send(JSON.stringify(subscribeMsg));
      console.log("✅ CLOB WebSocket connected");
    });

    this.clobWs.on("message", (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "book" && msg.asset_id) {
          const isUp = msg.asset_id === tokenIds[0];
          if (msg.bids && msg.bids.length > 0) {
            if (isUp) this.marketPrices.upBid = parseFloat(msg.bids[0].price);
            else this.marketPrices.downBid = parseFloat(msg.bids[0].price);
          }
          if (msg.asks && msg.asks.length > 0) {
            if (isUp) this.marketPrices.upAsk = parseFloat(msg.asks[0].price);
            else this.marketPrices.downAsk = parseFloat(msg.asks[0].price);
          }
        }
      } catch (e) {}
    });

    this.clobWs.on("error", () => {});
  }

  private async startTradingLoop() {
    const now = new Date();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const nextWindow = (5 - (minutes % 5)) * 60 - seconds;
    
    console.log(`⏰ Waiting ${nextWindow}s for next 5-min window...`);
    
    setTimeout(async () => {
      await this.onMarketWindow();
      setInterval(() => this.onMarketWindow(), 5 * 60 * 1000);
    }, nextWindow * 1000);
  }

  private async onMarketWindow() {
    if (!this.running || !this.client) return;

    const now = new Date();
    console.log(`\n🎯 Market window: ${now.toLocaleTimeString()}`);
    
    // Get current balance
    const balance = await this.getBalance();
    console.log(`💰 Balance: $${balance.toFixed(2)}`);

    if (balance < MIN_BET) {
      console.log("⚠️ Insufficient balance");
      return;
    }

    console.log(`📊 BTC: $${this.btcPrices.current.toFixed(2)} (range: $${this.btcPrices.low.toFixed(2)} - $${this.btcPrices.high.toFixed(2)})`);

    // Calculate signal
    const signal = this.calculateSignal();
    if (!signal) {
      console.log("📊 No signal (waiting for stronger movement)");
      this.resetPrices();
      return;
    }

    console.log(`📈 Signal: ${signal.side} (${(signal.confidence * 100).toFixed(0)}% conf)`);

    // Find market
    const market = await this.findNextMarket();
    if (!market) {
      console.log("⚠️ No market found");
      return;
    }

    console.log(`📍 Market: ${market.question}`);

    // Get price from order book (REST fallback since WS might not be ready)
    const tokenId = signal.side === "UP" ? market.upTokenId : market.downTokenId;
    let price = await this.getTokenPrice(tokenId);
    
    // Validate price
    if (price <= 0.1 || price >= 0.9) {
      console.log(`⚠️ Price too extreme: $${price.toFixed(3)} - skipping for safety`);
      return;
    }

    console.log(`💵 ${signal.side} price: $${price.toFixed(3)}`);

    // Calculate bet size (conservative: max 30% of balance)
    const maxBet = balance * MAX_BET_PERCENT;
    const betAmount = Math.min(Math.max(MIN_BET, maxBet), balance * 0.9);
    const shares = betAmount / price;

    console.log(`🎲 Placing order: ${shares.toFixed(2)} shares @ $${price.toFixed(3)} ($${betAmount.toFixed(2)})`);

    try {
      const order = await this.client.createAndPostOrder(
        {
          tokenID: tokenId,
          price: price,
          side: Side.BUY,
          size: shares,
        },
        { tickSize: "0.01", negRisk: false },
        OrderType.GTC
      );

      console.log(`✅ Order placed! ID: ${order.orderID || order.id}`);
      this.sendTelegramAlert(signal.side, betAmount, price, signal.confidence);
      
    } catch (error: any) {
      console.log(`❌ Order failed: ${error.message}`);
    }

    this.resetPrices();
  }

  private calculateSignal(): { side: "UP" | "DOWN"; confidence: number } | null {
    if (this.btcPrices.history.length < 10) return null;

    const change = (this.btcPrices.current - this.btcPrices.open) / this.btcPrices.open * 100;
    const absChange = Math.abs(change);

    // Need minimum movement (conservative)
    if (absChange < MIN_PRICE_MOVEMENT) return null;

    const side = change > 0 ? "UP" : "DOWN";
    const confidence = Math.min(0.5 + absChange * 3, 0.85);

    // Require minimum confidence
    if (confidence < MIN_CONFIDENCE) return null;

    return { side: side as "UP" | "DOWN", confidence };
  }

  private async findNextMarket(): Promise<{
    question: string;
    conditionId: string;
    upTokenId: string;
    downTokenId: string;
  } | null> {
    const now = new Date();
    const minute = now.getMinutes();
    const roundedMinute = Math.ceil(minute / 5) * 5 + 5;
    const windowTime = new Date(now);
    windowTime.setMinutes(roundedMinute, 0, 0);
    if (roundedMinute >= 60) {
      windowTime.setHours(windowTime.getHours() + 1);
      windowTime.setMinutes(roundedMinute - 60);
    }

    const timestamp = Math.floor(windowTime.getTime() / 1000);
    const slug = `btc-updown-5m-${timestamp}`;

    try {
      const resp = await fetch(`${GAMMA_API}/events?slug=${slug}`);
      const events = await resp.json();
      
      if (!events || events.length === 0) return null;

      const market = events[0].markets[0];
      const tokenIds = JSON.parse(market.clobTokenIds);
      const outcomes = JSON.parse(market.outcomes);

      const upIdx = outcomes.findIndex((o: string) => o.toLowerCase() === "up");
      const downIdx = outcomes.findIndex((o: string) => o.toLowerCase() === "down");

      return {
        question: market.question,
        conditionId: market.conditionId,
        upTokenId: tokenIds[upIdx],
        downTokenId: tokenIds[downIdx],
      };
    } catch (e) {
      return null;
    }
  }

  private async getTokenPrice(tokenId: string): Promise<number> {
    try {
      const book = await this.client!.getOrderBook(tokenId);
      
      // For buying, use best ask
      if (book.asks && book.asks.length > 0) {
        return parseFloat(book.asks[0].price);
      }
      // Fallback to mid between bid and ask
      if (book.bids && book.bids.length > 0) {
        const bid = parseFloat(book.bids[0].price);
        return bid + 0.01; // Slightly above bid
      }
      return 0.5; // Default to mid
    } catch (e) {
      return 0;
    }
  }

  private resetPrices() {
    this.btcPrices.open = this.btcPrices.current;
    this.btcPrices.high = this.btcPrices.current;
    this.btcPrices.low = this.btcPrices.current;
  }

  private sendTelegramAlert(side: string, amount: number, price: number, confidence: number) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;

    const msg = `📈 *BET PLACED*
Side: ${side}
Amount: $${amount.toFixed(2)}
Price: $${price.toFixed(3)}
Confidence: ${(confidence * 100).toFixed(0)}%`;
    
    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "Markdown" }),
    }).catch(() => {});
  }

  stop() {
    console.log("\n⚠️ Shutting down...");
    this.running = false;
    this.binanceWs?.close();
    this.clobWs?.close();
    process.exit(0);
  }
}

new PolybotFixed().start().catch(console.error);
