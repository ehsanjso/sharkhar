'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="h-9 w-9 flex items-center justify-center rounded-full transition-all">
        <Sun className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  return (
    <button
      className="h-9 w-9 flex items-center justify-center rounded-full transition-all hover:bg-[var(--glass-bg)] hover:scale-110 active:scale-95"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
      ) : (
        <Moon className="h-4 w-4 text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
