import { TrendingUp, TrendingDown } from 'lucide-react';
import type { CurrentMarket as CurrentMarketType } from '../types';

interface CurrentMarketProps {
  market: CurrentMarketType | null;
}

export function CurrentMarket({ market }: CurrentMarketProps) {
  if (!market) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="text-center text-gray-500 py-8">
          Waiting for next market...
        </div>
      </div>
    );
  }

  const progressPercent = (market.elapsed / market.total) * 100;
  const winProgressPercent = market.confidence;

  return (
    <div className="glass rounded-xl p-4 md:p-6">
      {/* Title and Side */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
        <h2 className="text-base md:text-lg font-medium text-white">{market.title}</h2>
        {market.side && (
          <button
            className={`px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 w-full sm:w-auto ${
              market.side === 'Up'
                ? 'bg-accent-green/20 text-accent-green border border-accent-green/30'
                : 'bg-accent-red/20 text-accent-red border border-accent-red/30'
            }`}
          >
            {market.side === 'Up' ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {market.side.toUpperCase()}
          </button>
        )}
      </div>

      {/* Stats Row - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-4 md:mb-6">
        <div className="p-3 bg-dark-700/50 rounded-lg">
          <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mb-1">Cost (Bet)</div>
          <div className="text-lg md:text-2xl font-semibold text-white">${market.costBet.toFixed(2)}</div>
          <div className="text-[10px] md:text-xs text-gray-500">{Math.round(market.shares)} shares @ ${market.avgPrice.toFixed(2)}</div>
        </div>
        
        <div className="p-3 bg-dark-700/50 rounded-lg">
          <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mb-1">Win Prob</div>
          <div className="text-lg md:text-2xl font-semibold text-accent-blue">{Math.round(market.winProbability)}%</div>
          <div className="text-[10px] md:text-xs text-gray-500">orderbook mid</div>
        </div>
        
        <div className="p-3 bg-dark-700/50 rounded-lg">
          <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mb-1">If We Win</div>
          <div className="text-lg md:text-2xl font-semibold text-accent-green">+${Math.round(market.ifWeWin * 100) / 100}</div>
          <div className="text-[10px] md:text-xs text-gray-500">payout ${Math.round(market.shares)}</div>
        </div>
        
        <div className="p-3 bg-dark-700/50 rounded-lg">
          <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mb-1">If We Lose</div>
          <div className="text-lg md:text-2xl font-semibold text-accent-red">-${Math.round(Math.abs(market.ifWeLose) * 100) / 100}</div>
          <div className="text-[10px] md:text-xs text-gray-500">lose entire bet</div>
        </div>
        
        <div className="p-3 bg-dark-700/50 rounded-lg col-span-2 sm:col-span-1">
          <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mb-1">Live P&L</div>
          <div className={`text-lg md:text-2xl font-semibold ${market.livePnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {market.livePnl >= 0 ? '+' : ''}${Math.round(market.livePnl * 100) / 100}
          </div>
          <div className="text-[10px] md:text-xs text-gray-500">value ${Math.round(market.liveValue * 100) / 100}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 md:h-3 bg-dark-600 rounded-full overflow-hidden relative">
          <div
            className="absolute inset-y-0 left-0 bg-accent-green/60 transition-all duration-500"
            style={{ width: `${winProgressPercent}%` }}
          />
          <div
            className="absolute inset-y-0 right-0 bg-accent-red/60"
            style={{ width: `${100 - winProgressPercent}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 md:w-1 bg-white transition-all duration-500"
            style={{ left: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Bottom Info - Responsive */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs md:text-sm">
        <div className="flex flex-wrap items-center gap-3 md:gap-6">
          <span className="text-gray-400">
            Elapsed: <span className="text-white">{Math.floor(market.elapsed * 10) / 10}/{market.total}</span>
          </span>
          <span className="text-gray-400 flex items-center gap-1">
            Fills: 
            <span className="flex items-center ml-1">
              {Array.from({ length: market.totalFills }).map((_, i) => (
                <span
                  key={i}
                  className={`inline-block w-1.5 h-1.5 md:w-2 md:h-2 rounded-full mx-0.5 ${
                    i < market.fills ? 'bg-accent-green' : 'bg-dark-500'
                  }`}
                />
              ))}
            </span>
            <span className="text-white ml-1">{market.fills}/{market.totalFills}</span>
          </span>
          <span className="text-gray-400">
            Conf: <span className="text-white">{Math.round(market.confidence)}%</span>
          </span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <span className="text-gray-400">
            BTC: <span className="text-white">${market.btcPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            <span className={`ml-1 ${market.btcChange >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {market.btcChange >= 0 ? '+' : ''}${market.btcChange.toFixed(2)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
