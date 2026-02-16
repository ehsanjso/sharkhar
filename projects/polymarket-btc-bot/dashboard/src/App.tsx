import { useState } from 'react';
import { usePolymarketData } from './hooks/usePolymarketData';
import type { MarketState } from './hooks/usePolymarketData';

function App() {
  const data = usePolymarketData();
  const [view, setView] = useState<'markets' | 'overview' | 'detail'>('markets');
  const [tradingMode, setTradingMode] = useState<'paper' | 'live'>('paper');

  const selectedStrategy = data.selectedStrategy 
    ? data.strategies.find(s => s.id === data.selectedStrategy) 
    : null;
  
  // Filter strategies based on trading mode - STRICT filtering
  const filteredStrategies = tradingMode === 'live' 
    ? data.strategies.filter(s => s.liveMode)
    : data.strategies.filter(s => !s.liveMode);
  
  // Calculate totals based on mode
  const modeTotalPnl = tradingMode === 'live'
    ? filteredStrategies.reduce((sum, s) => sum + (s.livePnl || 0), 0)
    : filteredStrategies.reduce((sum, s) => sum + s.totalPnl, 0);
  
  const modeTotalBalance = tradingMode === 'live'
    ? filteredStrategies.reduce((sum, s) => sum + (s.liveBalance || 0), 0)
    : filteredStrategies.reduce((sum, s) => sum + s.balance, 0);

  // If no market selected, show market selector
  if (!data.selectedMarketKey || view === 'markets') {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <MarketSelector data={data} onSelect={(key, mode) => {
          setTradingMode(mode);
          data.selectMarket(key);
          setView('overview');
        }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-4">
            <button 
              onClick={() => setView('markets')}
              className="text-gray-400 hover:text-white text-sm"
            >
              ← Markets
            </button>
            <h1 className="text-base sm:text-xl font-bold whitespace-nowrap">
              {data.selectedMarket?.asset} {data.selectedMarket?.timeframe}
            </h1>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className={`w-2 h-2 rounded-full ${data.live ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={data.live ? 'text-green-400' : 'text-red-400'}>
                {data.live ? 'LIVE' : 'OFF'}
              </span>
            </div>
            <button 
              onClick={data.resetData}
              className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs sm:hidden"
            >
              Reset
            </button>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <span className="text-gray-400 text-sm">{data.currentTime}</span>
            <button 
              onClick={data.resetData}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Mode Indicator Badge */}
      <div className={`border-b px-3 sm:px-4 py-2 ${
        tradingMode === 'live' 
          ? 'bg-green-900/30 border-green-800' 
          : 'bg-purple-900/30 border-purple-800'
      }`}>
        <div className="flex items-center justify-center gap-2">
          <span className={`px-4 py-1.5 rounded-full font-bold text-sm ${
            tradingMode === 'live'
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
              : 'bg-gradient-to-r from-purple-500 to-violet-600 text-white'
          }`}>
            {tradingMode === 'live' ? '💵 LIVE TRADING' : '📝 PAPER TRADING'}
          </span>
          <span className="text-gray-400 text-sm">
            {filteredStrategies.length} strategies
          </span>
        </div>
      </div>

      {/* Price Bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-3 sm:px-4 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-6 overflow-x-auto">
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-gray-400 text-xs sm:text-sm">{data.selectedMarket?.asset}</span>
              <span className="text-sm sm:text-lg font-mono">${data.btcPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            {data.currentMarket && (
              <>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-xs sm:text-base font-mono ${data.currentMarket.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.currentMarket.changePercent >= 0 ? '+' : ''}{data.currentMarket.changePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs sm:text-sm font-mono text-gray-300">
                    {data.currentMarket.elapsed.toFixed(0)}/{data.selectedMarket?.timeframe === '5min' ? '5' : '15'}m
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
            {tradingMode === 'live' && (
              <div className="flex items-center gap-1">
                <span className="text-gray-400 text-xs">💰 Wallet:</span>
                <span className="text-sm sm:text-lg font-mono text-yellow-400">${data.walletBalance.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-xs">{tradingMode === 'live' ? 'Budget:' : 'Bal:'}</span>
              <span className={`text-sm sm:text-lg font-mono ${tradingMode === 'live' ? 'text-yellow-400' : 'text-green-400'}`}>
                ${modeTotalBalance.toFixed(0)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-xs">P&L:</span>
              <span className={`text-sm sm:text-lg font-mono ${modeTotalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {modeTotalPnl >= 0 ? '+' : ''}${modeTotalPnl.toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="px-2 sm:px-4 py-2 bg-gray-900 border-b border-gray-800 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max pb-1">
          <button
            onClick={() => { setView('overview'); data.setSelectedStrategy(null); }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded text-sm sm:text-base whitespace-nowrap ${view === 'overview' ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            📊 All
          </button>
          {filteredStrategies.map(s => (
            <button
              key={s.id}
              onClick={() => { setView('detail'); data.setSelectedStrategy(s.id); }}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded flex items-center gap-1 sm:gap-2 text-sm sm:text-base whitespace-nowrap ${
                view === 'detail' && data.selectedStrategy === s.id ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
              }`}
              style={{ borderLeft: `3px solid ${s.color}` }}
            >
              <span className="hidden sm:inline">{s.name}</span>
              <span className="sm:hidden">{s.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="p-2 sm:p-4">
        {view === 'overview' ? (
          <OverviewView data={data} tradingMode={tradingMode} filteredStrategies={filteredStrategies} />
        ) : selectedStrategy ? (
          <DetailView strategy={selectedStrategy} market={data.currentMarket} assetPrice={data.btcPrice} />
        ) : null}
      </main>
    </div>
  );
}

function MarketSelector({ data, onSelect }: { 
  data: ReturnType<typeof usePolymarketData>; 
  onSelect: (key: string, mode: 'live' | 'paper') => void;
}) {
  // Group markets by asset
  const marketsByAsset = data.markets.reduce((acc, m) => {
    if (!acc[m.asset]) acc[m.asset] = [];
    acc[m.asset].push(m);
    return acc;
  }, {} as Record<string, MarketState[]>);

  const assetColors: Record<string, string> = {
    BTC: '#f7931a',
    ETH: '#627eea',
    SOL: '#00ffa3',
  };

  const assetIcons: Record<string, string> = {
    BTC: '₿',
    ETH: 'Ξ',
    SOL: '◎',
  };

  // Calculate LIVE totals (only strategies in live mode)
  const liveStrategies = data.markets.flatMap(m => m.strategies.filter(s => s.liveMode));
  const liveTotalPnL = liveStrategies.reduce((sum, s) => sum + (s.livePnl || 0), 0);
  const liveTotalBalance = liveStrategies.reduce((sum, s) => sum + (s.liveBalance || 0), 0);
  const liveTotalAllocation = liveStrategies.reduce((sum, s) => sum + (s.liveAllocation || 0), 0);
  const liveWins = liveStrategies.reduce((sum, s) => sum + (s.liveWins || 0), 0);
  const liveLosses = liveStrategies.reduce((sum, s) => sum + (s.liveLosses || 0), 0);
  
  // Calculate PAPER totals (only strategies NOT in live mode)
  const paperStrategies = data.markets.flatMap(m => m.strategies.filter(s => !s.liveMode));
  const paperTotalPnL = paperStrategies.reduce((sum, s) => sum + s.totalPnl, 0);
  const paperTotalBalance = paperStrategies.reduce((sum, s) => sum + s.balance, 0);
  const paperStartingBalance = paperStrategies.reduce((sum, s) => sum + s.startingBalance, 0) || 1;
  const paperWins = paperStrategies.reduce((sum, s) => sum + s.wins, 0);
  const paperLosses = paperStrategies.reduce((sum, s) => sum + s.losses, 0);
  
  // Combined totals
  const totalPnL = liveTotalPnL + paperTotalPnL;
  const totalBalance = liveTotalBalance + paperTotalBalance;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🤖 Multi-Market Bot</h1>
            <p className="text-gray-400 text-sm">BTC, ETH, SOL × 5min, 15min</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Global Emergency Stop */}
            <button
              onClick={data.toggleGlobalHalt}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all border ${
                data.globalHalt 
                  ? 'border-green-500 text-green-400 hover:bg-green-500/10' 
                  : 'border-red-500 text-red-400 hover:bg-red-500/10'
              }`}
            >
              {data.globalHalt ? 'Resume All' : 'Stop All'}
            </button>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${data.globalHalt ? 'bg-red-500' : data.live ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
              <span className={`text-sm ${data.globalHalt ? 'text-red-400' : data.live ? 'text-green-400' : 'text-yellow-400'}`}>
                {data.globalHalt ? 'HALTED' : data.live ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </header>
      
      {/* Global Halt Banner */}
      {data.globalHalt && (
        <div className="bg-red-900 border-b border-red-700 px-4 py-3 text-center">
          <span className="text-red-200 font-bold">⚠️ GLOBAL HALT ACTIVE - All betting is paused</span>
        </div>
      )}

      {/* Combined Summary Stats */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-xs uppercase mb-1">Total Balance</div>
              <div className="text-xl font-mono text-white">${totalBalance.toFixed(0)}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-xs uppercase mb-1">Total P&L</div>
              <div className={`text-xl font-mono ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(0)}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-xs uppercase mb-1">💰 Wallet</div>
              <div className="text-xl font-mono text-yellow-400">${data.walletBalance.toFixed(2)}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-gray-400 text-xs uppercase mb-1">Active Bids</div>
              <div className="text-xl font-mono text-blue-400">
                {data.markets.reduce((sum, m) => 
                  sum + m.strategies.filter(s => s.currentMarket?.side && !s.halted).length, 0
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Sections: Live Markets & Paper Markets */}
      <main className="flex-1 p-4">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* ==================== LIVE MARKETS SECTION ==================== */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1.5 rounded-full text-sm font-bold text-white shadow-lg bg-gradient-to-r from-green-500 to-emerald-600">
                💵 LIVE
              </span>
              <h2 className="text-xl font-bold text-green-400">Live Markets</h2>
              <span className="text-gray-500 text-sm">Real Money</span>
            </div>

            {/* Live Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <div className="bg-gray-900 rounded-lg p-3 border-l-4 border-green-500">
                <div className="text-gray-400 text-xs">Budget</div>
                <div className="text-lg font-mono text-green-400">${liveTotalBalance.toFixed(0)}</div>
                <div className="text-xs text-gray-500">of ${liveTotalAllocation.toFixed(0)}</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 border-l-4 border-green-500">
                <div className="text-gray-400 text-xs">Live P&L</div>
                <div className={`text-lg font-mono ${liveTotalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {liveTotalPnL >= 0 ? '+' : ''}${liveTotalPnL.toFixed(0)}
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 border-l-4 border-green-500">
                <div className="text-gray-400 text-xs">Win Rate</div>
                <div className="text-lg font-mono">
                  {liveWins + liveLosses > 0 ? `${((liveWins / (liveWins + liveLosses)) * 100).toFixed(0)}%` : '—'}
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 border-l-4 border-green-500">
                <div className="text-gray-400 text-xs">Record</div>
                <div className="text-lg font-mono">{liveWins}W / {liveLosses}L</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 border-l-4 border-green-500">
                <div className="text-gray-400 text-xs">Strategies</div>
                <div className="text-lg font-mono text-green-400">{liveStrategies.length}</div>
              </div>
            </div>

            {/* Live Market Cards */}
            {liveStrategies.length === 0 ? (
              <div className="bg-gray-900 rounded-xl p-8 border border-green-900/30 text-center">
                <div className="text-4xl mb-3">💵</div>
                <p className="text-gray-400">No live strategies active</p>
                <p className="text-gray-500 text-sm mt-1">Enable live mode on a strategy to start real trading</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(marketsByAsset).map(([asset, assetMarkets]) => {
                  const hasLive = assetMarkets.some(m => m.strategies.some(s => s.liveMode));
                  if (!hasLive) return null;
                  
                  return (
                    <div key={asset}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl" style={{ color: assetColors[asset] }}>{assetIcons[asset]}</span>
                        <span className="font-semibold">{asset}</span>
                        <span className="text-gray-500 font-mono text-sm">
                          ${data.prices[asset as keyof typeof data.prices]?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '—'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {assetMarkets.map(market => {
                          const liveStrats = market.strategies.filter(s => s.liveMode);
                          if (liveStrats.length === 0) return null;
                          
                          const marketLivePnl = liveStrats.reduce((sum, s) => sum + (s.livePnl || 0), 0);
                          const marketLiveBal = liveStrats.reduce((sum, s) => sum + (s.liveBalance || 0), 0);
                          
                          return (
                            <div
                              key={market.key}
                              className={`bg-gray-900 border rounded-xl p-4 text-left transition-all ${
                                market.halted ? 'border-red-600 opacity-75' : 'border-green-900/50 hover:border-green-500/50'
                              }`}
                              style={{ borderLeftWidth: '4px', borderLeftColor: market.halted ? '#dc2626' : '#22c55e' }}
                            >
                              {/* Halt banner */}
                              {market.halted && (
                                <div className="bg-red-900/50 text-red-300 text-xs text-center py-1 px-2 rounded mb-3 -mt-1 -mx-1">
                                  🛑 HALTED
                                </div>
                              )}
                              <button
                                onClick={() => onSelect(market.key, 'live')}
                                className="w-full text-left"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold">{market.asset} {market.timeframe}</span>
                                    {!market.halted && market.currentMarket && (
                                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); data.toggleMarketHalt(market.key); }}
                                      className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${
                                        market.halted 
                                          ? 'border-green-500 text-green-400 hover:bg-green-500/10' 
                                          : 'border-red-500/50 text-red-400 hover:bg-red-500/10'
                                      }`}
                                    >
                                      {market.halted ? 'Resume' : 'Stop'}
                                    </button>
                                    <span className={`text-lg font-mono ${marketLivePnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {marketLivePnl >= 0 ? '+' : ''}${marketLivePnl.toFixed(0)}
                                    </span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                  <div>
                                    <div className="text-gray-500 text-xs">Budget</div>
                                    <div className="font-mono text-green-400">${marketLiveBal.toFixed(0)}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 text-xs">Strategies</div>
                                    <div className="font-mono">{liveStrats.length}</div>
                                  </div>
                                  <div>
                                    <div className="text-gray-500 text-xs">Status</div>
                                    <div className={market.halted ? 'text-red-400' : market.currentMarket ? 'text-green-400' : 'text-gray-500'}>
                                      {market.halted ? 'Halted' : market.currentMarket ? 
                                        `${market.currentMarket.elapsed.toFixed(1)}m` : 
                                        'Waiting'
                                      }
                                    </div>
                                  </div>
                                </div>
                                {market.currentMarket && !market.halted && (
                                  <div className="mt-3 pt-3 border-t border-gray-800">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-gray-400">Current: ${market.currentMarket.openPrice.toFixed(0)}</span>
                                      <span className={market.currentMarket.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                                        {market.currentMarket.changePercent >= 0 ? '↑' : '↓'} {Math.abs(market.currentMarket.changePercent).toFixed(3)}%
                                      </span>
                                    </div>
                                    <div className="mt-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-green-500 transition-all"
                                        style={{ width: `${(market.currentMarket.elapsed / (market.timeframe === '5min' ? 5 : 15)) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ==================== PAPER MARKETS SECTION ==================== */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1.5 rounded-full text-sm font-bold text-white shadow-lg bg-gradient-to-r from-purple-500 to-violet-600">
                📝 PAPER
              </span>
              <h2 className="text-xl font-bold text-purple-400">Paper Markets</h2>
              <span className="text-gray-500 text-sm">Simulation</span>
            </div>

            {/* Paper Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <div className="bg-gray-900 rounded-lg p-3 border-l-4 border-purple-500">
                <div className="text-gray-400 text-xs">Balance</div>
                <div className="text-lg font-mono text-purple-400">${paperTotalBalance.toFixed(0)}</div>
                <div className="text-xs text-gray-500">started ${paperStartingBalance.toFixed(0)}</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 border-l-4 border-purple-500">
                <div className="text-gray-400 text-xs">Paper P&L</div>
                <div className={`text-lg font-mono ${paperTotalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {paperTotalPnL >= 0 ? '+' : ''}${paperTotalPnL.toFixed(0)}
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 border-l-4 border-purple-500">
                <div className="text-gray-400 text-xs">ROI</div>
                <div className={`text-lg font-mono ${paperTotalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {((paperTotalPnL / paperStartingBalance) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 border-l-4 border-purple-500">
                <div className="text-gray-400 text-xs">Record</div>
                <div className="text-lg font-mono">{paperWins}W / {paperLosses}L</div>
              </div>
              <div className="bg-gray-900 rounded-lg p-3 border-l-4 border-purple-500">
                <div className="text-gray-400 text-xs">Strategies</div>
                <div className="text-lg font-mono text-purple-400">{paperStrategies.length}</div>
              </div>
            </div>

            {/* Paper Market Cards */}
            <div className="space-y-4">
              {Object.entries(marketsByAsset).map(([asset, assetMarkets]) => {
                const hasPaper = assetMarkets.some(m => m.strategies.some(s => !s.liveMode));
                if (!hasPaper) return null;
                
                return (
                  <div key={asset}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl" style={{ color: assetColors[asset] }}>{assetIcons[asset]}</span>
                      <span className="font-semibold">{asset}</span>
                      <span className="text-gray-500 font-mono text-sm">
                        ${data.prices[asset as keyof typeof data.prices]?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '—'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {assetMarkets.map(market => {
                        const paperStrats = market.strategies.filter(s => !s.liveMode);
                        if (paperStrats.length === 0) return null;
                        
                        const marketPaperPnl = paperStrats.reduce((sum, s) => sum + s.totalPnl, 0);
                        const marketPaperBal = paperStrats.reduce((sum, s) => sum + s.balance, 0);
                        
                        return (
                          <button
                            key={market.key}
                            onClick={() => onSelect(market.key, 'paper')}
                            className={`bg-gray-900 border rounded-xl p-4 text-left transition-all ${
                              market.halted ? 'border-red-600 opacity-75' : 'border-purple-900/50 hover:border-purple-500/50'
                            }`}
                            style={{ borderLeftWidth: '4px', borderLeftColor: market.halted ? '#dc2626' : '#a855f7' }}
                          >
                            {market.halted && (
                              <div className="bg-red-900/50 text-red-300 text-xs text-center py-1 px-2 rounded mb-2 -mt-1 -mx-1">
                                🛑 HALTED
                              </div>
                            )}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{market.asset} {market.timeframe}</span>
                                {!market.halted && market.currentMarket && (
                                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); data.toggleMarketHalt(market.key); }}
                                  className={`px-2 py-0.5 rounded text-xs font-medium border transition-all ${
                                    market.halted 
                                      ? 'border-green-500 text-green-400 hover:bg-green-500/10' 
                                      : 'border-red-500/50 text-red-400 hover:bg-red-500/10'
                                  }`}
                                >
                                  {market.halted ? 'Resume' : 'Stop'}
                                </button>
                                <span className={`text-lg font-mono ${marketPaperPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {marketPaperPnl >= 0 ? '+' : ''}${marketPaperPnl.toFixed(0)}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <div className="text-gray-500 text-xs">Balance</div>
                                <div className="font-mono">${marketPaperBal.toFixed(0)}</div>
                              </div>
                              <div>
                                <div className="text-gray-500 text-xs">Strategies</div>
                                <div className="font-mono">{paperStrats.length}</div>
                              </div>
                              <div>
                                <div className="text-gray-500 text-xs">Status</div>
                                <div className={market.halted ? 'text-red-400' : market.currentMarket ? 'text-green-400' : 'text-gray-500'}>
                                  {market.halted ? 'Halted' : market.currentMarket ? 
                                    `${market.currentMarket.elapsed.toFixed(1)}m` : 
                                    'Waiting'
                                  }
                                </div>
                              </div>
                            </div>
                            {market.currentMarket && !market.halted && (
                              <div className="mt-3 pt-3 border-t border-gray-800">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-400">Current: ${market.currentMarket.openPrice.toFixed(0)}</span>
                                  <span className={market.currentMarket.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                                    {market.currentMarket.changePercent >= 0 ? '↑' : '↓'} {Math.abs(market.currentMarket.changePercent).toFixed(3)}%
                                  </span>
                                </div>
                                <div className="mt-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-purple-500 transition-all"
                                    style={{ width: `${(market.currentMarket.elapsed / (market.timeframe === '5min' ? 5 : 15)) * 100}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function OverviewView({ data, tradingMode, filteredStrategies }: { 
  data: ReturnType<typeof usePolymarketData>; 
  tradingMode: 'paper' | 'live';
  filteredStrategies: ReturnType<typeof usePolymarketData>['strategies'];
}) {
  // Only show bets from strategies matching current trading mode
  const liveBets = filteredStrategies.flatMap(s => 
    (s.currentMarket?.bets || [])
      .filter(b => b.executed)
      .map(b => ({
        ...b,
        strategyId: s.id,
        strategyName: s.name,
        strategyColor: s.color,
        side: s.currentMarket?.side,
        shares: b.shares || 0,
        price: b.price || 0.5
      }))
  ).sort((a, b) => a.minute - b.minute);

  // Only show active strategies matching current trading mode
  const activeStrategies = filteredStrategies.filter(s => s.currentMarket?.side);
  const btcUp = (data.currentMarket?.changePercent || 0) >= 0;
  const duration = data.selectedMarket?.timeframe === '5min' ? 5 : 15;

  return (
    <div className="space-y-4">
      {/* Live Bets Panel */}
      {data.currentMarket && (
        <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 rounded-lg p-3 sm:p-4 border border-blue-500/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm sm:text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live Bets
            </h3>
            <span className="text-xs sm:text-sm text-gray-400">
              Market {data.currentMarket.elapsed.toFixed(1)}/{duration} min
            </span>
          </div>
          
          {activeStrategies.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {activeStrategies.map(s => {
                  const pos = s.currentMarket!;
                  const ifWin = pos.shares - pos.costBet;
                  const ifLose = -pos.costBet;
                  const isWinning = (pos.side === 'Up' && btcUp) || (pos.side === 'Down' && !btcUp);
                  
                  const changeAbs = Math.abs(data.currentMarket?.changePercent || 0);
                  const timeElapsed = data.currentMarket?.elapsed || 0;
                  const moveBoost = Math.min(15, changeAbs * 50);
                  const timeBoost = Math.min(15, (timeElapsed / duration) * 15);
                  const dynamicProb = isWinning 
                    ? Math.min(85, 50 + moveBoost + timeBoost)
                    : Math.max(15, 50 - moveBoost - timeBoost);
                  
                  return (
                    <div 
                      key={s.id}
                      className="bg-gray-800 rounded-lg p-3"
                      style={{ borderLeft: `4px solid ${s.color}` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{s.name.split(' ')[0]}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          pos.side === 'Up' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                        }`}>
                          {pos.side}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-gray-500">Cost</div>
                          <div className="font-mono">${pos.costBet.toFixed(0)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">If Win</div>
                          <div className="font-mono text-green-400">+${ifWin.toFixed(0)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">If Lose</div>
                          <div className="font-mono text-red-400">${ifLose.toFixed(0)}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Fills:</span>
                          <span className="text-white font-mono">{pos.fills}</span>
                        </div>
                        <div className={isWinning ? 'text-green-400' : 'text-red-400'}>
                          {dynamicProb.toFixed(0)}% {isWinning ? '✓' : '✗'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bet timeline */}
              <div className="flex gap-1 overflow-x-auto pb-2">
                {[...Array(duration)].map((_, min) => {
                  const betsAtMinute = liveBets.filter(b => Math.floor(b.minute) === min);
                  const isPast = data.currentMarket && min < data.currentMarket.elapsed;
                  return (
                    <div key={min} className="flex flex-col items-center min-w-[28px]">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
                        betsAtMinute.length > 0 
                          ? 'bg-blue-600 text-white' 
                          : isPast 
                            ? 'bg-gray-700 text-gray-500' 
                            : 'bg-gray-800 text-gray-600'
                      }`}>
                        {betsAtMinute.length > 0 ? betsAtMinute.length : min}
                      </div>
                      {betsAtMinute.length > 0 && (
                        <div className="flex gap-0.5 mt-1">
                          {betsAtMinute.map((b, i) => (
                            <div 
                              key={i} 
                              className="w-1.5 h-1.5 rounded-full" 
                              style={{ backgroundColor: b.strategyColor }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm text-center py-4">
              Waiting for bets... ({Math.ceil(data.currentMarket.elapsed)} min elapsed)
            </div>
          )}
        </div>
      )}

      {/* Strategy Cards */}
      {filteredStrategies.length === 0 && tradingMode === 'live' ? (
        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 text-center">
          <div className="text-4xl mb-4">{tradingMode === 'live' ? '💵' : '📝'}</div>
          <h3 className="text-xl font-semibold mb-2">
            No {tradingMode === 'live' ? 'Live' : 'Paper'} Strategies
          </h3>
          <p className="text-gray-400">
            {tradingMode === 'live' 
              ? 'Enable live trading on a strategy to see it here.'
              : 'All strategies are in live mode.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {filteredStrategies.map(strategy => (
            <StrategyCard 
              key={strategy.id} 
              strategy={strategy}
              tradingMode={tradingMode}
              onClick={() => data.setSelectedStrategy(strategy.id)}
            />
          ))}
        </div>
      )}

      {/* Comparison Table */}
      <div className="bg-gray-900 rounded-lg p-3 sm:p-4 border border-gray-800">
        <h3 className="text-sm sm:text-lg font-semibold mb-3 sm:mb-4">📈 Strategy Comparison</h3>
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[500px] sm:min-w-0">
            <thead>
              <tr className="text-left text-gray-400 text-xs sm:text-sm border-b border-gray-800">
                <th className="pb-2 pr-2">Strategy</th>
                <th className="pb-2 pr-2">Bal</th>
                <th className="pb-2 pr-2">P&L</th>
                <th className="pb-2 pr-2">ROI</th>
                <th className="pb-2 pr-2">Win%</th>
                <th className="pb-2">W/L</th>
              </tr>
            </thead>
            <tbody className="text-xs sm:text-sm">
              {[...filteredStrategies].sort((a, b) => 
                tradingMode === 'live' 
                  ? (b.livePnl || 0) - (a.livePnl || 0)
                  : b.totalPnl - a.totalPnl
              ).map(s => (
                <tr key={s.id} className="border-b border-gray-800/50">
                  <td className="py-2 sm:py-3 pr-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="font-medium truncate max-w-[80px] sm:max-w-none">{s.name.split(' ')[0]}</span>
                    </div>
                  </td>
                  <td className="py-2 sm:py-3 pr-2 font-mono">
                    ${tradingMode === 'live' ? (s.liveBalance || 0).toFixed(0) : s.balance.toFixed(0)}
                  </td>
                  <td className={`py-2 sm:py-3 pr-2 font-mono ${
                    (tradingMode === 'live' ? (s.livePnl || 0) : s.totalPnl) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(tradingMode === 'live' ? (s.livePnl || 0) : s.totalPnl) >= 0 ? '+' : ''}
                    ${(tradingMode === 'live' ? (s.livePnl || 0) : s.totalPnl).toFixed(0)}
                  </td>
                  <td className={`py-2 sm:py-3 pr-2 font-mono ${
                    (tradingMode === 'live' 
                      ? ((s.liveDeployed || 0) > 0 ? ((s.livePnl || 0) / (s.liveDeployed || 1)) * 100 : 0)
                      : s.roi) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {tradingMode === 'live'
                      ? `${((s.liveDeployed || 0) > 0 ? ((s.livePnl || 0) / (s.liveDeployed || 1)) * 100 : 0).toFixed(0)}%`
                      : `${s.roi >= 0 ? '+' : ''}${s.roi.toFixed(0)}%`
                    }
                  </td>
                  <td className="py-2 sm:py-3 pr-2">
                    {tradingMode === 'live'
                      ? `${((s.liveWins || 0) + (s.liveLosses || 0)) > 0 
                          ? (((s.liveWins || 0) / ((s.liveWins || 0) + (s.liveLosses || 0))) * 100).toFixed(0) 
                          : 0}%`
                      : `${s.winRate}%`
                    }
                  </td>
                  <td className="py-2 sm:py-3 whitespace-nowrap">
                    <span className="text-green-400">{tradingMode === 'live' ? (s.liveWins || 0) : s.wins}</span>
                    <span className="text-gray-500">/</span>
                    <span className="text-red-400">{tradingMode === 'live' ? (s.liveLosses || 0) : s.losses}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="bg-gray-900 rounded-lg p-3 sm:p-4 border border-gray-800">
        <h3 className="text-sm sm:text-lg font-semibold mb-3 sm:mb-4">📜 Recent Trades</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.strategies
            .flatMap(s => s.history.map(h => ({ ...h, strategyId: s.id, strategyName: s.name, strategyColor: s.color })))
            .sort((a, b) => b.id.localeCompare(a.id))
            .slice(0, 20)
            .map(trade => (
              <div key={trade.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-800 rounded p-2 gap-1 sm:gap-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: trade.strategyColor }} />
                  <span className="text-gray-400 truncate max-w-[60px] sm:max-w-none">{trade.strategyName.split(' ')[0]}</span>
                  <span className={trade.side === 'Up' ? 'text-green-400' : 'text-red-400'}>{trade.side}</span>
                  <span className="text-gray-500 hidden sm:inline">{trade.time}</span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 text-xs sm:text-sm">
                  <span className="text-gray-400">${trade.cost.toFixed(0)}</span>
                  <span className={`font-mono ${trade.result === 'WIN' ? 'text-green-400' : 'text-red-400'}`}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(0)}
                  </span>
                  <span className={`text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${trade.result === 'WIN' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                    {trade.result === 'WIN' ? 'W' : 'L'}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function StrategyCard({ strategy, tradingMode = 'paper', onClick }: { 
  strategy: ReturnType<typeof usePolymarketData>['strategies'][0]; 
  tradingMode?: 'paper' | 'live';
  onClick: () => void;
}) {
  const isActive = strategy.currentMarket && strategy.currentMarket.fills > 0;
  const isLiveView = tradingMode === 'live';
  
  // Calculate stats based on mode
  const balance = isLiveView ? (strategy.liveBalance || 0) : strategy.balance;
  const pnl = isLiveView ? (strategy.livePnl || 0) : strategy.totalPnl;
  const wins = isLiveView ? (strategy.liveWins || 0) : strategy.wins;
  const losses = isLiveView ? (strategy.liveLosses || 0) : strategy.losses;
  const winRate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const allocation = strategy.liveAllocation || 0;
  const budgetPct = allocation > 0 ? (balance / allocation) * 100 : 100;
  
  // Determine halt status based on mode
  const isHaltedForMode = isLiveView ? strategy.liveHalted : strategy.halted;
  
  return (
    <div 
      onClick={onClick}
      className={`bg-gray-900 rounded-lg p-3 sm:p-4 border cursor-pointer transition-all ${
        isHaltedForMode ? 'border-red-600 opacity-60' : 'border-gray-800 hover:border-gray-700'
      }`}
      style={{ borderTopWidth: '3px', borderTopColor: isHaltedForMode ? '#dc2626' : strategy.color }}
    >
      {/* Status badges */}
      <div className="flex items-center gap-1 mb-1 flex-wrap">
        {isLiveView ? (
          <span className="text-xs bg-yellow-600 text-yellow-100 px-1.5 py-0.5 rounded font-bold">💰 LIVE</span>
        ) : (
          <span className="text-xs bg-blue-600 text-blue-100 px-1.5 py-0.5 rounded">📄 Paper</span>
        )}
        {/* Show appropriate halt status based on mode */}
        {isLiveView && strategy.liveHalted && (
          <span className="text-xs bg-red-600 text-red-100 px-1.5 py-0.5 rounded font-bold">🛑 LIVE HALTED</span>
        )}
        {!isLiveView && strategy.halted && (
          <span className="text-xs bg-red-600 text-red-100 px-1.5 py-0.5 rounded font-bold">🛑 HALTED</span>
        )}
        {/* Show locked funds indicator for live mode */}
        {isLiveView && (strategy.lockedFunds || 0) > 0 && (
          <span className="text-xs bg-orange-600 text-orange-100 px-1.5 py-0.5 rounded">🔒 ${(strategy.lockedFunds || 0).toFixed(0)}</span>
        )}
      </div>
      
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <h3 className="font-semibold text-sm sm:text-base truncate">{strategy.name}</h3>
        {isActive && !isHaltedForMode && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0 ml-1" />}
      </div>
      <p className="text-xs text-gray-500 mb-2 sm:mb-3 line-clamp-2">{strategy.description}</p>
      
      {/* Budget indicator for live mode */}
      {isLiveView && (
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Budget</span>
            <span className={`font-mono ${budgetPct < 25 ? 'text-red-400' : 'text-yellow-400'}`}>
              ${balance.toFixed(0)}/${allocation}
            </span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${budgetPct < 25 ? 'bg-red-500' : budgetPct < 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, budgetPct)}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
        <div>
          <div className="text-gray-400 text-xs">{isLiveView ? 'Budget' : 'Balance'}</div>
          <div className={`font-mono truncate ${isLiveView ? (budgetPct < 25 ? 'text-red-400' : 'text-yellow-400') : (strategy.balance <= strategy.stopLossThreshold ? 'text-red-400' : 'text-green-400')}`}>
            ${balance.toFixed(0)}
          </div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">P&L</div>
          <div className={`font-mono truncate ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}
          </div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">Win Rate</div>
          <div>{winRate}%</div>
        </div>
        <div>
          <div className="text-gray-400 text-xs">{isLiveView ? 'Record' : 'Markets'}</div>
          <div>{isLiveView ? `${wins}W/${losses}L` : strategy.totalMarkets}</div>
        </div>
      </div>
      
      {strategy.currentMarket?.side && !isHaltedForMode && (
        <div className={`mt-2 sm:mt-3 px-2 py-1 rounded text-center text-xs sm:text-sm ${
          strategy.currentMarket.side === 'Up' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
        }`}>
          {strategy.currentMarket.side} • ${strategy.currentMarket.costBet.toFixed(0)}
        </div>
      )}
      
      {/* Show appropriate halt reason based on mode */}
      {isLiveView && strategy.liveHaltedReason && (
        <div className="mt-2 text-xs text-red-400 bg-red-900/30 rounded p-1 text-center">
          {strategy.liveHaltedReason}
        </div>
      )}
      {!isLiveView && strategy.haltedReason && (
        <div className="mt-2 text-xs text-red-400 bg-red-900/30 rounded p-1 text-center">
          {strategy.haltedReason}
        </div>
      )}
      {/* Show pending bets info for live mode */}
      {isLiveView && (strategy.pendingBets?.length || 0) > 0 && (
        <div className="mt-2 text-xs text-orange-400 bg-orange-900/30 rounded p-1 text-center">
          {strategy.pendingBets?.length || 0} pending bet(s)
        </div>
      )}
    </div>
  );
}

function DetailView({ strategy, market, assetPrice }: { 
  strategy: ReturnType<typeof usePolymarketData>['strategies'][0];
  market?: ReturnType<typeof usePolymarketData>['currentMarket'];
  assetPrice: number;
}) {
  const pos = strategy.currentMarket;
  const elapsed = market?.elapsed || 0;
  const fills = pos?.bets.filter(b => b.executed).length || 0;
  
  const cost = pos?.costBet || 0;
  const shares = pos?.shares || 0;
  const ifWin = shares - cost;
  const ifLose = -cost;
  const winProb = pos?.side ? (pos.side === 'Up' ? 
    (market?.changePercent || 0) >= 0 ? 65 : 35 : 
    (market?.changePercent || 0) < 0 ? 65 : 35) : 50;
  
  const recentWins = strategy.history.filter(t => t.result === 'WIN').slice(0, 5);
  const totalClaimed = strategy.history.filter(t => t.result === 'WIN').reduce((sum, t) => sum + t.payout, 0);
  
  const avgWin = strategy.wins > 0 
    ? strategy.history.filter(t => t.result === 'WIN').reduce((sum, t) => sum + t.pnl, 0) / strategy.wins 
    : 0;
  const avgLoss = strategy.losses > 0 
    ? Math.abs(strategy.history.filter(t => t.result === 'LOSS').reduce((sum, t) => sum + t.pnl, 0) / strategy.losses)
    : 0;

  return (
    <div className="space-y-4">
      {/* Current Market Panel */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: strategy.color }}>{strategy.name}</h2>
            <p className="text-gray-500 text-sm">{strategy.description}</p>
          </div>
          {pos?.side && (
            <div className={`px-4 py-2 rounded-lg text-lg font-bold ${
              pos.side === 'Up' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
            }`}>
              {pos.side === 'Up' ? '📈' : '📉'} {pos.side}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <div className="bg-gray-800/50 rounded p-3">
            <div className="text-gray-400 text-xs uppercase">Cost</div>
            <div className="text-xl font-mono text-white">${cost.toFixed(2)}</div>
            <div className="text-gray-500 text-xs">{shares} shares</div>
          </div>
          <div className="bg-gray-800/50 rounded p-3">
            <div className="text-gray-400 text-xs uppercase">Win Prob</div>
            <div className="text-xl font-mono text-white">{winProb}%</div>
            <div className="text-gray-500 text-xs">estimated</div>
          </div>
          <div className="bg-gray-800/50 rounded p-3">
            <div className="text-gray-400 text-xs uppercase">If Win</div>
            <div className="text-xl font-mono text-green-400">+${ifWin.toFixed(2)}</div>
            <div className="text-gray-500 text-xs">payout ${shares.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800/50 rounded p-3">
            <div className="text-gray-400 text-xs uppercase">If Lose</div>
            <div className="text-xl font-mono text-red-400">${ifLose.toFixed(2)}</div>
            <div className="text-gray-500 text-xs">lose bet</div>
          </div>
          <div className="bg-gray-800/50 rounded p-3">
            <div className="text-gray-400 text-xs uppercase">Live P&L</div>
            <div className={`text-xl font-mono ${(pos?.livePnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(pos?.livePnl || 0) >= 0 ? '+' : ''}${(pos?.livePnl || 0).toFixed(2)}
            </div>
            <div className="text-gray-500 text-xs">value ${(cost + (pos?.livePnl || 0)).toFixed(2)}</div>
          </div>
          <div className="bg-gray-800/50 rounded p-3">
            <div className="text-gray-400 text-xs uppercase">Asset</div>
            <div className="text-xl font-mono text-white">${assetPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
            <div className={`text-xs ${(market?.changePercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(market?.changePercent || 0) >= 0 ? '+' : ''}{(market?.changePercent || 0).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-2">
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-1000"
              style={{ width: `${(elapsed / 15) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Elapsed: {elapsed.toFixed(2)} / 15.00 | Fills: {fills}/4</span>
          <span>{winProb}%</span>
        </div>
      </div>

      {/* Live Trading Stats (if in live mode) */}
      {strategy.liveMode && (
        <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-600/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-yellow-400">🔴 Live Trading</h3>
            <div className={`text-lg font-mono ${((strategy.liveBalance || 0) / (strategy.liveAllocation || 1) * 100) < 25 ? 'text-red-400' : 'text-yellow-400'}`}>
              Budget: ${(strategy.liveBalance || 0).toFixed(2)} / ${strategy.liveAllocation || 0}
              <span className="text-sm ml-1">({(((strategy.liveBalance || 0) / (strategy.liveAllocation || 1)) * 100).toFixed(0)}%)</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-900/50 rounded p-3">
              <div className="text-gray-400 text-xs uppercase">Budget Left</div>
              <div className={`text-2xl font-mono ${((strategy.liveBalance || 0) / (strategy.liveAllocation || 1) * 100) < 25 ? 'text-red-400' : 'text-yellow-400'}`}>
                ${(strategy.liveBalance || 0).toFixed(2)}
              </div>
              <div className="text-gray-500 text-xs">stops at 10%</div>
            </div>
            <div className="bg-gray-900/50 rounded p-3">
              <div className="text-gray-400 text-xs uppercase">Live P&L</div>
              <div className={`text-2xl font-mono ${(strategy.livePnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(strategy.livePnl || 0) >= 0 ? '+' : ''}${(strategy.livePnl || 0).toFixed(2)}
              </div>
              <div className="text-gray-500 text-xs">deployed: ${(strategy.liveDeployed || 0).toFixed(2)}</div>
            </div>
            <div className="bg-gray-900/50 rounded p-3">
              <div className="text-gray-400 text-xs uppercase">Live Record</div>
              <div className="text-2xl font-mono">{strategy.liveWins || 0}W / {strategy.liveLosses || 0}L</div>
              <div className="text-gray-500 text-xs">
                {((strategy.liveWins || 0) + (strategy.liveLosses || 0)) > 0 
                  ? `${(((strategy.liveWins || 0) / ((strategy.liveWins || 0) + (strategy.liveLosses || 0))) * 100).toFixed(0)}% win rate`
                  : 'No trades yet'}
              </div>
            </div>
            <div className="bg-gray-900/50 rounded p-3">
              <div className="text-gray-400 text-xs uppercase">Initial Budget</div>
              <div className="text-2xl font-mono text-white">${strategy.liveAllocation || 10}</div>
              <div className="text-gray-500 text-xs">from wallet</div>
            </div>
          </div>
        </div>
      )}

      {/* Paper Trading Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <div className="text-gray-400 text-xs uppercase">{strategy.liveMode ? '📄 Paper P&L' : 'Total P&L'}</div>
          <div className={`text-2xl font-mono ${strategy.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {strategy.totalPnl >= 0 ? '+' : ''}${strategy.totalPnl.toFixed(2)}
          </div>
          <div className="text-gray-500 text-xs">{strategy.totalMarkets} markets</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <div className="text-gray-400 text-xs uppercase">Win Rate</div>
          <div className="text-2xl font-mono">{strategy.wins}W / {strategy.losses}L</div>
          <div className="text-gray-500 text-xs">{strategy.winRate}%</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <div className="text-gray-400 text-xs uppercase">ROI</div>
          <div className={`text-2xl font-mono ${strategy.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {strategy.roi >= 0 ? '+' : ''}{strategy.roi.toFixed(1)}%
          </div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <div className="text-gray-400 text-xs uppercase">Avg Win</div>
          <div className="text-2xl font-mono text-green-400">+${avgWin.toFixed(2)}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <div className="text-gray-400 text-xs uppercase">Avg Loss</div>
          <div className="text-2xl font-mono text-red-400">-${avgLoss.toFixed(2)}</div>
        </div>
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-800">
          <div className="text-gray-400 text-xs uppercase">Claimed</div>
          <div className="text-2xl font-mono text-green-400">${totalClaimed.toFixed(2)}</div>
        </div>
      </div>

      {/* P&L Chart + Claims */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h3 className="text-lg font-semibold mb-4">Cumulative P&L</h3>
          {strategy.pnlHistory.length > 0 ? (
            <div className="h-48 flex items-end relative">
              <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500">
                <span>${Math.max(...strategy.pnlHistory.map(p => p.cumulative), 0).toFixed(0)}</span>
                <span>$0</span>
                <span>${Math.min(...strategy.pnlHistory.map(p => p.cumulative), 0).toFixed(0)}</span>
              </div>
              <div className="flex-1 ml-12 h-full flex items-end">
                <svg className="w-full h-full" preserveAspectRatio="none">
                  <line x1="0" x2="100%" y1="50%" y2="50%" stroke="#374151" strokeDasharray="4" />
                  <polyline
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2"
                    points={strategy.pnlHistory.map((p, i) => {
                      const x = (i / Math.max(strategy.pnlHistory.length - 1, 1)) * 100;
                      const maxAbs = Math.max(...strategy.pnlHistory.map(pt => Math.abs(pt.cumulative)), 1);
                      const y = 50 - (p.cumulative / maxAbs) * 45;
                      return `${x}%,${y}%`;
                    }).join(' ')}
                  />
                  {strategy.pnlHistory.map((p, i) => {
                    const x = (i / Math.max(strategy.pnlHistory.length - 1, 1)) * 100;
                    const maxAbs = Math.max(...strategy.pnlHistory.map(pt => Math.abs(pt.cumulative)), 1);
                    const y = 50 - (p.cumulative / maxAbs) * 45;
                    return (
                      <circle key={i} cx={`${x}%`} cy={`${y}%`} r="3" fill={p.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                    );
                  })}
                </svg>
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">No trades yet</div>
          )}
        </div>

        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h3 className="text-lg font-semibold mb-4">Claims</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentWins.length > 0 ? (
              <>
                <div className="flex justify-between text-xs text-gray-400 border-b border-gray-800 pb-2">
                  <span>TIME</span>
                  <span>AMOUNT</span>
                </div>
                {recentWins.map(win => (
                  <div key={win.id} className="flex justify-between text-sm">
                    <span className="text-gray-400">{win.time}</span>
                    <span className="text-green-400 font-mono">+${win.payout.toFixed(2)}</span>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-gray-500 text-center py-4">No wins yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Strategy Logs */}
      <div className="bg-gray-900 rounded-lg p-3 sm:p-4 border border-gray-800">
        <h3 className="text-sm sm:text-lg font-semibold mb-3 sm:mb-4">📋 CLOB Activity Log</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
          {(!strategy.logs || strategy.logs.length === 0) ? (
            <div className="text-gray-500 text-center py-4">No activity yet - waiting for bets...</div>
          ) : (
            [...strategy.logs].reverse().map((log, i) => (
              <div key={i} className={`flex gap-2 px-2 py-1 rounded ${
                log.type === 'error' ? 'bg-red-900/30 text-red-300' :
                log.type === 'fill' ? 'bg-green-900/30 text-green-300' :
                log.type === 'clob' ? 'bg-blue-900/30 text-blue-300' :
                log.type === 'resolve' ? 'bg-purple-900/30 text-purple-300' :
                log.type === 'bet' ? 'bg-yellow-900/30 text-yellow-300' :
                'bg-gray-800 text-gray-400'
              }`}>
                <span className="text-gray-500 shrink-0">{log.time}</span>
                <span className="shrink-0">{
                  log.type === 'error' ? '❌' :
                  log.type === 'fill' ? '✅' :
                  log.type === 'clob' ? '📡' :
                  log.type === 'resolve' ? '📊' :
                  log.type === 'bet' ? '🎲' : 'ℹ️'
                }</span>
                <span className="break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Trade History */}
      <div className="bg-gray-900 rounded-lg p-3 sm:p-4 border border-gray-800">
        <h3 className="text-sm sm:text-lg font-semibold mb-3 sm:mb-4">📜 Trade History</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {strategy.history.length === 0 ? (
            <div className="text-gray-500 text-center py-8 text-sm">No trades yet</div>
          ) : (
            strategy.history.map(trade => (
              <div key={trade.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-800 rounded p-2 sm:p-3 gap-2">
                <div className="flex items-center gap-2 sm:gap-4">
                  <span className={`text-sm sm:text-lg ${trade.side === 'Up' ? 'text-green-400' : 'text-red-400'}`}>
                    {trade.side === 'Up' ? '📈' : '📉'} {trade.side}
                  </span>
                  <span className="text-gray-500 text-xs sm:text-sm">{trade.time}</span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 text-xs sm:text-sm">
                  <div><span className="text-gray-400">$</span>{trade.cost.toFixed(0)}</div>
                  <div><span className="text-gray-400 hidden sm:inline">→</span> ${trade.payout.toFixed(0)}</div>
                  <div className={`font-mono font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(0)}
                  </div>
                  <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs ${trade.result === 'WIN' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                    {trade.result === 'WIN' ? 'W' : 'L'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
