import type { Claim } from '../types';

interface ClaimsProps {
  claims: Claim[];
}

export function Claims({ claims }: ClaimsProps) {
  return (
    <div className="glass rounded-xl p-4 md:p-6">
      <h3 className="text-base md:text-lg font-medium text-white mb-3 md:mb-4">Claims</h3>
      
      <div className="space-y-1 md:space-y-2">
        <div className="flex items-center justify-between text-[10px] md:text-xs text-gray-500 uppercase tracking-wider px-2">
          <span>Time</span>
          <span>Amount</span>
        </div>
        
        {claims.map((claim) => (
          <div
            key={claim.id}
            className="flex items-center justify-between py-1.5 md:py-2 px-2 rounded hover:bg-dark-600/50"
          >
            <span className="text-xs md:text-sm text-gray-400 font-mono">{claim.time}</span>
            <span className="text-xs md:text-sm font-medium text-accent-green">
              +${claim.amount.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
