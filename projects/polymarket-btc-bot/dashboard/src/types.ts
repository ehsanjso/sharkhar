export interface MarketTrade {
  id: string;
  time: string;
  side: 'Up' | 'Down';
  shares: number;
  cost: number;
  payout: number;
  pnl: number;
  result: 'WIN' | 'LOSS' | 'ACTIVE';
}

export interface Claim {
  id: string;
  time: string;
  amount: number;
}

export interface CurrentMarket {
  title: string;
  startTime: string;
  endTime: string;
  side: 'Up' | 'Down' | null;
  costBet: number;
  shares: number;
  avgPrice: number;
  winProbability: number;
  ifWeWin: number;
  ifWeLose: number;
  livePnl: number;
  liveValue: number;
  elapsed: number;
  total: number;
  fills: number;
  totalFills: number;
  confidence: number;
  btcPrice: number;
  btcChange: number;
}

export interface BotStats {
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
}

export interface PnlDataPoint {
  market: number;
  pnl: number;
  cumulative: number;
}

export interface DashboardState {
  connected: boolean;
  live: boolean;
  currentTime: string;
  currentMarket: CurrentMarket | null;
  stats: BotStats;
  history: MarketTrade[];
  claims: Claim[];
  pnlHistory: PnlDataPoint[];
}
