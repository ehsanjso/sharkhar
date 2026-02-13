'use client';

import { 
  FileText, 
  Calendar, 
  Brain, 
  CheckSquare, 
  FolderOpen,
  Home,
  Search,
  Settings,
  Sparkles
} from 'lucide-react';
import { ViewType } from '@/lib/types';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  documentCounts: Record<string, number>;
}

export default function Sidebar({ currentView, onViewChange, documentCounts }: SidebarProps) {
  const navItems = [
    { id: 'all' as ViewType, label: 'All Documents', icon: Home, count: documentCounts.all },
    { id: 'journal' as ViewType, label: 'Journal', icon: Calendar, count: documentCounts.journal },
    { id: 'memory' as ViewType, label: 'Memories', icon: Brain, count: documentCounts.memory },
    { id: 'tasks' as ViewType, label: 'Tasks', icon: CheckSquare, count: documentCounts.task },
    { id: 'documents' as ViewType, label: 'Documents', icon: FolderOpen, count: documentCounts.document },
  ];

  return (
    <aside className="w-64 h-screen liquid-glass-sidebar flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--glass-border)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-primary/30 rounded-xl blur-md" />
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles size={20} className="text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="font-semibold text-sm text-foreground">Mission Control</h1>
            <p className="text-xs text-muted-foreground">Your Second Brain</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="flex items-center gap-2 px-3 py-2.5 liquid-glass rounded-xl">
          <Search size={14} className="text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted-foreground"
          />
          <span className="text-xs text-muted-foreground liquid-pill">⌘K</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  isActive
                    ? 'liquid-glass bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:liquid-glass hover:text-foreground'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-primary' : ''} />
                <span className="flex-1 text-left font-medium">{item.label}</span>
                {item.count > 0 && (
                  <span className={`liquid-pill ${
                    isActive 
                      ? 'bg-primary/20 text-primary border-primary/30' 
                      : 'text-muted-foreground'
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--glass-border)]">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:liquid-glass hover:text-foreground transition-all duration-200">
          <Settings size={16} />
          <span className="font-medium">Settings</span>
        </button>
      </div>
    </aside>
  );
}
