'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, ListTodo, Clock, Home, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/agent', label: 'Agent', icon: Brain },
  { href: '/crons', label: 'Crons', icon: Clock },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="liquid-glass-nav sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-primary/20 rounded-xl blur-lg" />
              <div className="relative liquid-glass-button rounded-xl p-2">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
            </div>
            <span className="font-semibold text-lg bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Mission Control
            </span>
          </div>
          
          {/* Nav Items */}
          <div className="flex items-center gap-1 liquid-glass rounded-full px-1.5 py-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 rounded-full shadow-lg shadow-primary/25" />
                  )}
                  <Icon className={cn("h-4 w-4 relative z-10", isActive && "text-primary-foreground")} />
                  <span className={cn("hidden sm:inline relative z-10", isActive && "text-primary-foreground")}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Theme Toggle */}
          <div className="liquid-glass-button rounded-full">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
