import { Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  connected: boolean;
  live: boolean;
  currentTime: string;
}

export function Header({ connected, live, currentTime }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4 border-b border-dark-600">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="text-xl md:text-2xl">📊</div>
        <h1 className="text-base md:text-xl font-semibold text-white">Polymarket Bot</h1>
      </div>
      
      <div className="flex items-center gap-2 md:gap-6">
        <div className="hidden sm:flex items-center gap-2 text-xs md:text-sm text-gray-400">
          {connected ? (
            <>
              <Wifi className="w-3 h-3 md:w-4 md:h-4 text-accent-green" />
              <span>Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 md:w-4 md:h-4 text-accent-red" />
              <span>Disconnected</span>
            </>
          )}
        </div>
        
        <span className="text-xs md:text-sm text-gray-400">{currentTime}</span>
        
        {live && (
          <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-accent-green/10 border border-accent-green/30">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-accent-green animate-pulse-green" />
            <span className="text-xs md:text-sm font-medium text-accent-green">LIVE</span>
          </div>
        )}
      </div>
    </header>
  );
}
