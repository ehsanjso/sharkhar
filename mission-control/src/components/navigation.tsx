'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ListTodo, Brain, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/agent', label: 'Agent', icon: Brain },
  { href: '/crons', label: 'Crons', icon: Clock },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* iOS-style bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 ios-tab-bar safe-area-bottom">
        <div className="flex items-center justify-around h-[49px] max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-[2px] min-w-[64px] h-full transition-colors"
                )}
              >
                {/* iOS uses filled icons for active, outline for inactive */}
                <Icon 
                  className={cn(
                    "h-[22px] w-[22px] transition-all",
                    isActive 
                      ? "text-[#007AFF]" // iOS system blue
                      : "text-[#8E8E93]"  // iOS gray
                  )} 
                  strokeWidth={isActive ? 2.25 : 1.75}
                  fill={isActive ? "currentColor" : "none"}
                />
                <span className={cn(
                  "text-[10px] font-medium leading-none",
                  isActive 
                    ? "text-[#007AFF]" // iOS system blue
                    : "text-[#8E8E93]"  // iOS gray
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
