/**
 * Polymarket Multi-Asset Bot - Multi-Market Server
 * Supports BTC, ETH, SOL with 5min and 15min timeframes
 * Each market runs its own set of strategies
 */

import { WebSocket, WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8084;
const STATE_FILE = './data/multi-market-state.json';
const OLD_STATE_FILE = './data/multi-strategy-state.json';

// ============ Telegram Alerting Config ============
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '99986888';

interface AlertConfig {
  enabled: boolean;
  extremeGainThreshold: number;    // Alert when total P&L gains this much since last check
  extremeLossThreshold: number;    // Alert when total P&L drops this much since last check
  profitTakeMultiplier: number;    // Auto-withdraw initial when balance hits Nx starting
  lastAlertedPnl: number;          // Track last P&L to detect swings
  lastAlertTime: number;           // Cooldown between alerts
  alertCooldownMs: number;         // Minimum time between alerts
  withdrawnFunds: number;          // Track "withdrawn" (safe) funds
}

const alertConfig: AlertConfig = {
  enabled: true,
  extremeGainThreshold: 50000,     // Alert on +$50k swing
  extremeLossThreshold: 25000,     // Alert on -$25k swing  
  profitTakeMultiplier: 3,         // At 3x, withdraw initial
  lastAlertedPnl: 0,
  lastAlertTime: 0,
  alertCooldownMs: 5 * 60 * 1000,  // 5 min cooldown
  withdrawnFunds: 0,
};

// ============ Telegram Functions ============
async function sendTelegramAlert(message: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    // If no token, try using clawdbot's message endpoint
    try {
      const res = await fetch('http://localhost:3037/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'telegram',
          target: TELEGRAM_CHAT_ID,
          message: message,
        }),
      });
      if (res.ok) {
        console.log('📨 Alert sent via Clawdbot');
      }
    } catch (e) {
      console.log('📨 Alert (no Telegram):', message);
    }
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
    console.log('📨 Telegram alert sent');
  } catch (error) {
    console.error('Telegram alert error:', error);
  }
}

function checkAlerts(): void {
  if (!alertConfig.enabled) return;
  
  const now = Date.now();
  if (now - alertConfig.lastAlertTime < alertConfig.alertCooldownMs) return;
  
  // Calculate total P&L across all markets
  let totalPnl = 0;
  let totalBalance = 0;
  const startingTotal = 9600; // 16 strategies × $100 × 6 markets... wait, it's per market
  
  for (const market of state.markets) {
    for (const strategy of market.strategies) {
      totalPnl += strategy.totalPnl;
      totalBalance += strategy.balance;
    }
  }
  
  const pnlChange = totalPnl - alertConfig.lastAlertedPnl;
  
  // Check for extreme gain
  if (pnlChange >= alertConfig.extremeGainThreshold) {
    sendTelegramAlert(`🚀 *EXTREME GAIN ALERT*\n\nP&L jumped +$${pnlChange.toLocaleString()} since last check!\n\nTotal P&L: +$${totalPnl.toLocaleString()}\nTotal Balance: $${totalBalance.toLocaleString()}\n\nConsider taking profits!`);
    alertConfig.lastAlertedPnl = totalPnl;
    alertConfig.lastAlertTime = now;
  }
  
  // Check for extreme loss
  if (pnlChange <= -alertConfig.extremeLossThreshold) {
    sendTelegramAlert(`💀 *EXTREME LOSS ALERT*\n\nP&L dropped -$${Math.abs(pnlChange).toLocaleString()} since last check!\n\nTotal P&L: ${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString()}\nTotal Balance: $${totalBalance.toLocaleString()}\n\nConsider pausing! Use: \`/poly pause\``);
    alertConfig.lastAlertedPnl = totalPnl;
    alertConfig.lastAlertTime = now;
  }
  
  // Auto profit-taking check (per market)
  for (const market of state.markets) {
    for (const strategy of market.strategies) {
      const multiplier = strategy.balance / strategy.startingBalance;
      if (multiplier >= alertConfig.profitTakeMultiplier && !strategy.profitTaken) {
        // Mark profit taken and "withdraw" initial stake
        strategy.profitTaken = true;
        const withdrawn = strategy.startingBalance;
        alertConfig.withdrawnFunds += withdrawn;
        sendTelegramAlert(`💰 *AUTO PROFIT-TAKE*\n\n${strategy.name} on ${market.key} hit ${multiplier.toFixed(1)}x!\n\n"Withdrew" initial $${withdrawn} stake.\nTotal safe funds: $${alertConfig.withdrawnFunds.toLocaleString()}\n\nNow trading with house money! 🎰`);
      }
    }
  }
}

// ============ Assets and Timeframes ============
type CryptoAsset = 'BTC' | 'ETH' | 'SOL';
type Timeframe = '5min' | '15min';

interface MarketConfig {
  asset: CryptoAsset;
  timeframe: Timeframe;
  durationMs: number;
  symbol: string; // For Binance
}

const MARKET_CONFIGS: MarketConfig[] = [
  { asset: 'BTC', timeframe: '15min', durationMs: 15 * 60 * 1000, symbol: 'BTCUSDT' },
  { asset: 'BTC', timeframe: '5min', durationMs: 5 * 60 * 1000, symbol: 'BTCUSDT' },
  { asset: 'ETH', timeframe: '15min', durationMs: 15 * 60 * 1000, symbol: 'ETHUSDT' },
  { asset: 'ETH', timeframe: '5min', durationMs: 5 * 60 * 1000, symbol: 'ETHUSDT' },
  { asset: 'SOL', timeframe: '15min', durationMs: 15 * 60 * 1000, symbol: 'SOLUSDT' },
  { asset: 'SOL', timeframe: '5min', durationMs: 5 * 60 * 1000, symbol: 'SOLUSDT' },
];

// ============ Strategy Definitions ============
interface StrategyConfig {
  id: string;
  name: string;
  description: string;
  color: string;
  startingBalance: number;
}

const STRATEGIES: StrategyConfig[] = [
  // MOMENTUM STRATEGIES
  { id: 'adaptive-kelly', name: 'Adaptive Kelly', description: 'Momentum: Kelly sizing, bets WITH trend', color: '#f43f5e', startingBalance: 100 },
  { id: 'vol-regime', name: 'Volatility Regime', description: 'Momentum: HIGH vol=ride trend, LOW vol=wait', color: '#ec4899', startingBalance: 100 },
  { id: 'rsi-divergence', name: 'RSI Divergence', description: 'Momentum: hunts divergences, follows momentum', color: '#d946ef', startingBalance: 100 },
  { id: 'market-arb', name: 'Market Arbitrage', description: 'Momentum: bets when our prob differs >10%', color: '#a855f7', startingBalance: 100 },
  { id: 'ensemble', name: 'Ensemble Consensus', description: 'Momentum: combines 4 signals, bets when 3+ agree', color: '#8b5cf6', startingBalance: 100 },
  // ANTI-MOMENTUM STRATEGIES
  { id: 'fade', name: 'Fade the Move', description: 'Anti-momentum: bets AGAINST >0.12% moves', color: '#ef4444', startingBalance: 100 },
  { id: 'stoikov', name: 'Stoikov Spread', description: 'Anti-momentum: academic market-making', color: '#f97316', startingBalance: 100 },
  { id: 'bayesian', name: 'Bayesian Updater', description: 'Anti-momentum: bets when >65% confident', color: '#3b82f6', startingBalance: 100 },
  { id: 'time-decay', name: 'Time-Decay Reversal', description: 'Anti-momentum: fades late extremes', color: '#f59e0b', startingBalance: 100 },
  { id: 'breakout', name: 'Breakout Confirmation', description: 'Confirmed momentum: trends >70% retained', color: '#22c55e', startingBalance: 100 },
  // V1 SURVIVORS
  { id: 'kelly', name: 'Kelly Fractional', description: 'V1 survivor: 25% Kelly sizing', color: '#10b981', startingBalance: 100 },
  { id: 'regime', name: 'Regime Detection', description: 'V1 WINNER: adapts to trending vs choppy', color: '#6366f1', startingBalance: 100 },
  { id: 'evm', name: 'EV Maximizer', description: 'V1 survivor: only bets when EV is positive', color: '#14b8a6', startingBalance: 100 },
  // CONTROL STRATEGIES
  { id: 'conservative', name: 'Ultra Conservative', description: 'Control: waits until late, tiny bets', color: '#64748b', startingBalance: 100 },
  { id: 'random', name: 'Random Baseline', description: 'Control: 50/50 coin flip, $10 bet', color: '#71717a', startingBalance: 100 },
  // ORIGINAL V1
  { id: 'scaled-betting', name: 'Scaled Betting', description: 'Original V1: timed bets at 1,4,7,10 min', color: '#0ea5e9', startingBalance: 100 },
];

// ============ Types ============
interface Trade {
  id: string;
  time: string;
  marketId: string;
  side: 'Up' | 'Down';
  shares: number;
  cost: number;
  payout: number;
  pnl: number;
  result: 'WIN' | 'LOSS';
  assetOpen: number;
  assetClose: number;
}

interface StrategyMarket {
  side: 'Up' | 'Down' | null;
  costBet: number;
  shares: number;
  avgPrice: number;
  fills: number;
  bets: { minute: number; amount: number; executed: boolean; shares?: number; price?: number }[];
  decidedAt?: number;
}

interface StrategyState {
  id: string;
  name: string;
  description: string;
  color: string;
  balance: number;
  startingBalance: number;
  totalPnl: number;
  totalMarkets: number;
  deployed: number;
  wins: number;
  losses: number;
  winRate: number;
  roi: number;
  avgWin: number;
  avgLoss: number;
  history: Trade[];
  pnlHistory: { market: number; pnl: number; cumulative: number }[];
  currentMarket: StrategyMarket | null;
  // Control flags
  liveMode: boolean;       // true = real money, false = paper
  halted: boolean;         // true = stopped trading
  haltedReason?: string;   // why halted (manual, stop-loss, etc)
  stopLossThreshold: number; // halt when balance drops below this (default 25)
  profitTaken?: boolean;   // true = initial stake "withdrawn" after hitting multiplier
}

interface CurrentMarket {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  openPrice: number;
}

interface MarketState {
  key: string; // e.g. "BTC-15min"
  asset: CryptoAsset;
  timeframe: Timeframe;
  durationMs: number;
  symbol: string;
  currentPrice: number;
  priceHistory: { time: number; price: number }[];
  currentMarket: CurrentMarket | null;
  strategies: StrategyState[];
  totalPnl: number;
  totalBalance: number;
  tradingTimer: NodeJS.Timeout | null;
  // Control flags
  halted: boolean;         // true = all strategies in this market stopped
}

interface BotState {
  connected: boolean;
  live: boolean;
  prices: Record<CryptoAsset, number>;
  markets: MarketState[];
  selectedMarket: string | null;
  globalHalt: boolean;     // true = ALL markets stopped
}

// ============ State ============
let state: BotState = {
  connected: false,
  live: false,
  prices: { BTC: 0, ETH: 0, SOL: 0 },
  markets: [],
  selectedMarket: null,
  globalHalt: false,
};

let clients: Set<WebSocket> = new Set();
let priceTimer: NodeJS.Timeout | null = null;

// ============ Initialize Markets ============
function initializeMarkets(): void {
  state.markets = MARKET_CONFIGS.map(config => ({
    key: `${config.asset}-${config.timeframe}`,
    asset: config.asset,
    timeframe: config.timeframe,
    durationMs: config.durationMs,
    symbol: config.symbol,
    currentPrice: 0,
    priceHistory: [],
    currentMarket: null,
    strategies: STRATEGIES.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      color: s.color,
      balance: s.startingBalance,
      startingBalance: s.startingBalance,
      totalPnl: 0,
      totalMarkets: 0,
      deployed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      roi: 0,
      avgWin: 0,
      avgLoss: 0,
      history: [],
      pnlHistory: [],
      currentMarket: null,
      // Control flags
      liveMode: false,         // Start in paper mode
      halted: false,
      stopLossThreshold: 25,   // Default stop loss at $25
    })),
    totalPnl: 0,
    totalBalance: STRATEGIES.length * 100,
    tradingTimer: null,
    halted: false,
  }));
}

// ============ State Persistence ============
function saveState(): void {
  try {
    const dir = './data';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const saveData = {
      globalHalt: state.globalHalt,
      markets: state.markets.map(m => ({
        key: m.key,
        halted: m.halted,
        strategies: m.strategies.map(s => ({
          id: s.id,
          balance: s.balance,
          totalPnl: s.totalPnl,
          totalMarkets: s.totalMarkets,
          deployed: s.deployed,
          wins: s.wins,
          losses: s.losses,
          winRate: s.winRate,
          roi: s.roi,
          history: s.history.slice(0, 50),
          pnlHistory: s.pnlHistory,
          // Control flags
          liveMode: s.liveMode,
          halted: s.halted,
          haltedReason: s.haltedReason,
          stopLossThreshold: s.stopLossThreshold,
        })),
        totalPnl: m.totalPnl,
        totalBalance: m.totalBalance,
      })),
      savedAt: Date.now(),
    };
    
    fs.writeFileSync(STATE_FILE, JSON.stringify(saveData, null, 2));
  } catch (error) {
    console.error('Failed to save state:', error);
  }
}

function loadState(): boolean {
  try {
    // Try new multi-market state file first
    if (fs.existsSync(STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      
      // Load global halt state
      state.globalHalt = saved.globalHalt ?? false;
      
      if (saved.markets && Array.isArray(saved.markets)) {
        for (const savedMarket of saved.markets) {
          const market = state.markets.find(m => m.key === savedMarket.key);
          if (market && savedMarket.strategies) {
            market.halted = savedMarket.halted ?? false;
            
            for (const savedStrategy of savedMarket.strategies) {
              const strategy = market.strategies.find(s => s.id === savedStrategy.id);
              if (strategy) {
                strategy.balance = savedStrategy.balance ?? strategy.startingBalance;
                strategy.totalPnl = savedStrategy.totalPnl ?? 0;
                strategy.totalMarkets = savedStrategy.totalMarkets ?? 0;
                strategy.deployed = savedStrategy.deployed ?? 0;
                strategy.wins = savedStrategy.wins ?? 0;
                strategy.losses = savedStrategy.losses ?? 0;
                strategy.winRate = savedStrategy.winRate ?? 0;
                strategy.roi = savedStrategy.roi ?? 0;
                strategy.history = savedStrategy.history ?? [];
                strategy.pnlHistory = savedStrategy.pnlHistory ?? [];
                // Control flags
                strategy.liveMode = savedStrategy.liveMode ?? false;
                strategy.halted = savedStrategy.halted ?? false;
                strategy.haltedReason = savedStrategy.haltedReason;
                strategy.stopLossThreshold = savedStrategy.stopLossThreshold ?? 25;
              }
            }
            market.totalPnl = savedMarket.totalPnl ?? 0;
            market.totalBalance = savedMarket.totalBalance ?? STRATEGIES.length * 100;
          }
        }
        console.log('📂 Loaded saved state from multi-market file');
        return true;
      }
    }
    
    // Try to migrate from old single-market state file
    if (fs.existsSync(OLD_STATE_FILE)) {
      console.log('📂 Migrating from old single-market state file...');
      const saved = JSON.parse(fs.readFileSync(OLD_STATE_FILE, 'utf-8'));
      
      if (saved.strategies && Array.isArray(saved.strategies)) {
        // Apply old data to BTC-15min market
        const btc15Market = state.markets.find(m => m.key === 'BTC-15min');
        if (btc15Market) {
          for (const savedStrategy of saved.strategies) {
            const strategy = btc15Market.strategies.find(s => s.id === savedStrategy.id);
            if (strategy) {
              strategy.balance = savedStrategy.balance ?? strategy.startingBalance;
              strategy.totalPnl = savedStrategy.totalPnl ?? 0;
              strategy.totalMarkets = savedStrategy.totalMarkets ?? 0;
              strategy.deployed = savedStrategy.deployed ?? 0;
              strategy.wins = savedStrategy.wins ?? 0;
              strategy.losses = savedStrategy.losses ?? 0;
              strategy.winRate = savedStrategy.winRate ?? 0;
              strategy.roi = savedStrategy.roi ?? 0;
              // Migrate history (convert btcOpen/btcClose to assetOpen/assetClose)
              strategy.history = (savedStrategy.history || []).map((h: any) => ({
                ...h,
                assetOpen: h.btcOpen || h.assetOpen,
                assetClose: h.btcClose || h.assetClose,
              }));
              strategy.pnlHistory = savedStrategy.pnlHistory ?? [];
            }
          }
          btc15Market.totalPnl = saved.totalPnl ?? 0;
          btc15Market.totalBalance = saved.totalBalance ?? STRATEGIES.length * 100;
          console.log(`   ✅ Migrated BTC-15min: $${btc15Market.totalBalance.toFixed(0)} balance, $${btc15Market.totalPnl.toFixed(0)} P&L`);
        }
        
        // Save in new format
        saveState();
        console.log('📂 Migration complete, saved in new format');
        return true;
      }
    }
  } catch (error) {
    console.error('Failed to load state:', error);
  }
  return false;
}

// ============ Price Fetching ============
async function fetchPrices(): Promise<void> {
  try {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${JSON.stringify(symbols)}`);
    const data = await response.json() as { symbol: string; price: string }[];
    
    for (const item of data) {
      const price = parseFloat(item.price);
      if (item.symbol === 'BTCUSDT') state.prices.BTC = price;
      else if (item.symbol === 'ETHUSDT') state.prices.ETH = price;
      else if (item.symbol === 'SOLUSDT') state.prices.SOL = price;
    }
    
    state.connected = true;
    state.live = true;
    
    // Update each market's current price and history
    const now = Date.now();
    for (const market of state.markets) {
      market.currentPrice = state.prices[market.asset];
      market.priceHistory.push({ time: now, price: market.currentPrice });
      if (market.priceHistory.length > 100) {
        market.priceHistory.shift();
      }
    }
  } catch (error) {
    console.error('Price fetch error:', error);
  }
}

// ============ Strategy Logic ============
function getTimeframeMultiplier(timeframe: Timeframe): number {
  return timeframe === '5min' ? 5 / 15 : 1; // Scale bet times for 5min markets
}

function getDurationMinutes(timeframe: Timeframe): number {
  return timeframe === '5min' ? 5 : 15;
}

// All strategy implementations adapted for multi-asset
function adaptiveKellyStrategy(market: MarketState, strategy: StrategyState, openPrice: number, currentPrice: number, minutesElapsed: number): void {
  const strategyMarket = strategy.currentMarket!;
  const priceChange = currentPrice - openPrice;
  const changePercent = (priceChange / openPrice) * 100;
  const duration = getDurationMinutes(market.timeframe);
  const mult = getTimeframeMultiplier(market.timeframe);
  
  const validWindow = (minutesElapsed >= 3 * mult && minutesElapsed <= 5 * mult) ||
                      (minutesElapsed >= 8 * mult && minutesElapsed <= 10 * mult);
  
  if (!strategyMarket.side && minutesElapsed >= 3 * mult && minutesElapsed < 4 * mult) {
    const momentum = Math.tanh(changePercent * 10);
    const upProb = Math.max(0.35, Math.min(0.65, 0.5 + momentum * 0.15));
    const edge = Math.abs(upProb - 0.5);
    if (edge > 0.05) {
      strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
      strategyMarket.decidedAt = Date.now();
    }
  }
  
  if (strategyMarket.side && validWindow) {
    const betIndex = minutesElapsed < 6 * mult ? 0 : 1;
    if (!strategyMarket.bets[betIndex]?.executed) {
      const edge = Math.abs(changePercent) * 3 / 100;
      const kellyFrac = Math.min(0.25, edge * 0.5);
      const betAmount = Math.max(5, Math.floor(strategy.balance * kellyFrac));
      if (strategy.balance >= betAmount) {
        placeBet(market, strategy, betAmount, 0.55);
      }
    }
  }
}

function volRegimeStrategy(market: MarketState, strategy: StrategyState, openPrice: number, currentPrice: number, minutesElapsed: number): void {
  const strategyMarket = strategy.currentMarket!;
  const priceChange = currentPrice - openPrice;
  const changePercent = (priceChange / openPrice) * 100;
  const mult = getTimeframeMultiplier(market.timeframe);
  
  const history = market.priceHistory.slice(-20);
  const returns: number[] = [];
  for (let i = 1; i < history.length; i++) {
    returns.push((history[i].price - history[i-1].price) / history[i-1].price);
  }
  const variance = returns.length > 0 ? returns.reduce((s, r) => s + r * r, 0) / returns.length : 0.0001;
  const volatility = Math.sqrt(variance) * 100;
  
  const isHighVol = volatility > 0.03;
  const isLowVol = volatility < 0.015;
  
  if (!strategyMarket.side) {
    if (isHighVol && minutesElapsed >= 4 * mult && minutesElapsed < 5 * mult) {
      strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
      strategyMarket.decidedAt = Date.now();
    } else if (isLowVol && minutesElapsed >= 10 * mult && Math.abs(changePercent) > 0.08) {
      strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
      strategyMarket.decidedAt = Date.now();
    } else if (!isHighVol && !isLowVol && minutesElapsed >= 5 * mult && minutesElapsed < 6 * mult) {
      strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
      strategyMarket.decidedAt = Date.now();
    }
  }
  
  if (strategyMarket.side) {
    const schedule = isHighVol ? [{ minute: 4 * mult, pct: 0.5 }, { minute: 8 * mult, pct: 0.3 }]
                   : isLowVol ? [{ minute: 10 * mult, pct: 0.7 }]
                   : [{ minute: 5 * mult, pct: 0.3 }, { minute: 8 * mult, pct: 0.4 }];
    
    for (let i = 0; i < schedule.length; i++) {
      if (!strategyMarket.bets[i]?.executed && minutesElapsed >= schedule[i].minute) {
        const amount = Math.floor(strategy.balance * schedule[i].pct);
        if (strategy.balance >= amount && amount >= 3) {
          placeBet(market, strategy, amount, 0.54);
        }
      }
    }
  }
}

function rsiDivergenceStrategy(market: MarketState, strategy: StrategyState, openPrice: number, currentPrice: number, minutesElapsed: number): void {
  const strategyMarket = strategy.currentMarket!;
  const priceChange = currentPrice - openPrice;
  const mult = getTimeframeMultiplier(market.timeframe);
  
  if (minutesElapsed < 5 * mult || minutesElapsed > 12 * mult) return;
  
  const history = market.priceHistory.slice(-15);
  if (history.length < 8) return;
  
  let gains = 0, losses = 0;
  for (let i = 1; i < history.length; i++) {
    const change = history[i].price - history[i-1].price;
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / history.length;
  const avgLoss = losses / history.length;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  if (!strategyMarket.side) {
    if (priceChange > 0 && rsi < 45 && minutesElapsed >= 6 * mult) {
      strategyMarket.side = 'Down';
      strategyMarket.decidedAt = Date.now();
    } else if (priceChange < 0 && rsi > 55 && minutesElapsed >= 6 * mult) {
      strategyMarket.side = 'Up';
      strategyMarket.decidedAt = Date.now();
    } else if (minutesElapsed >= 7 * mult && !strategyMarket.decidedAt) {
      strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
      strategyMarket.decidedAt = Date.now();
    }
  }
  
  if (strategyMarket.side && !strategyMarket.bets[0]?.executed) {
    if (strategy.balance >= 12) placeBet(market, strategy, 12, 0.52);
  }
}

function marketArbStrategy(market: MarketState, strategy: StrategyState, openPrice: number, currentPrice: number, minutesElapsed: number): void {
  const strategyMarket = strategy.currentMarket!;
  const priceChange = currentPrice - openPrice;
  const changePercent = (priceChange / openPrice) * 100;
  const mult = getTimeframeMultiplier(market.timeframe);
  
  if (minutesElapsed < 2 * mult || minutesElapsed > 13 * mult) return;
  
  const history = market.priceHistory.slice(-15);
  let momentum = 0;
  if (history.length >= 5) {
    const recent = history.slice(-5);
    momentum = (recent[4].price - recent[0].price) / recent[0].price * 100;
  }
  
  const reversion = Math.min(1, Math.abs(changePercent) * 3);
  let upProb = 0.5 + (momentum * 0.03) - (reversion * 0.02 * Math.sign(changePercent));
  upProb = Math.max(0.30, Math.min(0.70, upProb));
  
  const marketPrice = 0.50;
  const deviation = Math.abs(upProb - marketPrice);
  
  if (!strategyMarket.side && deviation > 0.10) {
    strategyMarket.side = upProb > 0.5 ? 'Up' : 'Down';
    strategyMarket.decidedAt = Date.now();
  }
  
  if (strategyMarket.side) {
    const betIndex = strategyMarket.bets.length;
    if (betIndex < 3 && !strategyMarket.bets[betIndex]?.executed) {
      const betPct = deviation > 0.20 ? 0.20 : deviation > 0.15 ? 0.15 : 0.10;
      const betAmount = Math.floor(strategy.balance * betPct);
      if (strategy.balance >= betAmount && betAmount >= 3) {
        placeBet(market, strategy, betAmount, upProb > 0.5 ? upProb : 1 - upProb);
      }
    }
  }
}

function ensembleStrategy(market: MarketState, strategy: StrategyState, openPrice: number, currentPrice: number, minutesElapsed: number): void {
  const strategyMarket = strategy.currentMarket!;
  const priceChange = currentPrice - openPrice;
  const changePercent = (priceChange / openPrice) * 100;
  const mult = getTimeframeMultiplier(market.timeframe);
  
  const validWindow = (minutesElapsed >= 3 * mult && minutesElapsed <= 5 * mult) ||
                      (minutesElapsed >= 8 * mult && minutesElapsed <= 10 * mult);
  if (!validWindow) return;
  
  const history = market.priceHistory.slice(-15);
  
  const sig1 = changePercent > 0.08 ? 'Up' : changePercent < -0.08 ? 'Down' : null;
  
  let upMoves = 0;
  for (let i = 1; i < history.length; i++) {
    if (history[i].price > history[i-1].price) upMoves++;
  }
  const consistency = history.length > 1 ? upMoves / (history.length - 1) : 0.5;
  const sig2 = consistency > 0.6 ? 'Up' : consistency < 0.4 ? 'Down' : null;
  
  let gains = 0, losses = 0;
  for (let i = 1; i < history.length; i++) {
    const change = history[i].price - history[i-1].price;
    if (change > 0) gains += change;
    else losses -= change;
  }
  const rs = losses === 0 ? 100 : gains / losses;
  const rsi = 100 - (100 / (1 + rs));
  const sig3 = rsi > 55 ? 'Up' : rsi < 45 ? 'Down' : null;
  
  const first5 = history.slice(0, 5);
  const last5 = history.slice(-5);
  const avgFirst = first5.length > 0 ? first5.reduce((a, b) => a + b.price, 0) / first5.length : openPrice;
  const avgLast = last5.length > 0 ? last5.reduce((a, b) => a + b.price, 0) / last5.length : currentPrice;
  const sig4 = avgLast > avgFirst * 1.0003 ? 'Up' : avgLast < avgFirst * 0.9997 ? 'Down' : null;
  
  const signals = [sig1, sig2, sig3, sig4];
  let upVotes = 0, downVotes = 0;
  for (const s of signals) {
    if (s === 'Up') upVotes++;
    else if (s === 'Down') downVotes++;
  }
  
  const maxVotes = Math.max(upVotes, downVotes);
  
  if (!strategyMarket.side && maxVotes >= 3) {
    strategyMarket.side = upVotes > downVotes ? 'Up' : 'Down';
    strategyMarket.decidedAt = Date.now();
  }
  
  if (strategyMarket.side) {
    const betIndex = minutesElapsed < 6 * mult ? 0 : 1;
    if (!strategyMarket.bets[betIndex]?.executed) {
      const betPct = maxVotes === 4 ? 0.4 : 0.25;
      const betAmount = Math.floor(strategy.balance * betPct);
      if (strategy.balance >= betAmount && betAmount >= 3) {
        placeBet(market, strategy, betAmount, 0.55);
      }
    }
  }
}

function fadeStrategy(market: MarketState, strategy: StrategyState, openPrice: number, currentPrice: number, minutesElapsed: number): void {
  const strategyMarket = strategy.currentMarket!;
  const priceChange = currentPrice - openPrice;
  const changePercent = (priceChange / openPrice) * 100;
  const mult = getTimeframeMultiplier(market.timeframe);
  
  if (!strategyMarket.side && minutesElapsed >= 5 * mult) {
    if (Math.abs(changePercent) > 0.12) {
      strategyMarket.side = changePercent > 0 ? 'Down' : 'Up';
      strategyMarket.decidedAt = Date.now();
    }
  }
  
  if (strategyMarket.side) {
    const schedule = [
      { minute: 5 * mult, amount: 8 },
      { minute: 8 * mult, amount: 10 },
      { minute: 11 * mult, amount: 7 },
    ];
    
    for (let i = 0; i < schedule.length; i++) {
      if (!strategyMarket.bets[i]?.executed && minutesElapsed >= schedule[i].minute) {
        if (strategy.balance >= schedule[i].amount) {
          placeBet(market, strategy, schedule[i].amount, 0.55);
        }
      }
    }
  }
}

function stoikovStrategy(market: MarketState, strategy: StrategyState, openPrice: number, currentPrice: number, minutesElapsed: number): void {
  const strategyMarket = strategy.currentMarket!;
  const priceChange = currentPrice - openPrice;
  const mult = getTimeframeMultiplier(market.timeframe);
  
  const history = market.priceHistory.slice(-20);
  const returns: number[] = [];
  for (let i = 1; i < history.length; i++) {
    returns.push((history[i].price - history[i-1].price) / history[i-1].price);
  }
  const variance = returns.length > 0 ? returns.reduce((s, r) => s + r * r, 0) / returns.length : 0.0001;
  
  const gamma = 0.1;
  const inventoryPenalty = 1 / (1 + gamma * variance * 10000);
  
  if (!strategyMarket.side && minutesElapsed >= 4 * mult && minutesElapsed < 5 * mult) {
    if (variance < 0.001) {
      strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
      strategyMarket.decidedAt = Date.now();
    }
  }
  
  if (strategyMarket.side) {
    const schedule = [{ minute: 4 * mult }, { minute: 7 * mult }, { minute: 10 * mult }];
    
    for (let i = 0; i < schedule.length; i++) {
      if (!strategyMarket.bets[i]?.executed && minutesElapsed >= schedule[i].minute) {
        const baseBet = 10;
        const optimalBet = Math.max(4, Math.floor(baseBet * inventoryPenalty));
        if (strategy.balance >= optimalBet) {
          placeBet(market, strategy, optimalBet, 0.52);
        }
      }
    }
  }
}

function bayesianStrategy(market: MarketState, strategy: StrategyState, openPrice: number, currentPrice: number, minutesElapsed: number): void {
  const strategyMarket = strategy.currentMarket!;
  const mult = getTimeframeMultiplier(market.timeframe);
  
  const history = market.priceHistory.slice(-30);
  if (history.length < 10) return;
  
  let posterior = 0.5;
  const updateFactor = 0.06;
  
  for (let i = 1; i < history.length; i++) {
    const move = history[i].price - history[i-1].price;
    if (move > 0) posterior = posterior + (1 - posterior) * updateFactor;
    else if (move < 0) posterior = posterior - posterior * updateFactor;
  }
  
  if (!strategyMarket.side && minutesElapsed >= 6 * mult) {
    if (posterior > 0.65) {
      strategyMarket.side = 'Up';
      strategyMarket.decidedAt = Date.now();
    } else if (posterior < 0.35) {
      strategyMarket.side = 'Down';
      strategyMarket.decidedAt = Date.now();
    } else if (minutesElapsed >= 10 * mult) {
      strategyMarket.decidedAt = Date.now();
    }
  }
  
  if (strategyMarket.side && !strategyMarket.bets[0]?.executed) {
    const confidence = strategyMarket.side === 'Up' ? posterior : (1 - posterior);
    const betAmount = Math.floor(8 + (confidence - 0.5) * 20);
    if (strategy.balance >= betAmount) {
      placeBet(market, strategy, betAmount, confidence);
    }
  }
}

function timeDecayStrategy(market: MarketState, strategy: StrategyState, openPrice: number, currentPrice: number, minutesElapsed: number): void {
  const strategyMarket = strategy.currentMarket!;
  const priceChange = currentPrice - openPrice;
  const changePercent = (priceChange / openPrice) * 100;
  const mult = getTimeframeMultiplier(market.timeframe);
  
  if (minutesElapsed < 8 * mult) return;
  
  if (!strategyMarket.side && Math.abs(changePercent) >= 0.1) {
    strategyMarket.side = changePercent > 0 ? 'Down' : 'Up';
    strategyMarket.decidedAt = Date.now();
  }
  
  if (strategyMarket.side) {
    const schedule = [
      { minute: 8 * mult, amount: 6 },
      { minute: 11 * mult, amount: 12 },
      { minute: 13 * mult, amount: 18 },
    ];
    
    for (let i = 0; i < schedule.length; i++) {
      if (!strategyMarket.bets[i]?.executed && minutesElapsed >= schedule[i].minute) {
        if (strategy.balance >= schedule[i].amount) {
          placeBet(market, strategy, schedule[i].amount, 0.55);
        }
      }
    }
  }
}

function breakoutStrategy(market: MarketState, strategy: StrategyState, openPrice: number, currentPrice: number, minutesElapsed: number): void {
  const strategyMarket = strategy.currentMarket!;
  const totalChange = ((currentPrice - openPrice) / openPrice) * 100;
  const mult = getTimeframeMultiplier(market.timeframe);
  
  if (minutesElapsed < 7 * mult) return;
  
  if (!strategyMarket.side && Math.abs(totalChange) >= 0.15) {
    const history = market.priceHistory.slice(-20);
    if (history.length < 10) return;
    
    const midPoint = history[Math.floor(history.length / 2)].price;
    const earlyChange = ((midPoint - openPrice) / openPrice) * 100;
    
    const sameDirection = Math.sign(earlyChange) === Math.sign(totalChange);
    const retained = earlyChange !== 0 ? Math.abs(totalChange) / Math.abs(earlyChange) : 0;
    
    if (sameDirection && retained > 0.7) {
      strategyMarket.side = totalChange >= 0 ? 'Up' : 'Down';
      strategyMarket.decidedAt = Date.now();
    } else if (minutesElapsed >= 10 * mult) {
      strategyMarket.decidedAt = Date.now();
    }
  }
  
  if (strategyMarket.side) {
    const schedule = [{ minute: 7 * mult, amount: 15 }, { minute: 10 * mult, amount: 12 }];
    
    for (let i = 0; i < schedule.length; i++) {
      if (!strategyMarket.bets[i]?.executed && minutesElapsed >= schedule[i].minute) {
        if (strategy.balance >= schedule[i].amount) {
          placeBet(market, strategy, schedule[i].amount, 0.58);
        }
      }
    }
  }
}

function kellyStrategy(market: MarketState, strategy: StrategyState, openPrice: number, currentPrice: number, minutesElapsed: number): void {
  const strategyMarket = strategy.currentMarket!;
  const priceChange = currentPrice - openPrice;
  const changePercent = (priceChange / openPrice) * 100;
  const mult = getTimeframeMultiplier(market.timeframe);
  
  if (!strategyMarket.side && minutesElapsed >= 4 * mult && minutesElapsed < 5 * mult) {
    const momentum = Math.abs(changePercent);
    const edgeEstimate = Math.min(momentum * 5, 15);
    
    if (edgeEstimate > 5) {
      strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
      strategyMarket.decidedAt = Date.now();
    }
  }
  
  if (strategyMarket.side) {
    const momentum = Math.abs(changePercent);
    const edge = Math.min(momentum * 5, 15) / 100;
    const kellyFraction = edge * 0.25;
    
    const schedule = [{ minute: 4 * mult }, { minute: 7 * mult }, { minute: 10 * mult }];
    
    for (let i = 0; i < schedule.length; i++) {
      if (!strategyMarket.bets[i]?.executed && minutesElapsed >= schedule[i].minute) {
        const betAmount = Math.max(3, Math.min(10, Math.floor(strategy.balance * kellyFraction)));
        if (strategy.balance >= betAmount) {
          placeBet(market, strategy, betAmount, 0.55 + edge);
        }
      }
    }
  }
}

function regimeStrategy(market: MarketState, strategy: StrategyState, openPrice: number, currentPrice: number, minutesElapsed: number): void {
  const strategyMarket = strategy.currentMarket!;
  const priceChange = currentPrice - openPrice;
  const changePercent = (priceChange / openPrice) * 100;
  const mult = getTimeframeMultiplier(market.timeframe);
  
  if (!strategyMarket.side && minutesElapsed >= 5 * mult) {
    const history = market.priceHistory.slice(-20);
    if (history.length >= 10) {
      let sameDir = 0;
      const direction = priceChange >= 0 ? 1 : -1;
      for (let i = 1; i < history.length; i++) {
        const move = history[i].price - history[i-1].price;
        if (Math.sign(move) === direction) sameDir++;
      }
      const consistency = sameDir / (history.length - 1);
      
      const isTrending = consistency > 0.6;
      const isChoppy = consistency < 0.4;
      
      if (isTrending) {
        strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
      } else if (isChoppy && Math.abs(changePercent) > 0.08) {
        strategyMarket.side = priceChange >= 0 ? 'Down' : 'Up';
      }
      strategyMarket.decidedAt = Date.now();
    }
  }
  
  if (strategyMarket.side) {
    const schedule = [
      { minute: 5 * mult, amount: 10 },
      { minute: 8 * mult, amount: 10 },
      { minute: 11 * mult, amount: 8 },
    ];
    
    for (let i = 0; i < schedule.length; i++) {
      if (!strategyMarket.bets[i]?.executed && minutesElapsed >= schedule[i].minute) {
        if (strategy.balance >= schedule[i].amount) {
          placeBet(market, strategy, schedule[i].amount, 0.55);
        }
      }
    }
  }
}

function evmStrategy(market: MarketState, strategy: StrategyState, openPrice: number, currentPrice: number, minutesElapsed: number): void {
  const strategyMarket = strategy.currentMarket!;
  const priceChange = currentPrice - openPrice;
  const changePercent = (priceChange / openPrice) * 100;
  const mult = getTimeframeMultiplier(market.timeframe);
  
  if (!strategyMarket.side && minutesElapsed >= 4 * mult && minutesElapsed < 5 * mult) {
    const momentumStrength = Math.min(Math.abs(changePercent) * 50, 10) / 100;
    
    const history = market.priceHistory.slice(-15);
    let sameDir = 0;
    const direction = priceChange >= 0 ? 1 : -1;
    for (let i = 1; i < history.length; i++) {
      if (Math.sign(history[i].price - history[i-1].price) === direction) sameDir++;
    }
    const consistency = history.length > 1 ? sameDir / (history.length - 1) : 0.5;
    
    const baseProb = 0.50;
    const probBoost = (momentumStrength * 0.15) + (consistency - 0.5) * 0.2;
    const winProb = Math.min(0.70, Math.max(0.35, baseProb + probBoost));
    
    const potentialBet = 15;
    const ev = (winProb * potentialBet) - ((1 - winProb) * potentialBet);
    
    if (ev > 1.5) {
      strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
      let betAmount = ev > 3 ? 18 : ev > 2 ? 14 : 10;
      betAmount = Math.min(betAmount, Math.floor(strategy.balance * 0.2));
      strategyMarket.decidedAt = Date.now();
      
      if (strategy.balance >= betAmount) {
        placeBet(market, strategy, betAmount, winProb);
      }
    } else {
      strategyMarket.decidedAt = Date.now();
    }
  }
}

function conservativeStrategy(market: MarketState, strategy: StrategyState, openPrice: number, currentPrice: number, minutesElapsed: number): void {
  const strategyMarket = strategy.currentMarket!;
  const priceChange = currentPrice - openPrice;
  const changePercent = (priceChange / openPrice) * 100;
  const mult = getTimeframeMultiplier(market.timeframe);
  
  if (!strategyMarket.side && minutesElapsed >= 12 * mult) {
    if (Math.abs(changePercent) >= 0.2) {
      strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
      strategyMarket.decidedAt = Date.now();
    }
  }
  
  if (strategyMarket.side && !strategyMarket.bets[0]?.executed) {
    const betAmount = 8;
    if (strategy.balance >= betAmount) {
      placeBet(market, strategy, betAmount, 0.55);
    }
  }
}

function randomStrategy(market: MarketState, strategy: StrategyState, openPrice: number, currentPrice: number, minutesElapsed: number): void {
  const strategyMarket = strategy.currentMarket!;
  const mult = getTimeframeMultiplier(market.timeframe);
  
  if (!strategyMarket.side && minutesElapsed >= 5 * mult && minutesElapsed < 6 * mult) {
    const random = (Date.now() % 100) / 100;
    strategyMarket.side = random > 0.5 ? 'Up' : 'Down';
    strategyMarket.decidedAt = Date.now();
  }
  
  if (strategyMarket.side && !strategyMarket.bets[0]?.executed && minutesElapsed >= 5 * mult) {
    if (strategy.balance >= 10) {
      placeBet(market, strategy, 10, 0.50);
    }
  }
}

function scaledBettingStrategy(market: MarketState, strategy: StrategyState, openPrice: number, currentPrice: number, minutesElapsed: number): void {
  const strategyMarket = strategy.currentMarket!;
  const priceChange = currentPrice - openPrice;
  const mult = getTimeframeMultiplier(market.timeframe);
  
  if (!strategyMarket.side && minutesElapsed >= 1 * mult && minutesElapsed < 2 * mult) {
    strategyMarket.side = priceChange >= 0 ? 'Up' : 'Down';
    strategyMarket.decidedAt = Date.now();
  }
  
  if (strategyMarket.side) {
    const schedule = [
      { minute: 1 * mult, amount: 5 },
      { minute: 4 * mult, amount: 10 },
      { minute: 7 * mult, amount: 15 },
      { minute: 10 * mult, amount: 10 },
    ];
    
    for (let i = 0; i < schedule.length; i++) {
      if (!strategyMarket.bets[i]?.executed && minutesElapsed >= schedule[i].minute) {
        const momentum = Math.abs(priceChange / openPrice);
        const probability = Math.min(0.75, 0.55 + momentum * 10);
        
        if (probability >= 0.60 && strategy.balance >= schedule[i].amount) {
          placeBet(market, strategy, schedule[i].amount, probability);
        } else {
          strategyMarket.bets.push({ minute: schedule[i].minute, amount: 0, executed: true });
        }
      }
    }
  }
}

function canPlaceBet(marketState: MarketState, strategy: StrategyState): boolean {
  // Check global halt
  if (state.globalHalt) return false;
  
  // Check market halt
  if (marketState.halted) return false;
  
  // Check strategy halt
  if (strategy.halted) return false;
  
  // Check stop loss - auto halt if balance below threshold
  if (strategy.balance <= strategy.stopLossThreshold) {
    strategy.halted = true;
    strategy.haltedReason = `Stop loss triggered (balance $${strategy.balance.toFixed(0)} <= $${strategy.stopLossThreshold})`;
    console.log(`   🛑 [${strategy.name}] STOP LOSS - Balance $${strategy.balance.toFixed(0)} <= $${strategy.stopLossThreshold}`);
    saveState();
    broadcastState();
    return false;
  }
  
  return true;
}

function placeBet(marketState: MarketState, strategy: StrategyState, amount: number, probability: number): void {
  // Check if we can place bet
  if (!canPlaceBet(marketState, strategy)) return;
  
  const market = strategy.currentMarket!;
  
  if (strategy.balance < amount) {
    amount = Math.floor(strategy.balance);
    if (amount < 1) return;
  }
  
  const price = Math.max(0.45, probability - 0.03);
  const shares = Math.floor(amount / price);
  
  // For live mode, would integrate with Polymarket API here
  // For now, just log if live
  if (strategy.liveMode) {
    console.log(`   💰 [LIVE] ${strategy.name}: $${amount} @ ${(probability * 100).toFixed(0)}% - WOULD PLACE REAL BET`);
    // TODO: Integrate with Polymarket client
  }
  
  market.bets.push({
    minute: Date.now(),
    amount,
    executed: true,
    shares,
    price,
  });
  
  market.costBet += amount;
  market.shares += shares;
  market.avgPrice = market.costBet / market.shares;
  market.fills++;
  
  strategy.balance -= amount;
  strategy.deployed += amount;
}

// ============ Market Management ============
function startMarket(marketState: MarketState): void {
  const now = Date.now();
  const duration = getDurationMinutes(marketState.timeframe);
  const marketId = `${marketState.key}-${now}`;
  
  marketState.currentMarket = {
    id: marketId,
    title: `${marketState.asset} ${duration}min - ${new Date().toLocaleTimeString()}`,
    startTime: now,
    endTime: now + marketState.durationMs,
    openPrice: marketState.currentPrice,
  };
  
  // Initialize strategy markets
  for (const strategy of marketState.strategies) {
    strategy.currentMarket = {
      side: null,
      costBet: 0,
      shares: 0,
      avgPrice: 0,
      fills: 0,
      bets: [],
    };
  }
  
  console.log(`\n🎯 [${marketState.key}] New market: ${marketState.currentMarket.title}`);
  console.log(`   Open: $${marketState.currentMarket.openPrice.toLocaleString()}`);
  
  // Start trading loop
  if (marketState.tradingTimer) clearInterval(marketState.tradingTimer);
  marketState.tradingTimer = setInterval(() => tradingTick(marketState), 5000);
  
  broadcastState();
}

function tradingTick(marketState: MarketState): void {
  if (!marketState.currentMarket) return;
  
  const now = Date.now();
  const elapsed = now - marketState.currentMarket.startTime;
  const minutesElapsed = elapsed / 60000;
  const duration = getDurationMinutes(marketState.timeframe);
  
  if (minutesElapsed >= duration) {
    endMarket(marketState);
    return;
  }
  
  const openPrice = marketState.currentMarket.openPrice;
  const currentPrice = marketState.currentPrice;
  
  for (const strategy of marketState.strategies) {
    if (!strategy.currentMarket) continue;
    
    switch (strategy.id) {
      case 'adaptive-kelly': adaptiveKellyStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed); break;
      case 'vol-regime': volRegimeStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed); break;
      case 'rsi-divergence': rsiDivergenceStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed); break;
      case 'market-arb': marketArbStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed); break;
      case 'ensemble': ensembleStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed); break;
      case 'fade': fadeStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed); break;
      case 'stoikov': stoikovStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed); break;
      case 'bayesian': bayesianStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed); break;
      case 'time-decay': timeDecayStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed); break;
      case 'breakout': breakoutStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed); break;
      case 'kelly': kellyStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed); break;
      case 'regime': regimeStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed); break;
      case 'evm': evmStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed); break;
      case 'conservative': conservativeStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed); break;
      case 'random': randomStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed); break;
      case 'scaled-betting': scaledBettingStrategy(marketState, strategy, openPrice, currentPrice, minutesElapsed); break;
    }
  }
  
  broadcastState();
}

function endMarket(marketState: MarketState): void {
  if (!marketState.currentMarket) return;
  
  if (marketState.tradingTimer) {
    clearInterval(marketState.tradingTimer);
    marketState.tradingTimer = null;
  }
  
  const openPrice = marketState.currentMarket.openPrice;
  const closePrice = marketState.currentPrice;
  const wentUp = closePrice >= openPrice;
  
  console.log(`\n📊 [${marketState.key}] Ended - ${wentUp ? 'UP' : 'DOWN'}`);
  console.log(`   $${openPrice.toLocaleString()} → $${closePrice.toLocaleString()}`);
  
  for (const strategy of marketState.strategies) {
    const strategyMarket = strategy.currentMarket;
    if (!strategyMarket || strategyMarket.fills === 0) {
      strategy.currentMarket = null;
      continue;
    }
    
    const wePickedUp = strategyMarket.side === 'Up';
    const won = wentUp === wePickedUp;
    
    const payout = won ? strategyMarket.shares : 0;
    const pnl = payout - strategyMarket.costBet;
    
    strategy.totalMarkets++;
    strategy.totalPnl += pnl;
    strategy.balance += payout;
    
    if (won) strategy.wins++;
    else strategy.losses++;
    
    strategy.winRate = strategy.totalMarkets > 0 ? Math.round((strategy.wins / strategy.totalMarkets) * 100) : 0;
    strategy.roi = strategy.deployed > 0 ? (strategy.totalPnl / strategy.deployed) * 100 : 0;
    
    strategy.history.unshift({
      id: `${marketState.currentMarket.id}-${strategy.id}`,
      time: new Date().toLocaleTimeString(),
      marketId: marketState.currentMarket.id,
      side: strategyMarket.side || 'Up',
      shares: strategyMarket.shares,
      cost: strategyMarket.costBet,
      payout,
      pnl,
      result: won ? 'WIN' : 'LOSS',
      assetOpen: openPrice,
      assetClose: closePrice,
    });
    strategy.history = strategy.history.slice(0, 50);
    
    const cumulative = strategy.pnlHistory.length > 0 
      ? strategy.pnlHistory[strategy.pnlHistory.length - 1].cumulative + pnl 
      : pnl;
    strategy.pnlHistory.push({ market: strategy.totalMarkets, pnl, cumulative });
    
    strategy.currentMarket = null;
  }
  
  marketState.totalPnl = marketState.strategies.reduce((sum, s) => sum + s.totalPnl, 0);
  marketState.totalBalance = marketState.strategies.reduce((sum, s) => sum + s.balance, 0);
  
  console.log(`   Total Balance: $${marketState.totalBalance.toFixed(2)} | P&L: ${marketState.totalPnl >= 0 ? '+' : ''}$${marketState.totalPnl.toFixed(2)}`);
  
  marketState.currentMarket = null;
  broadcastState();
  saveState();
  
  // Check for extreme P&L swings and auto profit-taking
  checkAlerts();
  
  // Start next market after delay (30s for 15min, 15s for 5min)
  const delay = marketState.timeframe === '5min' ? 15000 : 30000;
  setTimeout(() => startMarket(marketState), delay);
}

// ============ WebSocket ============
function broadcastState(): void {
  const msg = JSON.stringify({
    type: 'fullState',
    data: {
      connected: state.connected,
      live: state.live,
      prices: state.prices,
      selectedMarket: state.selectedMarket,
      globalHalt: state.globalHalt,
      markets: state.markets.map(m => ({
        key: m.key,
        asset: m.asset,
        timeframe: m.timeframe,
        currentPrice: m.currentPrice,
        halted: m.halted,
        currentMarket: m.currentMarket ? {
          ...m.currentMarket,
          elapsed: (Date.now() - m.currentMarket.startTime) / 60000,
          change: m.currentPrice - m.currentMarket.openPrice,
          changePercent: ((m.currentPrice - m.currentMarket.openPrice) / m.currentMarket.openPrice) * 100,
        } : null,
        strategies: m.strategies.map(s => ({
          ...s,
          liveMode: s.liveMode,
          halted: s.halted,
          haltedReason: s.haltedReason,
          stopLossThreshold: s.stopLossThreshold,
          currentMarket: s.currentMarket ? {
            ...s.currentMarket,
            livePnl: s.currentMarket.side && m.currentMarket ? calculateLivePnl(m, s) : 0,
          } : null,
        })),
        totalPnl: m.totalPnl,
        totalBalance: m.totalBalance,
      })),
    }
  });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

function calculateLivePnl(marketState: MarketState, strategy: StrategyState): number {
  if (!strategy.currentMarket || !marketState.currentMarket) return 0;
  const m = strategy.currentMarket;
  const winning = (m.side === 'Up' && marketState.currentPrice >= marketState.currentMarket.openPrice) ||
                  (m.side === 'Down' && marketState.currentPrice < marketState.currentMarket.openPrice);
  return winning ? (m.shares - m.costBet) * 0.7 : -m.costBet * 0.7;
}

// ============ HTTP Server ============
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = req.url || '/';

  if (url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: state.connected,
      live: state.live,
      prices: state.prices,
      marketCount: state.markets.length,
    }));
    return;
  }

  if (url === '/api/markets') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state.markets.map(m => ({
      key: m.key,
      asset: m.asset,
      timeframe: m.timeframe,
      totalPnl: m.totalPnl,
      totalBalance: m.totalBalance,
      active: !!m.currentMarket,
    }))));
    return;
  }

  // ============ POLY CONTROL ENDPOINTS (for Telegram/CLI) ============
  if (url === '/api/poly/pause' && req.method === 'POST') {
    state.globalHalt = true;
    saveState();
    broadcastState();
    sendTelegramAlert('⏸️ *TRADING PAUSED*\n\nAll markets halted via API.\nUse `/poly resume` to continue.');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'All trading paused', globalHalt: true }));
    return;
  }

  if (url === '/api/poly/resume' && req.method === 'POST') {
    state.globalHalt = false;
    saveState();
    broadcastState();
    sendTelegramAlert('▶️ *TRADING RESUMED*\n\nAll markets active again.');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Trading resumed', globalHalt: false }));
    return;
  }

  if (url === '/api/poly/status') {
    let totalPnl = 0;
    let totalBalance = 0;
    const marketSummary: { key: string; pnl: number; balance: number }[] = [];
    
    for (const market of state.markets) {
      let mPnl = 0, mBal = 0;
      for (const strategy of market.strategies) {
        mPnl += strategy.totalPnl;
        mBal += strategy.balance;
      }
      totalPnl += mPnl;
      totalBalance += mBal;
      marketSummary.push({ key: market.key, pnl: mPnl, balance: mBal });
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      globalHalt: state.globalHalt,
      totalPnl,
      totalBalance,
      startingBalance: 9600,
      roi: ((totalBalance - 9600) / 9600 * 100).toFixed(1) + '%',
      withdrawnFunds: alertConfig.withdrawnFunds,
      markets: marketSummary.sort((a, b) => b.pnl - a.pnl),
      alertsEnabled: alertConfig.enabled,
    }));
    return;
  }

  if (url === '/api/poly/alerts' && req.method === 'POST') {
    // Toggle alerts or update thresholds
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (typeof data.enabled === 'boolean') alertConfig.enabled = data.enabled;
        if (typeof data.gainThreshold === 'number') alertConfig.extremeGainThreshold = data.gainThreshold;
        if (typeof data.lossThreshold === 'number') alertConfig.extremeLossThreshold = data.lossThreshold;
        if (typeof data.profitTakeMultiplier === 'number') alertConfig.profitTakeMultiplier = data.profitTakeMultiplier;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, config: alertConfig }));
      } catch (e) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
    return;
  }

  if (url.startsWith('/api/reset/') && req.method === 'POST') {
    const marketKey = url.replace('/api/reset/', '');
    const market = state.markets.find(m => m.key === marketKey);
    if (market) {
      for (const strategy of market.strategies) {
        strategy.balance = strategy.startingBalance;
        strategy.totalPnl = 0;
        strategy.totalMarkets = 0;
        strategy.deployed = 0;
        strategy.wins = 0;
        strategy.losses = 0;
        strategy.winRate = 0;
        strategy.roi = 0;
        strategy.history = [];
        strategy.pnlHistory = [];
      }
      market.totalPnl = 0;
      market.totalBalance = STRATEGIES.length * 100;
      saveState();
      broadcastState();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: `${marketKey} reset` }));
    } else {
      res.writeHead(404);
      res.end('Market not found');
    }
    return;
  }

  // Serve static files
  const distDir = path.join(__dirname, 'dist');
  let filePath = path.join(distDir, url === '/' ? 'index.html' : url);

  if (!fs.existsSync(filePath) && !url.startsWith('/api')) {
    filePath = path.join(distDir, 'index.html');
  }

  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
      return;
    }
  } catch (error) {
    console.error('Error serving file:', error);
  }

  res.writeHead(404);
  res.end('Not found');
});

// ============ WebSocket Server ============
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('🔌 Dashboard connected');
  clients.add(ws);
  broadcastState();

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === 'selectMarket') {
        state.selectedMarket = msg.key;
        broadcastState();
      } 
      // ========== HALT CONTROLS ==========
      else if (msg.type === 'globalHalt') {
        state.globalHalt = true;
        console.log('🛑 GLOBAL HALT activated');
        saveState();
        broadcastState();
      }
      else if (msg.type === 'globalResume') {
        state.globalHalt = false;
        console.log('▶️ GLOBAL RESUME');
        saveState();
        broadcastState();
      }
      else if (msg.type === 'haltMarket' && msg.key) {
        const market = state.markets.find(m => m.key === msg.key);
        if (market) {
          market.halted = true;
          console.log(`🛑 Market ${msg.key} HALTED`);
          saveState();
          broadcastState();
        }
      }
      else if (msg.type === 'resumeMarket' && msg.key) {
        const market = state.markets.find(m => m.key === msg.key);
        if (market) {
          market.halted = false;
          console.log(`▶️ Market ${msg.key} RESUMED`);
          saveState();
          broadcastState();
        }
      }
      else if (msg.type === 'haltStrategy' && msg.key && msg.strategyId) {
        const market = state.markets.find(m => m.key === msg.key);
        const strategy = market?.strategies.find(s => s.id === msg.strategyId);
        if (strategy) {
          strategy.halted = true;
          strategy.haltedReason = msg.reason || 'Manual halt';
          console.log(`🛑 Strategy ${strategy.name} in ${msg.key} HALTED`);
          saveState();
          broadcastState();
        }
      }
      else if (msg.type === 'resumeStrategy' && msg.key && msg.strategyId) {
        const market = state.markets.find(m => m.key === msg.key);
        const strategy = market?.strategies.find(s => s.id === msg.strategyId);
        if (strategy) {
          strategy.halted = false;
          strategy.haltedReason = undefined;
          console.log(`▶️ Strategy ${strategy.name} in ${msg.key} RESUMED`);
          saveState();
          broadcastState();
        }
      }
      // ========== LIVE MODE CONTROLS ==========
      else if (msg.type === 'setLiveMode' && msg.key && msg.strategyId) {
        const market = state.markets.find(m => m.key === msg.key);
        const strategy = market?.strategies.find(s => s.id === msg.strategyId);
        if (strategy) {
          const wasLive = strategy.liveMode;
          strategy.liveMode = msg.live ?? false;
          
          // If switching to live mode, can set initial funding
          if (strategy.liveMode && msg.funding) {
            strategy.balance = msg.funding;
            strategy.startingBalance = msg.funding;
          }
          
          console.log(`${strategy.liveMode ? '💰 LIVE' : '📄 PAPER'} ${strategy.name} in ${msg.key}`);
          saveState();
          broadcastState();
        }
      }
      else if (msg.type === 'setStopLoss' && msg.key && msg.strategyId && typeof msg.threshold === 'number') {
        const market = state.markets.find(m => m.key === msg.key);
        const strategy = market?.strategies.find(s => s.id === msg.strategyId);
        if (strategy) {
          strategy.stopLossThreshold = msg.threshold;
          console.log(`📉 Stop loss for ${strategy.name} set to $${msg.threshold}`);
          saveState();
          broadcastState();
        }
      }
      // ========== RESET ==========
      else if (msg.type === 'reset' && msg.key) {
        const market = state.markets.find(m => m.key === msg.key);
        if (market) {
          for (const strategy of market.strategies) {
            strategy.balance = strategy.startingBalance;
            strategy.totalPnl = 0;
            strategy.totalMarkets = 0;
            strategy.deployed = 0;
            strategy.wins = 0;
            strategy.losses = 0;
            strategy.winRate = 0;
            strategy.roi = 0;
            strategy.history = [];
            strategy.pnlHistory = [];
            strategy.halted = false;
            strategy.haltedReason = undefined;
          }
          market.totalPnl = 0;
          market.totalBalance = STRATEGIES.length * 100;
          market.halted = false;
          saveState();
          broadcastState();
        }
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  });

  ws.on('close', () => {
    console.log('🔌 Dashboard disconnected');
    clients.delete(ws);
  });
});

// ============ Start ============
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🤖 MULTI-MARKET POLYMARKET BOT                            ║
║  BTC, ETH, SOL × 5min, 15min = 6 Markets                   ║
║  16 Strategies × $100 Each × 6 Markets = $9,600 Total      ║
╚════════════════════════════════════════════════════════════╝

  Dashboard: http://192.168.0.217:${PORT}
  
  Markets:
${MARKET_CONFIGS.map(c => `    • ${c.asset} ${c.timeframe}`).join('\n')}
  `);

  // Initialize markets
  initializeMarkets();
  
  // Load saved state
  loadState();

  // Start price updates
  priceTimer = setInterval(fetchPrices, 3000);
  fetchPrices();

  // Start all markets with staggered timing
  let delay = 5000;
  for (const market of state.markets) {
    setTimeout(() => startMarket(market), delay);
    delay += 10000; // Stagger by 10 seconds
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  saveState();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down...');
  saveState();
  process.exit(0);
});
