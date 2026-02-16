import { useState, useEffect, useCallback } from 'react';

export type CryptoAsset = 'BTC' | 'ETH' | 'SOL';
export type Timeframe = '5min' | '15min';

export interface StrategyLog {
  time: string;
  type: 'info' | 'bet' | 'clob' | 'fill' | 'resolve' | 'error';
  message: string;
  data?: any;
}

export interface Strategy {
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
  liveDeployed: number;
  livePnl: number;
  liveWins: number;
  liveLosses: number;
  liveHistory: Trade[];
  liveAllocation: number;
  liveBalance: number;
  lockedFunds: number;
  pendingBets: { conditionId: string; betAmount: number; won: boolean | null }[];
  // Control flags
  liveMode: boolean;
  halted: boolean;           // Paper trading halt
  haltedReason?: string;
  liveHalted: boolean;       // Live trading halt (separate)
  liveHaltedReason?: string;
  stopLossThreshold: number;
  // Activity logs
  logs: StrategyLog[];
}

export interface StrategyMarket {
  side: 'Up' | 'Down' | null;
  costBet: number;
  shares: number;
  avgPrice: number;
  fills: number;
  livePnl: number;
  bets: { minute: number; amount: number; executed: boolean; shares?: number; price?: number }[];
}

export interface Trade {
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

export interface CurrentMarket {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  openPrice: number;
  elapsed: number;
  change: number;
  changePercent: number;
}

export interface MarketState {
  key: string;
  asset: CryptoAsset;
  timeframe: Timeframe;
  currentPrice: number;
  currentMarket: CurrentMarket | null;
  strategies: Strategy[];
  totalPnl: number;
  totalBalance: number;
  halted: boolean;
}

export interface PolymarketData {
  connected: boolean;
  live: boolean;
  prices: Record<CryptoAsset, number>;
  walletBalance: number;
  markets: MarketState[];
  selectedMarketKey: string | null;
  selectedMarket: MarketState | null;
  currentTime: string;
  globalHalt: boolean;
  selectMarket: (key: string | null) => void;
  resetMarket: (key: string) => void;
  // Control functions
  toggleGlobalHalt: () => void;
  toggleMarketHalt: (key: string) => void;
  toggleStrategyHalt: (key: string, strategyId: string, isLive?: boolean) => void;
  setLiveMode: (key: string, strategyId: string, live: boolean, funding?: number) => void;
  setStopLoss: (key: string, strategyId: string, threshold: number) => void;
  // Legacy compatibility for current market view
  btcPrice: number;
  currentMarket: CurrentMarket | null;
  strategies: Strategy[];
  totalPnl: number;
  totalBalance: number;
  selectedStrategy: string | null;
  setSelectedStrategy: (id: string | null) => void;
  resetData: () => void;
}

const WS_URL = `ws://${window.location.hostname}:8084`;

export function usePolymarketData(): PolymarketData {
  const [connected, setConnected] = useState(false);
  const [live, setLive] = useState(false);
  const [prices, setPrices] = useState<Record<CryptoAsset, number>>({ BTC: 0, ETH: 0, SOL: 0 });
  const [walletBalance, setWalletBalance] = useState(0);
  const [markets, setMarkets] = useState<MarketState[]>([]);
  const [selectedMarketKey, setSelectedMarketKey] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [globalHalt, setGlobalHalt] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let socket: WebSocket;
    let reconnectTimer: number;

    const connect = () => {
      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        setLive(false);
        reconnectTimer = window.setTimeout(connect, 3000);
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'fullState' && msg.data) {
            const data = msg.data;
            setConnected(data.connected);
            setLive(data.live);
            setPrices(data.prices || { BTC: 0, ETH: 0, SOL: 0 });
            setWalletBalance(data.walletBalance ?? 0);
            setMarkets(data.markets || []);
            setGlobalHalt(data.globalHalt ?? false);
            if (data.selectedMarket) {
              setSelectedMarketKey(data.selectedMarket);
            }
          }
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };

      setWs(socket);
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  const selectMarket = useCallback((key: string | null) => {
    setSelectedMarketKey(key);
    setSelectedStrategy(null);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'selectMarket', key }));
    }
  }, [ws]);

  const resetMarket = useCallback((key: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'reset', key }));
    }
  }, [ws]);

  const resetData = useCallback(() => {
    if (selectedMarketKey) {
      resetMarket(selectedMarketKey);
    }
  }, [selectedMarketKey, resetMarket]);

  // Control functions
  const toggleGlobalHalt = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: globalHalt ? 'globalResume' : 'globalHalt' }));
    }
  }, [ws, globalHalt]);

  const toggleMarketHalt = useCallback((key: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const market = markets.find(m => m.key === key);
      ws.send(JSON.stringify({ type: market?.halted ? 'resumeMarket' : 'haltMarket', key }));
    }
  }, [ws, markets]);

  const toggleStrategyHalt = useCallback((key: string, strategyId: string, isLive?: boolean) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const market = markets.find(m => m.key === key);
      const strategy = market?.strategies.find(s => s.id === strategyId);
      
      // Determine which halt to toggle based on isLive flag or strategy's liveMode
      const targetLive = isLive ?? strategy?.liveMode;
      const isHalted = targetLive ? strategy?.liveHalted : strategy?.halted;
      
      ws.send(JSON.stringify({ 
        type: isHalted ? 'resumeStrategy' : 'haltStrategy', 
        key, 
        strategyId,
        live: targetLive,
      }));
    }
  }, [ws, markets]);

  const setLiveModeFunc = useCallback((key: string, strategyId: string, live: boolean, funding?: number) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'setLiveMode', key, strategyId, live, funding }));
    }
  }, [ws]);

  const setStopLossFunc = useCallback((key: string, strategyId: string, threshold: number) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'setStopLoss', key, strategyId, threshold }));
    }
  }, [ws]);

  // Find selected market
  const selectedMarket = selectedMarketKey 
    ? markets.find(m => m.key === selectedMarketKey) || null 
    : null;

  // Legacy compatibility
  const btcPrice = selectedMarket?.currentPrice || prices.BTC;
  const currentMarket = selectedMarket?.currentMarket || null;
  const strategies = selectedMarket?.strategies || [];
  const totalPnl = selectedMarket?.totalPnl || 0;
  const totalBalance = selectedMarket?.totalBalance || 0;

  return {
    connected,
    live,
    prices,
    walletBalance,
    markets,
    selectedMarketKey,
    selectedMarket,
    currentTime,
    globalHalt,
    selectMarket,
    resetMarket,
    // Control functions
    toggleGlobalHalt,
    toggleMarketHalt,
    toggleStrategyHalt,
    setLiveMode: setLiveModeFunc,
    setStopLoss: setStopLossFunc,
    // Legacy
    btcPrice,
    currentMarket,
    strategies,
    totalPnl,
    totalBalance,
    selectedStrategy,
    setSelectedStrategy,
    resetData,
  };
}
