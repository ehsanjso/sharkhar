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
  Zap
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
    <aside className="w-64 h-screen bg-[var(--card)] border-r border-[var(--border)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-muted)] flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">Mission Control</h1>
            <p className="text-xs text-[var(--muted)]">Your Second Brain</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--background)] rounded-lg border border-[var(--border)]">
          <Search size={14} className="text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm outline-none flex-1 placeholder:text-[var(--muted)]"
          />
          <span className="text-xs text-[var(--muted)] bg-[var(--card)] px-1.5 py-0.5 rounded">⌘K</span>
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
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--accent)] bg-opacity-20 text-[var(--accent)]'
                    : 'text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)]'
                }`}
              >
                <Icon size={16} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-[var(--accent)] bg-opacity-30' : 'bg-[var(--border)]'
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
      <div className="p-3 border-t border-[var(--border)]">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--muted)] hover:bg-[var(--card-hover)] hover:text-[var(--foreground)] transition-colors">
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
