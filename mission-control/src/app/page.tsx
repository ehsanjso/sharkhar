'use client';

import { useState, useEffect } from 'react';
import { Search, Send, Plus, Pause, Bell, FileText, Users, ListTodo, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format, parseISO } from 'date-fns';
import { Document } from '@/lib/types';

type TabType = 'docs' | 'tasks' | 'people';
type FilterType = 'all' | 'journal' | 'other' | 'content' | 'newsletters';

const filterColors: Record<string, string> = {
  journal: 'tag-journal',
  content: 'tag-content',
  newsletters: 'tag-newsletters',
  other: 'tag-other',
  notes: 'tag-notes',
  memory: 'tag-other',
  document: 'tag-other',
  task: 'tag-content',
};

function getTagClass(type: string): string {
  return filterColors[type.toLowerCase()] || 'tag-other';
}

function formatDocDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, 'yyyy-MM-dd — EEEE');
  } catch {
    return dateStr;
  }
}

export default function MissionControl() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('docs');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      setDocuments(data);
      if (data.length > 0) {
        setSelectedDoc(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: 'journal', label: 'Journal' },
    { id: 'other', label: 'Other' },
    { id: 'content', label: 'Content' },
    { id: 'newsletters', label: 'Newsletters' },
  ];

  const filteredDocuments = documents.filter((doc) => {
    // Search filter
    if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Type filter
    if (activeFilter === 'all') return true;
    if (activeFilter === 'journal') return doc.type === 'journal';
    if (activeFilter === 'other') return doc.type === 'memory' || doc.type === 'document';
    if (activeFilter === 'content') return doc.type === 'note' || doc.tags.includes('content');
    if (activeFilter === 'newsletters') return doc.tags.includes('newsletters');
    return true;
  });

  const tabs = [
    { id: 'tasks' as TabType, label: 'Tasks', icon: ListTodo },
    { id: 'docs' as TabType, label: 'Docs', icon: FileText },
    { id: 'people' as TabType, label: 'People', icon: Users },
  ];

  return (
    <div className="h-screen flex flex-col bg-[var(--background)]">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--background-secondary)]">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-[var(--accent)] to-blue-600 flex items-center justify-center text-white text-xs font-bold">
              ⚡
            </div>
            <span className="font-semibold text-sm">Mission Control</span>
          </div>
          
          {/* Tabs */}
          <nav className="flex items-center gap-1 ml-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[var(--card)] text-[var(--foreground)]'
                      : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)]'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-hover)] transition-colors">
            <Pause size={14} />
            Pause
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-[var(--accent)] text-white hover:bg-[var(--accent-muted)] transition-colors">
            <Bell size={14} />
            Ping Henry
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 border-r border-[var(--border)] flex flex-col bg-[var(--background-secondary)]">
          {/* Search */}
          <div className="p-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--card)] rounded-lg border border-[var(--border)]">
              <Search size={14} className="text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search documents"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm outline-none flex-1 placeholder:text-[var(--muted)]"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="px-3 pb-3 flex gap-1.5 flex-wrap">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(activeFilter === filter.id ? 'all' : filter.id)}
                className={`filter-btn px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeFilter === filter.id
                    ? `${getTagClass(filter.id)} active`
                    : 'text-[var(--muted)] bg-transparent'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Sort toggle */}
          <div className="px-3 pb-2 flex items-center gap-2 text-xs text-[var(--muted)]">
            <span>Sort</span>
            <button className="flex items-center gap-1 hover:text-[var(--foreground)]">
              ↓ Recent first
            </button>
          </div>

          {/* Document List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-[var(--muted)]">Loading...</div>
            ) : filteredDocuments.length === 0 ? (
              <div className="p-4 text-center text-[var(--muted)]">No documents found</div>
            ) : (
              filteredDocuments.map((doc) => (
                <button
                  key={doc.slug}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full text-left px-3 py-2.5 border-l-2 transition-colors ${
                    selectedDoc?.slug === doc.slug
                      ? 'bg-[var(--card)] border-[var(--accent)]'
                      : 'border-transparent hover:bg-[var(--card-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-[var(--muted)] flex-shrink-0" />
                    <span className="text-sm truncate">{doc.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${getTagClass(doc.type)}`}>
                      {doc.type}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-1 ml-6 truncate">
                    {doc.path}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedDoc ? (
            <>
              {/* Document Header */}
              <div className="p-4 border-b border-[var(--border)] bg-[var(--background-secondary)]">
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-medium">{selectedDoc.title}</h1>
                  <span className={`text-xs px-2 py-0.5 rounded ${getTagClass(selectedDoc.type)}`}>
                    {selectedDoc.type}
                  </span>
                </div>
                <p className="text-sm text-[var(--muted)] mt-1">{selectedDoc.path}</p>
              </div>

              {/* Document Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl">
                  {/* Date Header */}
                  <h2 className="text-xl font-semibold mb-6">
                    {formatDocDate(selectedDoc.date)}
                  </h2>
                  
                  {/* Timeline Entry */}
                  <div className="space-y-4">
                    <article className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {selectedDoc.content}
                      </ReactMarkdown>
                    </article>
                  </div>
                </div>
              </div>

              {/* Input Bar */}
              <div className="p-4 border-t border-[var(--border)] bg-[var(--background-secondary)]">
                <div className="flex items-center gap-3">
                  <button className="p-2 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)] rounded-lg transition-colors">
                    <span className="text-xs">Debug</span>
                  </button>
                  <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-[var(--card)] rounded-lg border border-[var(--border)]">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Send a message to Henry..."
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
                    />
                  </div>
                  <button className="px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card)] rounded-lg transition-colors">
                    New session
                  </button>
                  <button className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-muted)] transition-colors flex items-center gap-1.5">
                    <Send size={14} />
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a document to view</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
