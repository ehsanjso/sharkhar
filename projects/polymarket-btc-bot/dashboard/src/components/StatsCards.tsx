import type { BotStats } from '../types';

interface StatsCardsProps {
  stats: BotStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const fmt = (n: number) => Math.round(n * 100) / 100;
  
  const cards = [
    {
      label: 'TOTAL P&L',
      value: `${stats.totalPnl >= 0 ? '+' : ''}$${fmt(stats.totalPnl)}`,
      subtext: `${stats.totalMarkets} mkts • $${Math.round(stats.deployed)}`,
      color: stats.totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red',
    },
    {
      label: 'WIN RATE',
      value: `${stats.wins}W / ${stats.losses}L`,
      subtext: `${Math.round(stats.winRate)}% win rate`,
      color: 'text-white',
    },
    {
      label: 'ROI',
      value: `${fmt(stats.roi)}%`,
      subtext: 'on deployed',
      color: stats.roi >= 0 ? 'text-accent-green' : 'text-accent-red',
    },
    {
      label: 'AVG WIN',
      value: `+$${fmt(stats.avgWin)}`,
      subtext: `${stats.wins} wins`,
      color: 'text-accent-green',
    },
    {
      label: 'AVG LOSS',
      value: `-$${fmt(Math.abs(stats.avgLoss))}`,
      subtext: `${stats.losses} losses`,
      color: 'text-accent-red',
    },
    {
      label: 'CLAIMED',
      value: `$${fmt(stats.claimed)}`,
      subtext: 'USDC',
      color: 'text-accent-green',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
      {cards.map((card, i) => (
        <div key={i} className="glass rounded-lg md:rounded-xl p-3 md:p-4">
          <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mb-1 md:mb-2 truncate">
            {card.label}
          </div>
          <div className={`text-base md:text-2xl font-semibold ${card.color} truncate`}>
            {card.value}
          </div>
          <div className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1 truncate">
            {card.subtext}
          </div>
        </div>
      ))}
    </div>
  );
}
