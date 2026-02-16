import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import type { MarketTrade } from '../types';

interface HistoryTableProps {
  trades: MarketTrade[];
  liveMarkets?: number;
}

export function HistoryTable({ trades, liveMarkets = 0 }: HistoryTableProps) {
  return (
    <div className="glass rounded-xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h3 className="text-base md:text-lg font-medium text-white">Market History</h3>
        {liveMarkets > 0 && (
          <span className="text-xs md:text-sm text-gray-400">{liveMarkets} live</span>
        )}
      </div>
      
      {/* Mobile view - Cards */}
      <div className="md:hidden space-y-2 max-h-80 overflow-auto">
        {trades.slice(0, 10).map((trade) => (
          <div key={trade.id} className="bg-dark-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`flex items-center gap-1 text-sm font-medium ${
                  trade.side === 'Up' ? 'text-accent-green' : 'text-accent-red'
                }`}>
                  {trade.side === 'Up' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {trade.side}
                </span>
                <span className="text-xs text-gray-500 font-mono">{trade.time}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                trade.result === 'WIN'
                  ? 'bg-accent-green/20 text-accent-green'
                  : trade.result === 'LOSS'
                    ? 'bg-accent-red/20 text-accent-red'
                    : 'bg-accent-blue/20 text-accent-blue'
              }`}>
                {trade.result}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{trade.shares} shares @ ${trade.cost.toFixed(2)}</span>
              <span className={`font-medium ${
                trade.result === 'ACTIVE' 
                  ? 'text-gray-500'
                  : trade.pnl >= 0 
                    ? 'text-accent-green' 
                    : 'text-accent-red'
              }`}>
                {trade.result === 'ACTIVE' ? '—' : (
                  <>{trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}</>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop view - Table */}
      <div className="hidden md:block overflow-auto max-h-80">
        <table className="w-full">
          <thead className="sticky top-0 bg-dark-700">
            <tr className="text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left py-2 px-3">Time</th>
              <th className="text-left py-2 px-3">Side</th>
              <th className="text-right py-2 px-3">Shares</th>
              <th className="text-right py-2 px-3">Cost</th>
              <th className="text-right py-2 px-3">Payout</th>
              <th className="text-right py-2 px-3">P&L</th>
              <th className="text-center py-2 px-3">Result</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {trades.map((trade) => (
              <tr key={trade.id} className="border-t border-dark-600 hover:bg-dark-600/50">
                <td className="py-2 px-3 text-gray-300 font-mono">{trade.time}</td>
                <td className="py-2 px-3">
                  <span className={`flex items-center gap-1 ${
                    trade.side === 'Up' ? 'text-accent-green' : 'text-accent-red'
                  }`}>
                    {trade.side === 'Up' ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {trade.side}
                  </span>
                </td>
                <td className="py-2 px-3 text-right text-gray-300">{trade.shares}</td>
                <td className="py-2 px-3 text-right text-gray-300">${trade.cost.toFixed(2)}</td>
                <td className="py-2 px-3 text-right text-gray-300">
                  {trade.result === 'ACTIVE' ? (
                    <span className="flex items-center justify-end gap-1 text-gray-500">
                      <Loader2 className="w-3 h-3 animate-spin" />
                    </span>
                  ) : (
                    `$${trade.payout.toFixed(2)}`
                  )}
                </td>
                <td className={`py-2 px-3 text-right font-medium ${
                  trade.result === 'ACTIVE' 
                    ? 'text-gray-500'
                    : trade.pnl >= 0 
                      ? 'text-accent-green' 
                      : 'text-accent-red'
                }`}>
                  {trade.result === 'ACTIVE' ? '—' : (
                    <>
                      {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                    </>
                  )}
                </td>
                <td className="py-2 px-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    trade.result === 'WIN'
                      ? 'bg-accent-green/20 text-accent-green'
                      : trade.result === 'LOSS'
                        ? 'bg-accent-red/20 text-accent-red'
                        : 'bg-accent-blue/20 text-accent-blue'
                  }`}>
                    {trade.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
