import type { DashboardState, MarketTrade, Claim, PnlDataPoint } from './types';

// Generate mock history data
const generateHistory = (): MarketTrade[] => {
  const trades: MarketTrade[] = [];
  const results: ('WIN' | 'LOSS')[] = ['WIN', 'WIN', 'WIN', 'LOSS', 'WIN', 'WIN', 'WIN', 'LOSS', 'WIN', 'WIN'];
  
  for (let i = 0; i < 42; i++) {
    const side = Math.random() > 0.5 ? 'Up' : 'Down';
    const shares = Math.floor(30 + Math.random() * 40);
    const cost = +(20 + Math.random() * 25).toFixed(2);
    const result = i < 2 ? 'ACTIVE' : results[i % results.length];
    const payout = result === 'WIN' ? shares : result === 'LOSS' ? 0 : 0;
    const pnl = result === 'ACTIVE' ? 0 : payout - cost;
    
    const hour = 15 - Math.floor(i / 4);
    const minute = (3 - (i % 4)) * 15;
    const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
    
    trades.push({
      id: `trade-${i}`,
      time,
      side: side as 'Up' | 'Down',
      shares,
      cost,
      payout,
      pnl,
      result,
    });
  }
  
  return trades;
};

// Generate P&L history for chart
const generatePnlHistory = (): PnlDataPoint[] => {
  const points: PnlDataPoint[] = [];
  let cumulative = 0;
  
  // Simulate a mix of wins and losses
  const pnls = [
    -15, 12, 18, -8, 22, 15, -12, 8, 25, 18,
    -10, 14, 20, 16, -25, 12, 8, 15, -8, 22,
    18, 15, -12, 20, 25, 18, 22, -15, 16, 20,
    14, -8, 18, 22, 15, 20, -10, 18, 22, 15, 12, 8
  ];
  
  for (let i = 0; i < 42; i++) {
    cumulative += pnls[i] || (Math.random() > 0.3 ? 15 : -10);
    points.push({
      market: i + 1,
      pnl: pnls[i] || 0,
      cumulative,
    });
  }
  
  return points;
};

// Generate claims
const generateClaims = (): Claim[] => {
  const claims: Claim[] = [];
  const times = ['14:49:08', '14:09:01', '13:53:55', '13:33:49', '13:23:44'];
  const amounts = [46.88, 86.88, 37.98, 38.92, 48.63];
  
  for (let i = 0; i < 5; i++) {
    claims.push({
      id: `claim-${i}`,
      time: times[i],
      amount: amounts[i],
    });
  }
  
  return claims;
};

export const mockData: DashboardState = {
  connected: true,
  live: true,
  currentTime: '3:14:22 PM',
  currentMarket: {
    title: 'Bitcoin Up or Down - February 14, 10:00AM-10:15AM ET',
    startTime: '10:00AM',
    endTime: '10:15AM',
    side: 'Up',
    costBet: 39.29,
    shares: 62.0,
    avgPrice: 0.63,
    winProbability: 70.5,
    ifWeWin: 22.71,
    ifWeLose: -39.29,
    livePnl: 4.42,
    liveValue: 43.71,
    elapsed: 10.18,
    total: 15,
    fills: 4,
    totalFills: 4,
    confidence: 71,
    btcPrice: 69650,
    btcChange: 31,
  },
  stats: {
    totalPnl: 143.73,
    totalMarkets: 42,
    deployed: 1392,
    wins: 28,
    losses: 11,
    winRate: 72,
    roi: 10.3,
    avgWin: 15.35,
    avgLoss: -26.25,
    claimed: 1632.24,
  },
  history: generateHistory(),
  claims: generateClaims(),
  pnlHistory: generatePnlHistory(),
};
