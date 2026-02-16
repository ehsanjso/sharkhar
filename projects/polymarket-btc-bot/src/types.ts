export interface MarketData {
  id: string;
  slug: string;
  question: string;
  outcomes: string[];
  outcomePrices: number[];
  clobTokenIds: string[];
  startTime: Date;
  endTime: Date;
  resolved: boolean;
}

export interface BTCMarket {
  marketId: string;
  upTokenId: string;
  downTokenId: string;
  openPrice: number;
  currentPrice: number;
  upProbability: number;
  downProbability: number;
  startTime: Date;
  endTime: Date;
  minutesSinceStart: number;
}

export interface BetSchedule {
  minute: number;
  amount: number;
  executed: boolean;
  orderId?: string;
  shares?: number;
  price?: number;
}

export interface TradingSession {
  marketId: string;
  side: 'UP' | 'DOWN' | null;
  lockedAt: Date | null;
  btcOpenPrice: number;
  bets: BetSchedule[];
  totalInvested: number;
  totalShares: number;
  result: 'WIN' | 'LOSS' | 'PENDING';
  payout: number;
  profit: number;
}

export interface BotConfig {
  privateKey: string;
  totalBudget: number;
  minProbability: number;
  betSchedule: { minute: number; amount: number }[];
  dryRun: boolean;
  chainId: number;
  polymarketHost: string;
  gammaApi: string;
  wsUrl: string;
}

export interface PriceUpdate {
  symbol: string;
  timestamp: number;
  value: number;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  shares?: number;
  price?: number;
  error?: string;
}

export interface MarketOdds {
  upPrice: number;
  downPrice: number;
  upProbability: number;
  downProbability: number;
}
