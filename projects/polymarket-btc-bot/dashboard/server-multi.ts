/**
 * Polymarket Multi-Asset Bot - Multi-Market Server
 * Supports BTC, ETH, SOL with 5min and 15min timeframes
 * Each market runs its own set of strategies
 */

import { WebSocket, WebSocketServer } from 'ws';
import { recordBet, redeemAllWinnings } from './auto-redeem.js';
import { trackBetPlaced, trackBetFilled, checkAndRedeemAll, getStats as getBetTrackerStats, getPendingBets, getRecentHistory } from './bet-tracker.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { liveTrading, checkMarketOutcome, getMarketBySlug } from './live-trading.js';
import * as db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8084;
const STATE_FILE = './data/multi-market-state.json';
const OLD_STATE_FILE = './data/multi-strategy-state.json';

// ============ Paper Trading Toggle ============
const PAPER_TRADING_ENABLED = false;  // Set to false to disable all paper trading

// ============ Multi-Phase Order Execution ============
const USE_MULTI_PHASE_ORDERS = true;  // Use 3-phase order execution for better fill rates
const ORDER_RETRY_CONFIG = {
  phase1TimeoutMs: 8000,    // Wait 8s after FOK rejection
  phase2Increment: 0.02,    // +2¢ for phase 2
  phase2TimeoutMs: 12000,   // Wait 12s for phase 2 fill
  phase3Increment: 0.04,    // +4¢ for phase 3
  phase3TimeoutMs: 8000,    // Wait 8s for phase 3 fill
  sizeReduction: 0.9,       // 90% of previous size each phase
};

// ============ Telegram Alerting Config ============
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '99986888';

interface AlertConfig {
  enabled: boolean;
  gainPercentThreshold: number;    // Alert when strategy gains this % since last alert
  lossPercentThreshold: number;    // Alert when strategy loses this % since last alert
  profitTakeMultiplier: number;    // Auto-withdraw initial when balance hits Nx starting
  alertCooldownMs: number;         // Minimum time between alerts per strategy
  withdrawnFunds: number;          // Track "withdrawn" (safe) funds
  // Per-strategy tracking: { "ETH-5min:vol-regime": { lastPnl: 100, lastAlertTime: 123456 } }
  strategyState: Record<string, { lastPnl: number; lastAlertTime: number }>;
}

const alertConfig: AlertConfig = {
  enabled: true,
  gainPercentThreshold: 50,        // Alert on +50% gain from last state
  lossPercentThreshold: 30,        // Alert on -30% loss from last state
  profitTakeMultiplier: 3,         // At 3x, withdraw initial
  alertCooldownMs: 5 * 60 * 1000,  // 5 min cooldown per strategy
  withdrawnFunds: 0,
  strategyState: {},
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
  
  // Check each strategy individually (percentage-based)
  for (const market of state.markets) {
    for (const strategy of market.strategies) {
      // Only check live mode strategies OR strategies with significant balance
      if (!strategy.liveMode && strategy.balance < 50) continue;
      
      const key = `${market.key}:${strategy.id}`;
      const lastState = alertConfig.strategyState[key] || { lastPnl: 0, lastAlertTime: 0 };
      
      // Cooldown per strategy
      if (now - lastState.lastAlertTime < alertConfig.alertCooldownMs) continue;
      
      const pnlChange = strategy.totalPnl - lastState.lastPnl;
      const baseAmount = Math.max(strategy.startingBalance, 1); // Avoid division by zero
      const changePercent = (pnlChange / baseAmount) * 100;
      
      // Check for significant gain
      if (changePercent >= alertConfig.gainPercentThreshold) {
        sendTelegramAlert(`🚀 *${market.key} ${strategy.name}*\n\n+${changePercent.toFixed(0)}% gain!\nP&L: $${lastState.lastPnl.toFixed(0)} → $${strategy.totalPnl.toFixed(0)}\nBalance: $${strategy.balance.toFixed(0)}`);
        alertConfig.strategyState[key] = { lastPnl: strategy.totalPnl, lastAlertTime: now };
      }
      
      // Check for significant loss
      if (changePercent <= -alertConfig.lossPercentThreshold) {
        sendTelegramAlert(`💀 *${market.key} ${strategy.name}*\n\n${changePercent.toFixed(0)}% loss!\nP&L: $${lastState.lastPnl.toFixed(0)} → $${strategy.totalPnl.toFixed(0)}\nBalance: $${strategy.balance.toFixed(0)}\n\nUse \`poly pause\` to halt.`);
        alertConfig.strategyState[key] = { lastPnl: strategy.totalPnl, lastAlertTime: now };
      }
      
      // Initialize tracking if first time
      if (!alertConfig.strategyState[key]) {
        alertConfig.strategyState[key] = { lastPnl: strategy.totalPnl, lastAlertTime: 0 };
      }
      
      // Auto profit-taking check
      const multiplier = strategy.balance / strategy.startingBalance;
      if (multiplier >= alertConfig.profitTakeMultiplier && !strategy.profitTaken) {
        strategy.profitTaken = true;
        const withdrawn = strategy.startingBalance;
        alertConfig.withdrawnFunds += withdrawn;
        sendTelegramAlert(`💰 *PROFIT LOCK*\n\n${strategy.name} on ${market.key} hit ${multiplier.toFixed(1)}x!\n\nInitial $${withdrawn} "withdrawn" to safety.\nTotal safe: $${alertConfig.withdrawnFunds.toFixed(0)}\n\nNow playing with house money! 🎰`);
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

// ACTIVE MARKETS - Only these will run
// 3 bots: BTC 5min (fast), ETH 15min, SOL 15min (longer plays)
const MARKET_CONFIGS: MarketConfig[] = [
  { asset: 'BTC', timeframe: '5min', durationMs: 5 * 60 * 1000, symbol: 'BTCUSDT' },
  { asset: 'ETH', timeframe: '15min', durationMs: 15 * 60 * 1000, symbol: 'ETHUSDT' },
  { asset: 'SOL', timeframe: '15min', durationMs: 15 * 60 * 1000, symbol: 'SOLUSDT' },
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
  // SELECTED STRATEGIES (7 total)
  { id: 'vol-regime', name: 'Volatility Regime', description: 'Momentum: HIGH vol=ride trend, LOW vol=wait', color: '#ec4899', startingBalance: 12 },
  { id: 'rsi-divergence', name: 'RSI Divergence', description: 'Momentum: hunts divergences, follows momentum', color: '#d946ef', startingBalance: 12 },
  { id: 'ensemble', name: 'Ensemble Consensus', description: 'Momentum: combines 4 signals, bets when 3+ agree', color: '#8b5cf6', startingBalance: 12 },
  { id: 'stoikov', name: 'Stoikov Spread', description: 'Anti-momentum: academic market-making', color: '#f97316', startingBalance: 12 },
  { id: 'breakout', name: 'Breakout Confirmation', description: 'Confirmed momentum: trends >70% retained', color: '#22c55e', startingBalance: 12 },
  { id: 'regime', name: 'Regime Detection', description: 'V1 WINNER: adapts to trending vs choppy', color: '#6366f1', startingBalance: 12 },
  { id: 'scaled-betting', name: 'Scaled Betting', description: 'Original V1: timed bets at 1,4,7,10 min', color: '#0ea5e9', startingBalance: 12 },
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

interface StrategyLog {
  time: string;
  type: 'info' | 'bet' | 'clob' | 'fill' | 'resolve' | 'error';
  message: string;
  data?: any;
}

interface StrategyState {
  id: string;
  name: string;
  description: string;
  color: string;
  // Paper trading stats (simulation)
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
  // Live trading stats (separate from paper)
  liveDeployed: number;    // Total $ deployed in live mode
  livePnl: number;         // P&L from live trades only
  liveWins: number;        // Live wins count
  liveLosses: number;      // Live losses count
  liveHistory: Trade[];    // History of live trades only
  liveAllocation: number;  // Initial budget assigned from wallet
  liveBalance: number;     // Current balance (starts at allocation, updated with wins/losses)
  // Funds tracking - what's locked vs available
  lockedFunds: number;         // Money currently in bets or awaiting redemption (unavailable)
  pendingBets: {               // Track all pending bets for this strategy
    conditionId: string;
    tokenId: string;
    betAmount: number;         // What we bet (locked)
    expectedPayout: number;    // What we'll get if we win
    marketResolved: boolean;
    won: boolean | null;       // null = not resolved, true/false = outcome
    timestamp: number;
  }[];
  // Control flags
  liveMode: boolean;       // true = real money, false = paper
  halted: boolean;         // true = paper trading stopped
  haltedReason?: string;   // why halted (manual, stop-loss, etc)
  liveHalted: boolean;     // true = live trading stopped (separate from paper)
  liveHaltedReason?: string;
  stopLossThreshold: number; // halt when balance drops below this (default 25)
  profitTaken?: boolean;   // true = initial stake "withdrawn" after hitting multiplier
  // Per-strategy logs
  logs: StrategyLog[];
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
  walletBalance: number;   // On-chain USDC.e balance
  maintenanceMode: boolean;  // true = preparing for restart, no new bets
  maintenanceSince: number | null;  // timestamp when maintenance started
}

// ============ State ============
let state: BotState = {
  connected: false,
  live: false,
  prices: { BTC: 0, ETH: 0, SOL: 0 },
  markets: [],
  selectedMarket: null,
  globalHalt: false,
  walletBalance: 0,
  maintenanceMode: false,
  maintenanceSince: null,
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
      // Paper trading (simulation)
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
      // Live trading (separate tracking)
      liveDeployed: 0,
      livePnl: 0,
      liveWins: 0,
      liveLosses: 0,
      liveHistory: [],
      liveAllocation: 10,      // Default $10 budget per strategy
      liveBalance: 0,          // Starts at 0, set to allocation when live mode enabled
      // Funds tracking
      lockedFunds: 0,          // Money in bets or awaiting redemption
      pendingBets: [],         // List of pending bets
      // Control flags
      liveMode: false,         // Start in paper mode
      halted: false,           // Paper trading halt
      liveHalted: false,       // Live trading halt (separate)
      stopLossThreshold: Math.floor(s.startingBalance * 0.25),   // Stop loss at 25% of initial balance
      logs: [],
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
          // Paper trading stats
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
          // Live trading stats (separate)
          liveDeployed: s.liveDeployed,
          livePnl: s.livePnl,
          liveWins: s.liveWins,
          liveLosses: s.liveLosses,
          liveHistory: s.liveHistory.slice(0, 50),
          liveAllocation: s.liveAllocation,
          liveBalance: s.liveBalance,
          // Funds tracking
          lockedFunds: s.lockedFunds,
          pendingBets: s.pendingBets,
          // Control flags
          liveMode: s.liveMode,
          halted: s.halted,
          haltedReason: s.haltedReason,
          liveHalted: s.liveHalted,
          liveHaltedReason: s.liveHaltedReason,
          stopLossThreshold: s.stopLossThreshold,
          logs: s.logs.slice(-50), // Save last 50 logs
        })),
        totalPnl: m.totalPnl,
        totalBalance: m.totalBalance,
      })),
      savedAt: Date.now(),
    };
    
    fs.writeFileSync(STATE_FILE, JSON.stringify(saveData, null, 2));
    
    // Also save to SQLite database
    for (const market of state.markets) {
      for (const s of market.strategies) {
        db.saveStrategy({
          id: s.id,
          market_key: market.key,
          name: s.name,
          balance: s.balance,
          starting_balance: s.startingBalance,
          total_pnl: s.totalPnl,
          total_markets: s.totalMarkets,
          deployed: s.deployed,
          wins: s.wins,
          losses: s.losses,
          live_mode: s.liveMode,
          live_allocation: s.liveAllocation,
          live_balance: s.liveBalance,
          live_deployed: s.liveDeployed,
          live_pnl: s.livePnl,
          live_wins: s.liveWins,
          live_losses: s.liveLosses,
          halted: s.halted,
          halted_reason: s.haltedReason,
          stop_loss_threshold: s.stopLossThreshold,
        });
      }
    }
  } catch (error) {
    console.error('Failed to save state:', error);
    db.dbLog.error('system', 'Failed to save state', { error: String(error) });
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
                // Paper trading stats
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
                // Live trading stats (separate)
                strategy.liveDeployed = savedStrategy.liveDeployed ?? 0;
                strategy.livePnl = savedStrategy.livePnl ?? 0;
                strategy.liveWins = savedStrategy.liveWins ?? 0;
                strategy.liveLosses = savedStrategy.liveLosses ?? 0;
                strategy.liveHistory = savedStrategy.liveHistory ?? [];
                strategy.liveAllocation = savedStrategy.liveAllocation ?? 10;
                strategy.liveBalance = savedStrategy.liveBalance ?? savedStrategy.liveAllocation ?? 10;
                // Funds tracking
                strategy.lockedFunds = savedStrategy.lockedFunds ?? 0;
                strategy.pendingBets = savedStrategy.pendingBets ?? [];
                // Control flags
                strategy.liveMode = savedStrategy.liveMode ?? false;
                strategy.halted = savedStrategy.halted ?? false;
                strategy.haltedReason = savedStrategy.haltedReason;
                strategy.liveHalted = savedStrategy.liveHalted ?? false;
                strategy.liveHaltedReason = savedStrategy.liveHaltedReason;
                strategy.stopLossThreshold = savedStrategy.stopLossThreshold ?? 25;
                strategy.logs = savedStrategy.logs ?? [];
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

// ============ Wallet Balance ============
async function fetchWalletBalance(): Promise<void> {
  try {
    const { ethers } = await import('ethers');
    const { withRetry } = await import('./rpc.js');
    const USDC_E = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    const WALLET = '0x923C9c79ADF737A878f6fFb4946D7da889d78E1d';
    const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];
    
    const balance = await withRetry(async (provider) => {
      const usdc = new ethers.Contract(USDC_E, ERC20_ABI, provider);
      return await usdc.balanceOf(WALLET);
    }, 2);
    
    state.walletBalance = parseFloat(ethers.utils.formatUnits(balance, 6));
  } catch (error) {
    // Silent fail - will retry on next fetch
  }
}

// ============ Chainlink Price Feeds (Same source as Polymarket) ============
// Polymarket uses Chainlink data streams for resolution
// See: https://data.chain.link/streams/btc-usd
const CHAINLINK_FEEDS: Record<CryptoAsset, string> = {
  BTC: '0xc907E116054Ad103354f2D350FD2514433D57F6f', // BTC/USD on Polygon
  ETH: '0xF9680D99D6C9589e2a93a78A04A279e509205945', // ETH/USD on Polygon  
  SOL: '0x10C8264C0935b3B9870013e057f330Ff3e9C56dC', // SOL/USD on Polygon (proxy)
};

const CHAINLINK_ABI = [
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
  'function decimals() view returns (uint8)'
];

let chainlinkProvider: any = null;

async function getChainlinkProvider() {
  if (!chainlinkProvider) {
    const { ethers } = await import('ethers');
    const { getSimpleProvider } = await import('./rpc.js');
    chainlinkProvider = getSimpleProvider();
  }
  return chainlinkProvider;
}

async function fetchChainlinkPrice(asset: CryptoAsset): Promise<number | null> {
  try {
    const { ethers } = await import('ethers');
    const provider = await getChainlinkProvider();
    const feedAddress = CHAINLINK_FEEDS[asset];
    
    const feed = new ethers.Contract(feedAddress, CHAINLINK_ABI, provider);
    const [, answer] = await feed.latestRoundData();
    const decimals = await feed.decimals();
    const price = parseFloat(ethers.utils.formatUnits(answer, decimals));
    
    return price;
  } catch (error: any) {
    // Silent fail - will use cached price
    return null;
  }
}

// ============ Price Fetching ============
async function fetchPrices(): Promise<void> {
  try {
    // Fetch from Chainlink (same source Polymarket uses for resolution)
    const [btcPrice, ethPrice, solPrice] = await Promise.all([
      fetchChainlinkPrice('BTC'),
      fetchChainlinkPrice('ETH'),
      fetchChainlinkPrice('SOL'),
    ]);
    
    // Also fetch wallet balance
    fetchWalletBalance();
    
    // Update prices (keep old value if fetch failed)
    if (btcPrice !== null) state.prices.BTC = btcPrice;
    if (ethPrice !== null) state.prices.ETH = ethPrice;
    if (solPrice !== null) state.prices.SOL = solPrice;
    
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
  // Check maintenance mode - no new bets during maintenance
  if (state.maintenanceMode) return false;
  
  // Check global halt
  if (state.globalHalt) return false;
  
  // Check market halt (but live mode has its own check later)
  if (marketState.halted && !strategy.liveMode) return false;
  
  // Check strategy halt for PAPER mode only (live has its own liveHalted flag)
  if (strategy.halted && !strategy.liveMode) return false;
  
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

// Helper to add log entry to a strategy (keeps last 100 logs)
function addStrategyLog(strategy: StrategyState, type: StrategyLog['type'], message: string, data?: any): void {
  const log: StrategyLog = {
    time: new Date().toLocaleTimeString(),
    type,
    message,
    data,
  };
  strategy.logs.push(log);
  // Keep only last 100 logs
  if (strategy.logs.length > 100) {
    strategy.logs = strategy.logs.slice(-100);
  }
}

async function placeBet(marketState: MarketState, strategy: StrategyState, amount: number, probability: number): Promise<void> {
  // Check if we can place bet
  if (!canPlaceBet(marketState, strategy)) return;
  
  const market = strategy.currentMarket!;
  const price = Math.max(0.45, probability - 0.03);
  const shares = Math.floor(amount / price);
  
  // ============ LIVE MODE: Real money from wallet ============
  if (strategy.liveMode) {
    // Check live-specific halt (separate from paper halt)
    if (strategy.liveHalted) {
      console.log(`   🛑 [${strategy.name}] Live trading halted: ${strategy.liveHaltedReason || 'manual'}`);
      return;
    }
    
    // Calculate ACTUAL available funds (budget minus what's locked in pending bets)
    const availableBudget = strategy.liveBalance - strategy.lockedFunds;
    const availableWallet = state.walletBalance;
    
    // Log current state for debugging
    console.log(`   📊 [${strategy.name}] Budget: $${strategy.liveBalance.toFixed(2)}, Locked: $${strategy.lockedFunds.toFixed(2)}, Available: $${availableBudget.toFixed(2)}, Wallet: $${availableWallet.toFixed(2)}`);
    
    const stopLossThreshold = strategy.liveAllocation * 0.10; // 10% of initial allocation
    
    // Check if total balance (including locked) has dropped below stop-loss
    if (strategy.liveBalance < stopLossThreshold) {
      addStrategyLog(strategy, 'error', `🛑 LIVE HALTED: Budget depleted - $${strategy.liveBalance.toFixed(2)} < 10% of $${strategy.liveAllocation}`);
      strategy.liveHalted = true;
      strategy.liveHaltedReason = `Budget < 10% ($${strategy.liveBalance.toFixed(2)}/$${strategy.liveAllocation})`;
      sendTelegramAlert(`🛑 *LIVE STRATEGY HALTED*\n\n${marketState.key} ${strategy.name}\n\nBudget depleted!\n$${strategy.liveBalance.toFixed(2)} remaining (< 10% of $${strategy.liveAllocation})\n\nStop-loss triggered.`);
      return;
    }
    
    // Cap bet to available wallet balance AND strategy's AVAILABLE balance (not locked funds)
    // Also cap to MAX_BET_PCT of AVAILABLE budget to prevent over-betting
    const MAX_BET_PCT = 0.42; // Max ~42% of available budget per bet
    const maxBetFromBudget = availableBudget * MAX_BET_PCT;
    let liveBetAmount = Math.min(amount, availableWallet, availableBudget, maxBetFromBudget);
    
    if (liveBetAmount < amount) {
      console.log(`   🔒 [${strategy.name}] Bet capped: $${amount.toFixed(2)} → $${liveBetAmount.toFixed(2)} (max ${MAX_BET_PCT * 100}% of $${availableBudget.toFixed(2)} available)`);
    }
    
    // Minimum $3 to ensure 5+ shares at typical prices (50¢)
    if (liveBetAmount < 3) {
      // Check WHY we can't bet
      if (strategy.liveBalance < 1) {
        // Total budget exhausted - HALT LIVE ONLY
        addStrategyLog(strategy, 'error', `🛑 LIVE HALTED: Live budget exhausted ($${strategy.liveBalance.toFixed(2)} remaining)`);
        strategy.liveHalted = true;
        strategy.liveHaltedReason = 'Budget exhausted';
        sendTelegramAlert(`🛑 *LIVE STRATEGY HALTED*\n\n${marketState.key} ${strategy.name}\n\nBudget exhausted ($${strategy.liveBalance.toFixed(2)} remaining)\n\nStrategy stopped.`);
      } else if (availableBudget < 1) {
        // Funds locked in pending bets - skip this round but don't halt
        addStrategyLog(strategy, 'info', `⏳ Skipping - funds locked in pending bets ($${strategy.lockedFunds.toFixed(2)} pending, ${strategy.pendingBets.length} bets)`);
        console.log(`   ⏳ [${strategy.name}] Skipping - $${strategy.lockedFunds.toFixed(2)} locked in ${strategy.pendingBets.length} pending bets`);
        // Don't halt - just skip this round
      } else if (availableWallet < 1) {
        addStrategyLog(strategy, 'error', `⚠️ Wallet empty ($${availableWallet.toFixed(2)}) - waiting for redemption`);
        console.log(`   ⚠️ [${strategy.name}] Wallet empty - waiting for redemptions`);
        // Don't halt - wallet will refill after redemption
      }
      // Don't continue to paper trading - live mode means live only
      return;
    } else {
      addStrategyLog(strategy, 'bet', `🔴 LIVE bet: $${liveBetAmount} @ ${(price * 100).toFixed(0)}¢ (wallet: $${availableWallet.toFixed(2)})`, { amount: liveBetAmount, price });
      
      try {
        // Find the actual Polymarket market
        addStrategyLog(strategy, 'clob', `Finding ${marketState.asset} ${marketState.timeframe} market on Polymarket...`);
        const liveMarket = await liveTrading.findMarket(marketState.asset, marketState.timeframe);
        
        if (!liveMarket) {
          addStrategyLog(strategy, 'error', `No active ${marketState.asset} ${marketState.timeframe} market found`);
          console.log(`   ⚠️ [LIVE] No active ${marketState.asset} ${marketState.timeframe} market found`);
        } else {
          addStrategyLog(strategy, 'clob', `Found market: ${liveMarket.title || liveMarket.slug}...`);
          
          // Determine direction based on strategy decision
          const side = market.side || 'Up';
          const tokenId = side === 'Up' ? liveMarket.upTokenId : liveMarket.downTokenId;
          
          // Use ACTUAL market price (not our calculated probability)
          const marketPrice = side === 'Up' ? liveMarket.upPrice : liveMarket.downPrice;
          const bidPrice = Math.min(0.95, marketPrice + 0.01); // Bid 1¢ above market for better fill
          
          addStrategyLog(strategy, 'clob', `Market price: ${(marketPrice * 100).toFixed(0)}¢, bidding: ${(bidPrice * 100).toFixed(0)}¢`);
          
          // Place the real order at market price
          addStrategyLog(strategy, 'clob', `Sending CLOB order: ${side} $${liveBetAmount} @ ${(bidPrice * 100).toFixed(0)}¢`);
          
          // Use multi-phase execution for better fill rates (handles FOK rejections)
          const result = USE_MULTI_PHASE_ORDERS
            ? await liveTrading.placeOrderWithRetry(tokenId, side, liveBetAmount, bidPrice, ORDER_RETRY_CONFIG)
            : await liveTrading.placeOrder(tokenId, side, liveBetAmount, bidPrice);
          
          if (result.success) {
            // Use ACTUAL fill data, not intended amounts
            const actualShares = result.shares || Math.floor(liveBetAmount / bidPrice);
            const actualPrice = result.price || bidPrice;
            const actualCost = actualShares * actualPrice; // What we ACTUALLY paid
            
            // Single clear fill log line
            const shortOrderId = result.orderId ? `[${result.orderId.substring(0, 10)}...]` : '';
            const newLockedTotal = strategy.lockedFunds + actualCost;
            const fillLogLine = `✅ BET ${side} @ $${actualPrice.toFixed(2)} x ${actualShares.toFixed(0)} shares = $${actualCost.toFixed(2)} | Locked: $${newLockedTotal.toFixed(2)}`;
            console.log(`   ${fillLogLine} ${shortOrderId}`);
            addStrategyLog(strategy, 'fill', fillLogLine, { orderId: result.orderId, shares: actualShares, price: actualPrice, cost: actualCost });
            sendTelegramAlert(`✅ *BET PLACED*\n\n${marketState.key} ${strategy.name}\n${side} @ $${actualPrice.toFixed(2)} x ${actualShares.toFixed(0)} shares\nCost: $${actualCost.toFixed(2)}\nLocked: $${newLockedTotal.toFixed(2)}`);
            
            // Track live deployed and deduct from live balance using ACTUAL cost
            strategy.liveDeployed += actualCost;
            strategy.liveBalance -= actualCost;
            
            // Track in current market state for UI display
            market.bets.push({
              minute: Date.now(),
              amount: actualCost,
              executed: true,
              shares: actualShares,
              price: actualPrice,
            });
            market.costBet += actualCost;
            market.shares += actualShares;
            market.avgPrice = market.costBet / market.shares;
            market.fills++;
            
            // Record bet for auto-redemption AND tracking
            if (liveMarket.conditionId) {
              recordBet(liveMarket.conditionId, tokenId, liveMarket.slug || liveMarket.title, side);
              
              // Track with new bet tracker for complete lifecycle (use ACTUAL values)
              const trackedBet = trackBetPlaced({
                orderId: result.orderId || `unknown_${Date.now()}`,
                strategyId: strategy.id,
                marketKey: marketState.key,
                marketSlug: liveMarket.slug || liveMarket.title,
                conditionId: liveMarket.conditionId,
                tokenId: tokenId,
                side: side as 'Up' | 'Down',
                betAmount: actualCost,  // ACTUAL cost, not intended
                price: actualPrice,
                shares: actualShares,
              });
              
              // Mark as filled immediately since we got shares
              if (result.orderId && actualShares > 0) {
                trackBetFilled(result.orderId, actualShares, actualPrice);
              }
            }
            
            // Save live bet to database for tracking (use ACTUAL values)
            const liveBetId = db.saveLiveBet({
              strategy_id: strategy.id,
              market_key: marketState.key,
              market_id: marketState.currentMarket?.id || '',
              condition_id: liveMarket.conditionId,
              token_id: tokenId,
              order_id: result.orderId,
              side: side as 'Up' | 'Down',
              amount: actualCost,  // ACTUAL cost
              price: actualPrice,
              shares: actualShares,
              status: 'pending',
            });
            
            // Track this bet as pending - funds are now locked (use ACTUAL cost)
            strategy.pendingBets.push({
              conditionId: liveMarket.conditionId || '',
              tokenId: tokenId,
              betAmount: actualCost,  // ACTUAL cost
              expectedPayout: actualShares, // Max payout if we win ($1/share)
              marketResolved: false,
              won: null,
              timestamp: Date.now(),
              // Dashboard display fields
              time: new Date().toLocaleTimeString(),
              side: side,
              shares: actualShares,
              amount: actualCost,  // ACTUAL cost
            });
            strategy.lockedFunds += actualCost;
            
            db.dbLog.info('live', `Live bet placed: ${side} ${actualShares.toFixed(2)} shares @ ${(actualPrice * 100).toFixed(1)}¢ = $${actualCost.toFixed(2)}`, {
              betId: liveBetId,
              orderId: result.orderId,
              shares: actualShares,
              price: actualPrice,
            }, strategy.id, marketState.key);
          } else {
            addStrategyLog(strategy, 'error', `❌ Order failed: ${result.error}`, { error: result.error });
            console.log(`   ❌ [LIVE] Order failed: ${result.error}`);
            sendTelegramAlert(`❌ *ORDER FAILED*\n\n${marketState.key} ${strategy.name}\n$${liveBetAmount} ${side}\nError: ${result.error}`);
          }
        }
      } catch (error: any) {
        addStrategyLog(strategy, 'error', `❌ Exception: ${error.message}`, { error: error.message });
        console.error(`   ❌ [LIVE] Error:`, error.message);
      }
    }
  }
  
  // ============ PAPER MODE ONLY ============
  // Live mode strategies don't run paper simulation - they're live only
  if (strategy.liveMode) {
    // Live mode handled above - don't run paper simulation
    return;
  }
  
  // Global paper trading toggle
  if (!PAPER_TRADING_ENABLED) {
    return;  // Paper trading disabled globally
  }
  
  // Paper trading simulation
  if (strategy.balance < amount) {
    amount = Math.floor(strategy.balance);
    if (amount < 1) return;
  }
  
  addStrategyLog(strategy, 'bet', `📄 Paper bet: $${amount} @ ${(price * 100).toFixed(0)}¢ (${shares} shares)`);
  
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
  
  // Deduct from paper balance (simulation tracking)
  strategy.balance -= amount;
  strategy.deployed += amount;
}

// ============ Market Management ============
async function startMarket(marketState: MarketState): Promise<void> {
  const now = Date.now();
  const duration = getDurationMinutes(marketState.timeframe);
  
  // Align to Polymarket's actual market windows (5min = :00, :05, :10, etc.)
  const windowMs = marketState.durationMs;
  const alignedStart = Math.floor(now / windowMs) * windowMs;
  const alignedEnd = alignedStart + windowMs;
  
  // Check if we're too far into the current cycle (>1 min) - wait for next one
  const elapsedInCycle = now - alignedStart;
  const maxEntryTime = 60 * 1000; // 1 minute max to enter
  
  if (elapsedInCycle > maxEntryTime) {
    const waitTime = alignedEnd - now + 5000; // Wait until next cycle + 5s buffer
    console.log(`   ⏳ [${marketState.key}] Too late to enter (${(elapsedInCycle/1000).toFixed(0)}s in), waiting ${(waitTime/1000).toFixed(0)}s for next cycle...`);
    setTimeout(() => startMarket(marketState), waitTime);
    return;
  }
  
  const marketId = `${marketState.key}-${alignedStart}`;
  
  // Fetch fresh price at candle start for accurate "price to beat"
  const freshOpenPrice = await fetchChainlinkPrice(marketState.asset) || marketState.currentPrice;
  
  marketState.currentMarket = {
    id: marketId,
    title: `${marketState.asset} ${duration}min - ${new Date(alignedStart).toLocaleTimeString()}`,
    startTime: alignedStart,
    endTime: alignedEnd,
    openPrice: freshOpenPrice,
  };
  
  // Update the market's current price too
  if (freshOpenPrice) {
    marketState.currentPrice = freshOpenPrice;
    state.prices[marketState.asset] = freshOpenPrice;
  }
  
  console.log(`   ⏰ Aligned to Polymarket window: ${new Date(alignedStart).toLocaleTimeString()} - ${new Date(alignedEnd).toLocaleTimeString()}`);
  
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

// Track pending background resolutions
interface PendingResolution {
  marketKey: string;
  marketSlug: string;
  conditionId?: string;
  openPrice: number;
  closePrice: number;
  priceBasedUp: boolean;
  strategies: Array<{
    id: string;
    side: 'Up' | 'Down';
    shares: number;
    costBet: number;
    avgPrice: number;
    liveMode: boolean;
    liveDeployed: number;
  }>;
  startTime: number;
}
const pendingResolutions: PendingResolution[] = [];

// Background polling for market resolution
async function pollForResolution(pending: PendingResolution): Promise<void> {
  const maxAttempts = 20;  // Max 20 attempts
  const pollIntervalMs = 15000;  // Poll every 15 seconds
  
  console.log(`🔄 [Background] Starting resolution polling for ${pending.marketSlug}`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Get market info
      const marketInfo = await getMarketBySlug(pending.marketSlug);
      if (!marketInfo?.conditionId) {
        console.log(`   [${attempt}/${maxAttempts}] Market not found yet...`);
        await new Promise(r => setTimeout(r, pollIntervalMs));
        continue;
      }
      
      pending.conditionId = marketInfo.conditionId;
      
      // Check if resolved
      const outcome = await checkMarketOutcome(marketInfo.conditionId);
      if (!outcome) {
        console.log(`   [${attempt}/${maxAttempts}] Not resolved yet, waiting ${pollIntervalMs/1000}s...`);
        await new Promise(r => setTimeout(r, pollIntervalMs));
        continue;
      }
      
      // RESOLVED! Log and update P&L
      const wentUp = outcome === 'Up';
      console.log(`✅ [Background] Market resolved: ${pending.marketSlug} → ${outcome.toUpperCase()}`);
      
      // Check if Polymarket disagrees with our price prediction
      if (wentUp !== pending.priceBasedUp) {
        console.log(`   ⚠️ Polymarket says ${outcome}, we predicted ${pending.priceBasedUp ? 'UP' : 'DOWN'} - MISMATCH!`);
      }
      
      // Update each strategy with actual results
      for (const stratData of pending.strategies) {
        const marketState = state.markets.find(m => m.key === pending.marketKey);
        const strategy = marketState?.strategies.find(s => s.id === stratData.id);
        if (!strategy) continue;
        
        const won = (wentUp && stratData.side === 'Up') || (!wentUp && stratData.side === 'Down');
        const payout = won ? stratData.shares : 0;
        const pnl = payout - stratData.costBet;
        
        // Log final result
        const modeLabel = stratData.liveMode ? '🔴 LIVE' : '📄 Paper';
        console.log(`   ${modeLabel} ${strategy.name}: ${won ? 'WIN' : 'LOSS'} | Cost=$${stratData.costBet.toFixed(2)} Payout=$${payout.toFixed(2)} | P&L=$${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`);
        addStrategyLog(strategy, 'resolve', 
          `${modeLabel} CONFIRMED: ${outcome} | ${won ? 'WIN' : 'LOSS'} | Cost=$${stratData.costBet.toFixed(2)} Payout=$${payout.toFixed(2)} | P&L=$${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`,
          { outcome, won, pnl, payout, cost: stratData.costBet }
        );
        
        // Send telegram alert with actual result
        if (stratData.liveMode) {
          sendTelegramAlert(`${won ? '✅' : '❌'} *RESOLVED: ${outcome}*\n\n${pending.marketKey} ${strategy.name}\nBet: ${stratData.side} | Result: ${won ? 'WIN' : 'LOSS'}\nCost: $${stratData.costBet.toFixed(2)}\nPayout: $${payout.toFixed(2)}\nP&L: $${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`);
        }
      }
      
      // Remove from pending
      const idx = pendingResolutions.indexOf(pending);
      if (idx >= 0) pendingResolutions.splice(idx, 1);
      
      saveState();
      broadcastState();
      return;
      
    } catch (error: any) {
      console.log(`   [${attempt}/${maxAttempts}] Error polling: ${error.message}`);
      await new Promise(r => setTimeout(r, pollIntervalMs));
    }
  }
  
  console.log(`❌ [Background] Resolution polling timed out for ${pending.marketSlug} after ${maxAttempts} attempts`);
  // Remove from pending even on timeout
  const idx = pendingResolutions.indexOf(pending);
  if (idx >= 0) pendingResolutions.splice(idx, 1);
}

async function endMarket(marketState: MarketState): Promise<void> {
  if (!marketState.currentMarket) return;
  
  if (marketState.tradingTimer) {
    clearInterval(marketState.tradingTimer);
    marketState.tradingTimer = null;
  }
  
  const openPrice = marketState.currentMarket.openPrice;
  const closePrice = marketState.currentPrice;
  
  // Our price-based prediction (for quick display)
  const priceBasedUp = closePrice >= openPrice;
  
  console.log(`\n📊 [${marketState.key}] Ended - Price says ${priceBasedUp ? 'UP' : 'DOWN'}`);
  console.log(`   $${openPrice.toLocaleString()} → $${closePrice.toLocaleString()}`);
  
  // Build the Polymarket slug
  const assetLower = marketState.asset.toLowerCase();
  const tfLabel = marketState.timeframe === '5min' ? '5m' : '15m';
  const windowTimestamp = Math.floor(marketState.currentMarket.startTime / 1000);
  const marketSlug = `${assetLower}-updown-${tfLabel}-${windowTimestamp}`;
  
  // Collect strategy data for background resolution
  const strategiesData: PendingResolution['strategies'] = [];
  for (const strategy of marketState.strategies) {
    const strategyMarket = strategy.currentMarket;
    if (strategyMarket && strategyMarket.fills > 0) {
      strategiesData.push({
        id: strategy.id,
        side: strategyMarket.side || 'Up',
        shares: strategyMarket.shares,
        costBet: strategyMarket.costBet,
        avgPrice: strategyMarket.avgPrice,
        liveMode: strategy.liveMode,
        liveDeployed: strategy.liveDeployed,
      });
    }
  }
  
  // Start background resolution polling (non-blocking)
  if (strategiesData.length > 0) {
    const pending: PendingResolution = {
      marketKey: marketState.key,
      marketSlug,
      openPrice,
      closePrice,
      priceBasedUp,
      strategies: strategiesData,
      startTime: Date.now(),
    };
    pendingResolutions.push(pending);
    
    // Log that we're starting background polling
    const windowSeconds = marketState.timeframe === '5min' ? 300 : 900;
    console.log(`   🔄 Background resolve: waiting ~${windowSeconds}s for ${marketSlug} to settle on Polymarket`);
    
    // Start polling in background (don't await)
    setTimeout(() => pollForResolution(pending), 30000); // Start polling after 30s
  }
  
  // Continue immediately with price-based prediction for UI (will be corrected by background poll)
  const wentUp = priceBasedUp;
  const outcomeSource = 'price (awaiting Polymarket confirmation)';
  
  console.log(`   📊 Final result: ${wentUp ? 'UP' : 'DOWN'} (source: ${outcomeSource})`);
  
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
    
    // Log market resolution
    const modeLabel = strategy.liveMode ? '🔴 LIVE' : '📄 Paper';
    addStrategyLog(strategy, 'resolve', 
      `${modeLabel} resolved: ${wentUp ? 'UP' : 'DOWN'} | Bet: ${strategyMarket.side} | ${won ? 'WIN' : 'LOSS'} | P&L: $${pnl.toFixed(2)}`,
      { wentUp, picked: strategyMarket.side, won, pnl, payout, cost: strategyMarket.costBet, live: strategy.liveMode }
    );
    
    // Paper trading stats (always tracked for comparison)
    strategy.totalMarkets++;
    strategy.totalPnl += pnl;
    strategy.balance += payout;
    
    if (won) strategy.wins++;
    else strategy.losses++;
    
    strategy.winRate = strategy.totalMarkets > 0 ? Math.round((strategy.wins / strategy.totalMarkets) * 100) : 0;
    strategy.roi = strategy.deployed > 0 ? (strategy.totalPnl / strategy.deployed) * 100 : 0;
    
    // Paper history
    const tradeRecord = {
      id: `${marketState.currentMarket.id}-${strategy.id}`,
      time: new Date().toLocaleTimeString(),
      marketId: marketState.currentMarket.id,
      side: strategyMarket.side || 'Up' as const,
      shares: strategyMarket.shares,
      cost: strategyMarket.costBet,
      payout,
      pnl,
      result: won ? 'WIN' as const : 'LOSS' as const,
      assetOpen: openPrice,
      assetClose: closePrice,
    };
    
    strategy.history.unshift(tradeRecord);
    strategy.history = strategy.history.slice(0, 50);
    
    // Save trade to database
    db.saveTrade({
      id: tradeRecord.id,
      strategy_id: strategy.id,
      market_key: marketState.key,
      market_id: tradeRecord.marketId,
      side: tradeRecord.side,
      shares: tradeRecord.shares,
      cost: tradeRecord.cost,
      payout: tradeRecord.payout,
      pnl: tradeRecord.pnl,
      result: tradeRecord.result,
      asset_open: tradeRecord.assetOpen,
      asset_close: tradeRecord.assetClose,
      is_live: strategy.liveMode,
    });
    
    const cumulative = strategy.pnlHistory.length > 0 
      ? strategy.pnlHistory[strategy.pnlHistory.length - 1].cumulative + pnl 
      : pnl;
    strategy.pnlHistory.push({ market: strategy.totalMarkets, pnl, cumulative });
    
    // Live trading stats (only if live mode and actually deployed live funds)
    if (strategy.liveMode && strategy.liveDeployed > 0) {
      // Estimate live P&L based on what was deployed
      const liveBetThisMarket = strategyMarket.costBet; // This was deployed live
      const livePayout = won ? Math.floor(liveBetThisMarket / strategyMarket.avgPrice) : 0;
      const liveMarketPnl = livePayout - liveBetThisMarket;
      
      // DON'T update liveWins/liveLosses or livePnl here based on prediction!
      // The chain is the source of truth - let BetTracker verify from actual token balances.
      // Just mark pending bets as "awaiting chain confirmation"
      for (const pending of strategy.pendingBets) {
        if (!pending.marketResolved) {
          pending.marketResolved = true;
          pending.won = null; // NULL = awaiting chain confirmation
          pending.expectedPayout = won ? livePayout : 0;
          pending.predictedWon = won; // Store prediction for logging only
        }
      }
      
      // Log prediction but note it's awaiting chain confirmation
      const predictionEmoji = won ? '📈' : '📉';
      addStrategyLog(strategy, 'info', `${predictionEmoji} Prediction: ${won ? 'WIN' : 'LOSS'} - awaiting chain confirmation (locked: $${strategy.lockedFunds.toFixed(2)})`);
      
      // DON'T update liveWins/liveLosses/livePnl here - wait for chain confirmation
      // DON'T unlock funds - wait for chain confirmation
      
      strategy.liveHistory.unshift({
        ...tradeRecord,
        id: `${tradeRecord.id}-live`,
        pnl: liveMarketPnl,
        payout: livePayout,
      });
      strategy.liveHistory = strategy.liveHistory.slice(0, 50);
      
      // Alert on live trade resolution
      const emoji = won ? '✅' : '❌';
      const budgetNote = won 
        ? `Awaiting redemption of $${livePayout}` 
        : `Budget: $${strategy.liveBalance.toFixed(2)}/$${strategy.liveAllocation}`;
      sendTelegramAlert(`${emoji} *LIVE TRADE RESOLVED*\n\n${marketState.key} ${strategy.name}\n${wentUp ? 'UP' : 'DOWN'} | ${won ? 'WIN' : 'LOSS'}\nP&L: ${liveMarketPnl >= 0 ? '+' : ''}$${liveMarketPnl.toFixed(2)}\n\n${budgetNote}\nRecord: ${strategy.liveWins}W / ${strategy.liveLosses}L`);
    }
    
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
  
  // Auto-redeem any winning positions to USDC.e
  if (process.env.PRIVATE_KEY) {
    console.log(`   🔄 Checking for redeemable winnings...`);
    redeemAllWinnings(process.env.PRIVATE_KEY).then(result => {
      if (result.redeemed > 0) {
        console.log(`   ✅ Redeemed $${result.redeemed.toFixed(2)} to USDC.e`);
        sendTelegramAlert(`💰 *AUTO-REDEEMED*\n$${result.redeemed.toFixed(2)} converted to USDC.e`);
        
        // CRITICAL: Clear pending bets for redeemed conditions and update liveBalance
        for (const redeemed of result.redeemedConditions) {
          for (const market of state.markets) {
            for (const strategy of market.strategies) {
              // Find matching pending bet
              const pendingIdx = strategy.pendingBets.findIndex(b => b.conditionId === redeemed.conditionId);
              if (pendingIdx >= 0) {
                const pending = strategy.pendingBets[pendingIdx];
                // Redemption complete - add redeemed amount to balance and unlock
                strategy.liveBalance += redeemed.amount;
                strategy.lockedFunds = Math.max(0, strategy.lockedFunds - pending.betAmount);
                // Remove from pending
                strategy.pendingBets.splice(pendingIdx, 1);
                addStrategyLog(strategy, 'fill', `✅ Redeemed! +$${redeemed.amount.toFixed(2)} | Available: $${(strategy.liveBalance - strategy.lockedFunds).toFixed(2)}`);
                console.log(`   💰 [${strategy.name}] Redeemed $${redeemed.amount.toFixed(2)}, unlocked $${pending.betAmount.toFixed(2)}, available: $${(strategy.liveBalance - strategy.lockedFunds).toFixed(2)}`);
              }
            }
          }
        }
        saveState();
      }
    }).catch(err => console.error('Redeem error:', err.message));
  }
  
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
      walletBalance: state.walletBalance,
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
          liveHalted: s.liveHalted,
          liveHaltedReason: s.liveHaltedReason,
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
    state.maintenanceMode = false;  // Also exit maintenance mode
    state.maintenanceSince = null;
    saveState();
    broadcastState();
    sendTelegramAlert('▶️ *TRADING RESUMED*\n\nAll markets active again.');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Trading resumed', globalHalt: false }));
    return;
  }

  // ============ MAINTENANCE MODE ENDPOINTS ============
  if (url === '/api/poly/maintenance' && req.method === 'POST') {
    state.maintenanceMode = true;
    state.maintenanceSince = Date.now();
    saveState();
    broadcastState();
    sendTelegramAlert('🔧 *MAINTENANCE MODE*\n\nNo new bets will be placed.\nWaiting for current positions to resolve before restart.');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Maintenance mode enabled', maintenanceMode: true }));
    return;
  }

  if (url === '/api/poly/maintenance/status') {
    // Check if safe to restart
    let totalPending = 0;
    let totalLocked = 0;
    const activeMarkets: string[] = [];
    
    for (const market of state.markets) {
      if (market.currentMarket) {
        activeMarkets.push(`${market.key} (${(market.currentMarket.durationMinutes - market.currentMarket.elapsed).toFixed(1)}m left)`);
      }
      for (const strategy of market.strategies) {
        totalPending += strategy.pendingBets?.length || 0;
        totalLocked += strategy.lockedFunds || 0;
      }
    }
    
    const safeToRestart = totalPending === 0 && totalLocked === 0 && activeMarkets.length === 0;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      maintenanceMode: state.maintenanceMode,
      since: state.maintenanceSince,
      safeToRestart,
      pendingBets: totalPending,
      lockedFunds: totalLocked,
      activeMarkets,
      recommendation: safeToRestart 
        ? '✅ Safe to restart now' 
        : `⏳ Wait for: ${totalPending} pending bets, $${totalLocked.toFixed(0)} locked, ${activeMarkets.length} active markets`
    }));
    return;
  }

  if (url === '/api/poly/safe-restart' && req.method === 'POST') {
    // Enter maintenance mode and prepare for restart
    state.maintenanceMode = true;
    state.maintenanceSince = Date.now();
    saveState();
    broadcastState();
    
    // Check if already safe
    let totalPending = 0;
    let totalLocked = 0;
    
    for (const market of state.markets) {
      for (const strategy of market.strategies) {
        totalPending += strategy.pendingBets?.length || 0;
        totalLocked += strategy.lockedFunds || 0;
      }
    }
    
    const safeNow = totalPending === 0 && totalLocked === 0;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      maintenanceMode: true,
      safeToRestart: safeNow,
      pendingBets: totalPending,
      lockedFunds: totalLocked,
      message: safeNow 
        ? 'Safe to restart now! Run: pm2 restart polymarket-multi'
        : `Maintenance mode enabled. Poll /api/poly/maintenance/status until safe.`
    }));
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
      startingBalance: 4800,
      roi: ((totalBalance - 4800) / 4800 * 100).toFixed(1) + '%',
      withdrawnFunds: alertConfig.withdrawnFunds,
      markets: marketSummary.sort((a, b) => b.pnl - a.pnl),
      alertsEnabled: alertConfig.enabled,
    }));
    return;
  }
  
  // Database logs endpoint for debugging
  if (url?.startsWith('/api/poly/logs')) {
    const params = new URLSearchParams(url.split('?')[1] || '');
    const level = params.get('level') as db.LogLevel | null;
    const category = params.get('category') as db.LogCategory | null;
    const strategyId = params.get('strategy');
    const limit = parseInt(params.get('limit') || '100');
    
    const logs = db.queryLogs({
      level: level || undefined,
      category: category || undefined,
      strategyId: strategyId || undefined,
      limit,
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ logs, count: logs.length }));
    return;
  }
  
  // Database stats endpoint
  if (url === '/api/poly/db-stats') {
    const stats = db.getDbStats();
    const pendingBets = db.loadPendingLiveBets();
    const liveBetStats = db.getLiveBetsStats();
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ...stats, pendingBets, liveBetStats }));
    return;
  }
  
  // Live trades report - recent live bet history
  if (url?.startsWith('/api/poly/live-trades')) {
    const params = new URLSearchParams(url.split('?')[1] || '');
    const limit = parseInt(params.get('limit') || '50');
    
    const recentBets = getRecentHistory(limit);
    const stats = getBetTrackerStats();
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      trades: recentBets,
      stats,
      timestamp: new Date().toISOString(),
    }));
    return;
  }
  
  // Complete live report with strategy breakdown
  if (url === '/api/poly/live-report') {
    const liveStrategies: any[] = [];
    
    for (const market of state.markets) {
      for (const strategy of market.strategies) {
        if (strategy.liveMode) {
          liveStrategies.push({
            market: market.key,
            strategy: strategy.name,
            id: strategy.id,
            allocation: strategy.liveAllocation,
            balance: strategy.liveBalance,
            lockedFunds: strategy.lockedFunds,
            available: strategy.liveBalance - strategy.lockedFunds,
            pnl: strategy.livePnl,
            wins: strategy.liveWins,
            losses: strategy.liveLosses,
            winRate: strategy.liveWins + strategy.liveLosses > 0 
              ? ((strategy.liveWins / (strategy.liveWins + strategy.liveLosses)) * 100).toFixed(1) + '%'
              : '—',
            halted: strategy.liveHalted,
            haltReason: strategy.liveHaltedReason,
            pendingBets: strategy.pendingBets.length,
          });
        }
      }
    }
    
    const totals = {
      totalAllocation: liveStrategies.reduce((sum, s) => sum + s.allocation, 0),
      totalBalance: liveStrategies.reduce((sum, s) => sum + s.balance, 0),
      totalLocked: liveStrategies.reduce((sum, s) => sum + s.lockedFunds, 0),
      totalAvailable: liveStrategies.reduce((sum, s) => sum + s.available, 0),
      totalPnl: liveStrategies.reduce((sum, s) => sum + s.pnl, 0),
      totalWins: liveStrategies.reduce((sum, s) => sum + s.wins, 0),
      totalLosses: liveStrategies.reduce((sum, s) => sum + s.losses, 0),
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      walletBalance: state.walletBalance,
      strategies: liveStrategies.sort((a, b) => b.pnl - a.pnl),
      totals,
      timestamp: new Date().toISOString(),
    }));
    return;
  }
  
  // Paper trading report - separate from live
  if (url === '/api/poly/paper-report') {
    const paperStrategies: any[] = [];
    
    for (const market of state.markets) {
      for (const strategy of market.strategies) {
        if (!strategy.liveMode) {
          paperStrategies.push({
            market: market.key,
            strategy: strategy.name,
            id: strategy.id,
            startingBalance: strategy.startingBalance,
            balance: strategy.balance,
            pnl: strategy.totalPnl,
            roi: strategy.roi.toFixed(1) + '%',
            wins: strategy.wins,
            losses: strategy.losses,
            winRate: strategy.winRate + '%',
            halted: strategy.halted,
            haltReason: strategy.haltedReason,
            markets: strategy.totalMarkets,
          });
        }
      }
    }
    
    const totals = {
      totalStarting: paperStrategies.reduce((sum, s) => sum + s.startingBalance, 0),
      totalBalance: paperStrategies.reduce((sum, s) => sum + s.balance, 0),
      totalPnl: paperStrategies.reduce((sum, s) => sum + s.pnl, 0),
      totalWins: paperStrategies.reduce((sum, s) => sum + s.wins, 0),
      totalLosses: paperStrategies.reduce((sum, s) => sum + s.losses, 0),
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      strategies: paperStrategies.sort((a, b) => b.pnl - a.pnl),
      totals,
      timestamp: new Date().toISOString(),
    }));
    return;
  }
  
  // RPC health endpoint
  if (url === '/api/poly/rpc-health') {
    import('./rpc.js').then(rpc => {
      const health = rpc.getRpcHealth();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        rpcs: Object.entries(health).map(([url, stats]) => ({
          url: url.substring(0, 50) + (url.length > 50 ? '...' : ''),
          failures: stats.failures,
          lastSuccess: new Date(stats.lastSuccess).toISOString(),
        })).sort((a, b) => a.failures - b.failures)
      }));
    }).catch(() => {
      res.writeHead(500);
      res.end('RPC module not loaded');
    });
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
        if (typeof data.gainThreshold === 'number') alertConfig.gainPercentThreshold = data.gainThreshold;
        if (typeof data.lossThreshold === 'number') alertConfig.lossPercentThreshold = data.lossThreshold;
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

  // Enable/disable live trading for a strategy
  if (url === '/api/poly/live' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        // data: { market: "ETH-5min", strategy: "vol-regime", live: true, funding: 40 }
        
        const market = state.markets.find(m => m.key === data.market);
        if (!market) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Market not found' }));
          return;
        }
        
        const strategy = market.strategies.find(s => s.id === data.strategy);
        if (!strategy) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Strategy not found' }));
          return;
        }
        
        // Initialize live trading client if going live
        if (data.live && !liveTrading.isDryRun()) {
          await liveTrading.initialize();
        }
        
        strategy.liveMode = data.live ?? false;
        
        // Set funding if provided - RESET LIVE STATS
        if (data.funding && data.live) {
          // Live trading stats
          strategy.liveAllocation = data.funding;
          strategy.liveBalance = data.funding;
          strategy.liveDeployed = 0;
          strategy.livePnl = 0;
          strategy.liveWins = 0;
          strategy.liveLosses = 0;
          strategy.liveHistory = [];
          strategy.lockedFunds = 0;
          strategy.pendingBets = [];
          strategy.liveHalted = false;
          strategy.liveHaltedReason = undefined;
          // Also update paper stats for consistency
          strategy.balance = data.funding;
          strategy.startingBalance = data.funding;
          strategy.stopLossThreshold = Math.floor(data.funding * 0.25);
          strategy.totalPnl = 0;
          strategy.deployed = 0;
          strategy.wins = 0;
          strategy.losses = 0;
          strategy.halted = false;
          strategy.haltedReason = undefined;
        }
        
        saveState();
        broadcastState();
        
        const modeStr = strategy.liveMode ? '🔴 LIVE' : '📄 PAPER';
        console.log(`${modeStr} ${strategy.name} on ${market.key} - $${strategy.balance}`);
        sendTelegramAlert(`${modeStr} *${strategy.name}* on ${market.key}\nBalance: $${strategy.balance}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          market: market.key,
          strategy: strategy.id,
          liveMode: strategy.liveMode,
          balance: strategy.balance,
        }));
      } catch (e: any) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Set DRY_RUN mode
  if (url === '/api/poly/dryrun' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        liveTrading.setDryRun(data.dryRun ?? true);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, dryRun: liveTrading.isDryRun() }));
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
          // Check if this is for live mode (msg.live) or paper mode
          if (msg.live) {
            strategy.liveHalted = true;
            strategy.liveHaltedReason = msg.reason || 'Manual halt';
            console.log(`🛑 LIVE Strategy ${strategy.name} in ${msg.key} HALTED`);
          } else {
            strategy.halted = true;
            strategy.haltedReason = msg.reason || 'Manual halt';
            console.log(`🛑 PAPER Strategy ${strategy.name} in ${msg.key} HALTED`);
          }
          saveState();
          broadcastState();
        }
      }
      else if (msg.type === 'resumeStrategy' && msg.key && msg.strategyId) {
        const market = state.markets.find(m => m.key === msg.key);
        const strategy = market?.strategies.find(s => s.id === msg.strategyId);
        if (strategy) {
          // Check if this is for live mode (msg.live) or paper mode
          if (msg.live) {
            strategy.liveHalted = false;
            strategy.liveHaltedReason = undefined;
            console.log(`▶️ LIVE Strategy ${strategy.name} in ${msg.key} RESUMED`);
          } else {
            strategy.halted = false;
            strategy.haltedReason = undefined;
            console.log(`▶️ PAPER Strategy ${strategy.name} in ${msg.key} RESUMED`);
          }
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
          
          // If switching to live mode, set up live budget
          if (strategy.liveMode && !wasLive) {
            const funding = msg.funding || 10; // Default $10 budget
            strategy.liveAllocation = funding;
            strategy.liveBalance = funding;
            strategy.liveDeployed = 0;
            strategy.livePnl = 0;
            strategy.liveWins = 0;
            strategy.liveLosses = 0;
            strategy.halted = false;
            strategy.haltedReason = undefined;
            strategy.liveHalted = false;
            strategy.liveHaltedReason = undefined;
            console.log(`💰 LIVE MODE: ${strategy.name} in ${msg.key} - Budget: $${funding}`);
            sendTelegramAlert(`💰 *LIVE MODE ENABLED*\n\n${msg.key} ${strategy.name}\nBudget: $${funding}\n\nStrategy will stop if budget drops below $${(funding * 0.1).toFixed(2)} (10%)`);
          } else if (!strategy.liveMode && wasLive) {
            console.log(`📄 PAPER MODE: ${strategy.name} in ${msg.key}`);
          }
          
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
║  BTC 5min + ETH 15min + SOL 15min = 3 Markets              ║
║  7 Strategies × $25 Each × 3 Markets = $525 Total          ║
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

  // AGGRESSIVE REDEMPTION: Check every 30 seconds for redeemable winnings
  if (process.env.PRIVATE_KEY) {
    setInterval(async () => {
      try {
        // Use bet tracker for complete lifecycle tracking
        const trackerResult = await checkAndRedeemAll(process.env.PRIVATE_KEY!);
        if (trackerResult.redeemed > 0 || trackerResult.resolved > 0) {
          console.log(`   📊 [BetTracker] Checked: ${trackerResult.checked}, Resolved: ${trackerResult.resolved}, Redeemed: ${trackerResult.redeemed}`);
        }
        
        // Handle chain-confirmed results - update strategy state from truth source
        for (const confirmed of trackerResult.confirmedResults) {
          for (const market of state.markets) {
            for (const strategy of market.strategies) {
              if (strategy.id !== confirmed.strategyId) continue;
              
              // Find and update the pending bet
              const pendingIdx = strategy.pendingBets.findIndex(b => 
                b.conditionId === confirmed.conditionId || b.tokenId === confirmed.tokenId
              );
              
              if (pendingIdx >= 0) {
                const pending = strategy.pendingBets[pendingIdx];
                const wasCorrectPrediction = pending.predictedWon === confirmed.won;
                const betSide = (pending as any).side || 'Unknown';
                
                if (confirmed.won) {
                  // Chain confirms WIN
                  strategy.liveWins++;
                  strategy.liveBalance += confirmed.payout;
                  strategy.lockedFunds = Math.max(0, strategy.lockedFunds - pending.betAmount);
                  strategy.livePnl += confirmed.pnl;
                  const pnlSign = confirmed.pnl >= 0 ? '+' : '';
                  addStrategyLog(strategy, 'resolve', `✅ WIN ${betSide} | Bet: $${pending.betAmount.toFixed(2)} → Payout: $${confirmed.payout.toFixed(2)} | Profit: ${pnlSign}$${confirmed.pnl.toFixed(2)} | Total P&L: ${strategy.livePnl >= 0 ? '+' : ''}$${strategy.livePnl.toFixed(2)}`);
                  console.log(`   ✅ [${strategy.name}] WIN ${betSide}: $${pending.betAmount.toFixed(2)} → $${confirmed.payout.toFixed(2)} (${pnlSign}$${confirmed.pnl.toFixed(2)})`);
                } else {
                  // Chain confirms LOSS
                  strategy.liveLosses++;
                  strategy.lockedFunds = Math.max(0, strategy.lockedFunds - pending.betAmount);
                  strategy.livePnl += confirmed.pnl;
                  addStrategyLog(strategy, 'resolve', `❌ LOSS ${betSide} | Bet: $${pending.betAmount.toFixed(2)} lost | Total P&L: ${strategy.livePnl >= 0 ? '+' : ''}$${strategy.livePnl.toFixed(2)}`);
                  console.log(`   ❌ [${strategy.name}] LOSS ${betSide}: -$${pending.betAmount.toFixed(2)}`);
                }
                
                // Add to liveHistory for dashboard display
                strategy.liveHistory = strategy.liveHistory || [];
                strategy.liveHistory.unshift({
                  id: `chain-${confirmed.conditionId.substring(0, 12)}-${Date.now()}`,
                  time: new Date().toLocaleTimeString(),
                  timestamp: Date.now(),
                  marketId: confirmed.conditionId,
                  side: betSide,
                  shares: confirmed.payout,
                  cost: pending.betAmount,
                  payout: confirmed.payout,
                  pnl: confirmed.pnl,
                  result: confirmed.won ? 'WIN' as const : 'LOSS' as const,
                  assetOpen: 0,
                  assetClose: 0,
                });
                strategy.liveHistory = strategy.liveHistory.slice(0, 50);
                
                // Log prediction accuracy to console only (not to dashboard log - too noisy)
                if (!wasCorrectPrediction && pending.predictedWon !== null) {
                  console.log(`   📊 [${strategy.name}] Signal predicted ${pending.predictedWon ? 'WIN' : 'LOSS'}, actual ${confirmed.won ? 'WIN' : 'LOSS'}`);
                }
                
                // Remove from pending
                strategy.pendingBets.splice(pendingIdx, 1);
                saveState();
              }
            }
          }
        }
        
        // Also run old auto-redeem for any bets not in tracker
        const result = await redeemAllWinnings(process.env.PRIVATE_KEY!);
        if (result.redeemed > 0) {
          console.log(`   ✅ [AUTO-REDEEM] Redeemed $${result.redeemed.toFixed(2)} to USDC.e`);
          
          // Clear pending bets for redeemed conditions
          let totalRedeemed = 0;
          for (const redeemed of result.redeemedConditions) {
            for (const market of state.markets) {
              for (const strategy of market.strategies) {
                const pendingIdx = strategy.pendingBets.findIndex(b => b.conditionId === redeemed.conditionId);
                if (pendingIdx >= 0) {
                  const pending = strategy.pendingBets[pendingIdx];
                  const profit = redeemed.amount - pending.betAmount;
                  strategy.liveBalance += redeemed.amount;
                  strategy.lockedFunds = Math.max(0, strategy.lockedFunds - pending.betAmount);
                  strategy.pendingBets.splice(pendingIdx, 1);
                  totalRedeemed += redeemed.amount;
                  const profitSign = profit >= 0 ? '+' : '';
                  addStrategyLog(strategy, 'fill', `💰 Redeemed $${redeemed.amount.toFixed(2)} (${profitSign}$${profit.toFixed(2)} profit) | Balance: $${strategy.liveBalance.toFixed(2)}`);
                  console.log(`   💰 [${strategy.name}] Redeemed $${redeemed.amount.toFixed(2)} (${profitSign}$${profit.toFixed(2)})`);
                }
              }
            }
          }
          if (totalRedeemed > 0) {
            sendTelegramAlert(`💰 *REDEEMED*\n$${totalRedeemed.toFixed(2)} converted to USDC.e`);
          }
          saveState();
          fetchWalletBalance(); // Refresh wallet balance
        }
      } catch (err: any) {
        // Silent fail - will retry in 30s
      }
    }, 30000); // Every 30 seconds
    console.log('   🔄 Auto-redemption enabled (every 30s)');
  }

  // Log cleanup: run every hour
  // Paper logs: keep 1 day, Live logs: keep 30 days, System logs: keep 7 days
  setInterval(() => {
    try {
      const cleaned = db.cleanupOldLogs();
      if (cleaned.paper > 0 || cleaned.live > 0 || cleaned.system > 0) {
        console.log(`   🧹 Log cleanup: ${cleaned.paper} paper, ${cleaned.live} live, ${cleaned.system} system`);
      }
    } catch (err: any) {
      console.error('Log cleanup error:', err.message);
    }
  }, 60 * 60 * 1000); // Every hour
  
  // Initial cleanup
  const initialClean = db.cleanupOldLogs();
  console.log(`   🧹 Initial log cleanup: ${initialClean.paper} paper, ${initialClean.live} live, ${initialClean.system} system`);

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
