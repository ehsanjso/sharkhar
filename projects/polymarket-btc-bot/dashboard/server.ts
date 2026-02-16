/**
 * Polymarket BTC Bot - Simulation Server
 * Tracks real BTC prices and simulates 15-minute trading sessions
 */

import { WebSocket, WebSocketServer } from 'ws';
import http from 'http';

const PORT = 8084;
const MARKET_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const BET_SCHEDULE = [
  { minute: 1, amount: 5 },
  { minute: 4, amount: 10 },
  { minute: 7, amount: 15 },
  { minute: 10, amount: 10 },
];
const MIN_PROBABILITY = 0.60;

// ============ Types ============
interface Trade {
  id: string;
  time: string;
  side: 'Up' | 'Down';
  shares: number;
  cost: number;
  payout: number;
  pnl: number;
  result: 'WIN' | 'LOSS' | 'ACTIVE';
}

interface Claim {
  id: string;
  time: string;
  amount: number;
}

interface CurrentMarket {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  side: 'Up' | 'Down' | null;
  btcOpenPrice: number;
  costBet: number;
  shares: number;
  avgPrice: number;
  fills: number;
  bets: { minute: number; amount: number; executed: boolean; shares?: number; price?: number }[];
}

interface BotState {
  connected: boolean;
  live: boolean;
  btcPrice: number;
  btcOpenPrice: number;
  btcChange: number;
  
  // Current market
  currentMarket: CurrentMarket | null;
  
  // Stats
  stats: {
    totalPnl: number;
    totalMarkets: number;
    deployed: number;
    wins: number;
    losses: number;
    winRate: number;
    roi: number;
    avgWin: number;
    avgLoss: number;
    claimed: number;
  };
  
  // History
  history: Trade[];
  claims: Claim[];
  pnlHistory: { market: number; pnl: number; cumulative: number }[];
}

// ============ State ============
let state: BotState = {
  connected: false,
  live: false,
  btcPrice: 0,
  btcOpenPrice: 0,
  btcChange: 0,
  currentMarket: null,
  stats: {
    totalPnl: 0,
    totalMarkets: 0,
    deployed: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    roi: 0,
    avgWin: 0,
    avgLoss: 0,
    claimed: 0,
  },
  history: [],
  claims: [],
  pnlHistory: [],
};

let clients: Set<WebSocket> = new Set();
let marketTimer: NodeJS.Timeout | null = null;
let tradingTimer: NodeJS.Timeout | null = null;

// ============ BTC Price ============
async function fetchBinancePrice() {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const data = await response.json() as { price: string };
    const price = parseFloat(data.price);
    if (price > 0) {
      state.btcPrice = price;
      if (state.btcOpenPrice === 0) {
        state.btcOpenPrice = price;
      }
      state.btcChange = state.btcPrice - state.btcOpenPrice;
      state.connected = true;
      state.live = true;
    }
  } catch (error) {
    console.error('Binance fetch error:', error);
  }
}

// ============ Market Simulation ============
function startNewMarket() {
  const now = Date.now();
  const marketId = `sim-${now}`;
  
  // Set open price for this market
  state.btcOpenPrice = state.btcPrice;
  state.btcChange = 0;
  
  state.currentMarket = {
    id: marketId,
    title: `Bitcoin Up or Down - ${new Date().toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true 
    })}`,
    startTime: now,
    endTime: now + MARKET_DURATION_MS,
    side: null,
    btcOpenPrice: state.btcPrice,
    costBet: 0,
    shares: 0,
    avgPrice: 0,
    fills: 0,
    bets: BET_SCHEDULE.map(b => ({ ...b, executed: false })),
  };
  
  console.log(`\n🎯 New market started: ${state.currentMarket.title}`);
  console.log(`   BTC Open: $${state.btcOpenPrice.toLocaleString()}`);
  
  // Start trading loop
  if (tradingTimer) clearInterval(tradingTimer);
  tradingTimer = setInterval(tradingTick, 5000); // Every 5 seconds
  
  broadcastState();
}

function tradingTick() {
  if (!state.currentMarket) return;
  
  const now = Date.now();
  const elapsed = now - state.currentMarket.startTime;
  const minutesElapsed = elapsed / 60000;
  
  // Check if market ended
  if (minutesElapsed >= 15) {
    endMarket();
    return;
  }
  
  // Decide side after 1 minute if not decided
  if (!state.currentMarket.side && minutesElapsed >= 1) {
    decideSide();
  }
  
  // Check for bets to place
  if (state.currentMarket.side) {
    for (const bet of state.currentMarket.bets) {
      if (!bet.executed && minutesElapsed >= bet.minute) {
        placeBet(bet);
      }
    }
  }
  
  broadcastState();
}

function decideSide() {
  if (!state.currentMarket) return;
  
  const priceChange = state.btcPrice - state.currentMarket.btcOpenPrice;
  const side: 'Up' | 'Down' = priceChange >= 0 ? 'Up' : 'Down';
  
  state.currentMarket.side = side;
  console.log(`   🔒 Locked in: ${side} (BTC ${priceChange >= 0 ? '+' : ''}$${priceChange.toFixed(2)})`);
}

function placeBet(bet: { minute: number; amount: number; executed: boolean; shares?: number; price?: number }) {
  if (!state.currentMarket || !state.currentMarket.side) return;
  
  // Simulate market probability (60-75% based on price momentum)
  const momentum = Math.abs(state.btcPrice - state.currentMarket.btcOpenPrice) / state.currentMarket.btcOpenPrice;
  const probability = Math.min(0.75, 0.60 + momentum * 10);
  
  // Only bet if probability meets threshold
  if (probability < MIN_PROBABILITY) {
    console.log(`   ⏭️ Skipping bet at minute ${bet.minute} - prob ${(probability * 100).toFixed(1)}% < ${MIN_PROBABILITY * 100}%`);
    bet.executed = true;
    return;
  }
  
  // Calculate shares (maker price slightly below market)
  const price = probability - 0.02; // Maker price
  const shares = Math.floor(bet.amount / price);
  
  bet.executed = true;
  bet.shares = shares;
  bet.price = price;
  
  state.currentMarket.costBet += bet.amount;
  state.currentMarket.shares += shares;
  state.currentMarket.avgPrice = state.currentMarket.costBet / state.currentMarket.shares;
  state.currentMarket.fills++;
  
  state.stats.deployed += bet.amount;
  
  console.log(`   💰 Bet placed: $${bet.amount} → ${shares} shares @ $${price.toFixed(2)}`);
}

function endMarket() {
  if (!state.currentMarket) return;
  
  if (tradingTimer) {
    clearInterval(tradingTimer);
    tradingTimer = null;
  }
  
  const finalPriceChange = state.btcPrice - state.currentMarket.btcOpenPrice;
  const btcWentUp = finalPriceChange >= 0;
  const wePickedUp = state.currentMarket.side === 'Up';
  const won = btcWentUp === wePickedUp;
  
  // Calculate P&L
  const payout = won ? state.currentMarket.shares : 0;
  const pnl = payout - state.currentMarket.costBet;
  
  // Only count if we actually placed bets
  if (state.currentMarket.fills > 0) {
    // Update stats
    state.stats.totalMarkets++;
    state.stats.totalPnl += pnl;
    
    if (won) {
      state.stats.wins++;
      state.stats.claimed += payout;
      
      // Add claim
      state.claims.unshift({
        id: `claim-${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        amount: payout,
      });
      state.claims = state.claims.slice(0, 10); // Keep last 10
    } else {
      state.stats.losses++;
    }
    
    // Update averages
    if (state.stats.wins > 0) {
      state.stats.avgWin = state.stats.claimed / state.stats.wins;
    }
    if (state.stats.losses > 0) {
      const totalLoss = state.stats.deployed - state.stats.claimed - state.stats.totalPnl;
      state.stats.avgLoss = -Math.abs(totalLoss / state.stats.losses);
    }
    
    state.stats.winRate = state.stats.totalMarkets > 0 
      ? Math.round((state.stats.wins / state.stats.totalMarkets) * 100) 
      : 0;
    state.stats.roi = state.stats.deployed > 0 
      ? (state.stats.totalPnl / state.stats.deployed) * 100 
      : 0;
    
    // Add to history
    state.history.unshift({
      id: state.currentMarket.id,
      time: new Date().toLocaleTimeString(),
      side: state.currentMarket.side || 'Up',
      shares: state.currentMarket.shares,
      cost: state.currentMarket.costBet,
      payout,
      pnl,
      result: won ? 'WIN' : 'LOSS',
    });
    state.history = state.history.slice(0, 50); // Keep last 50
    
    // Add to P&L history
    const cumulative = state.pnlHistory.length > 0 
      ? state.pnlHistory[state.pnlHistory.length - 1].cumulative + pnl 
      : pnl;
    state.pnlHistory.push({
      market: state.stats.totalMarkets,
      pnl,
      cumulative,
    });
    
    console.log(`\n📊 Market ended: ${won ? '✅ WIN' : '❌ LOSS'}`);
    console.log(`   BTC: $${state.currentMarket.btcOpenPrice.toLocaleString()} → $${state.btcPrice.toLocaleString()} (${finalPriceChange >= 0 ? '+' : ''}$${finalPriceChange.toFixed(2)})`);
    console.log(`   Side: ${state.currentMarket.side} | Cost: $${state.currentMarket.costBet.toFixed(2)} | Payout: $${payout.toFixed(2)} | P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);
    console.log(`   Total: ${state.stats.wins}W/${state.stats.losses}L (${state.stats.winRate}%) | P&L: ${state.stats.totalPnl >= 0 ? '+' : ''}$${state.stats.totalPnl.toFixed(2)}`);
  }
  
  state.currentMarket = null;
  broadcastState();
  
  // Start next market after 30 seconds
  console.log('\n⏳ Next market in 30 seconds...');
  setTimeout(startNewMarket, 30000);
}

// ============ WebSocket ============
function broadcastState() {
  const marketData = state.currentMarket ? {
    ...state.currentMarket,
    elapsed: (Date.now() - state.currentMarket.startTime) / 60000,
    total: 15,
    winProbability: state.currentMarket.side 
      ? (state.currentMarket.side === 'Up' 
        ? (state.btcPrice >= state.currentMarket.btcOpenPrice ? 65 : 35)
        : (state.btcPrice < state.currentMarket.btcOpenPrice ? 65 : 35))
      : 50,
    confidence: state.currentMarket.side 
      ? (state.currentMarket.side === 'Up' 
        ? (state.btcPrice >= state.currentMarket.btcOpenPrice ? 65 : 35)
        : (state.btcPrice < state.currentMarket.btcOpenPrice ? 65 : 35))
      : 50,
    ifWeWin: state.currentMarket.shares - state.currentMarket.costBet,
    ifWeLose: -state.currentMarket.costBet,
    livePnl: state.currentMarket.side 
      ? ((state.currentMarket.side === 'Up' 
          ? (state.btcPrice >= state.currentMarket.btcOpenPrice ? 1 : 0)
          : (state.btcPrice < state.currentMarket.btcOpenPrice ? 1 : 0)) 
        * state.currentMarket.shares - state.currentMarket.costBet) * 0.7 // Estimate
      : 0,
    liveValue: state.currentMarket.costBet,
    btcPrice: state.btcPrice,
    btcChange: state.btcPrice - state.currentMarket.btcOpenPrice,
  } : null;

  const msg = JSON.stringify({
    type: 'fullState',
    data: {
      connected: state.connected,
      live: state.live,
      btcPrice: state.btcPrice,
      btcOpenPrice: state.btcOpenPrice,
      btcChange: state.btcChange,
      currentMarket: marketData,
      stats: state.stats,
      history: state.history,
      claims: state.claims,
      pnlHistory: state.pnlHistory,
    }
  });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// ============ HTTP Server ============
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(state));
    return;
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

  ws.on('close', () => {
    console.log('🔌 Dashboard disconnected');
    clients.delete(ws);
  });
});

// ============ Start ============
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║     🤖 POLYMARKET BTC BOT - SIMULATION           ║
╚══════════════════════════════════════════════════╝

  Dashboard: http://192.168.0.217:8083
  API:       http://localhost:${PORT}
  WebSocket: ws://localhost:${PORT}
  `);

  // Start BTC price updates
  setInterval(fetchBinancePrice, 3000);
  fetchBinancePrice();

  // Start first market after 5 seconds
  setTimeout(startNewMarket, 5000);
});
