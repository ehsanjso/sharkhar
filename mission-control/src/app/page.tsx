'use client';

import { useState, useEffect } from 'react';
import { Search, Send, FileText, Users, ListTodo, Zap, MoreHorizontal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format, parseISO } from 'date-fns';
import { Document } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

type TabType = 'docs' | 'tasks' | 'people';
type FilterType = 'all' | 'journal' | 'other' | 'content' | 'newsletters';

const tagVariants: Record<string, string> = {
  journal: 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25',
  content: 'bg-purple-500/15 text-purple-400 hover:bg-purple-500/25',
  newsletters: 'bg-pink-500/15 text-pink-400 hover:bg-pink-500/25',
  other: 'bg-green-500/15 text-green-400 hover:bg-green-500/25',
  notes: 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25',
  memory: 'bg-green-500/15 text-green-400 hover:bg-green-500/25',
  document: 'bg-green-500/15 text-green-400 hover:bg-green-500/25',
};

function getTagVariant(type: string): string {
  return tagVariants[type.toLowerCase()] || tagVariants.other;
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
    if (searchQuery && !doc.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (activeFilter === 'all') return true;
    if (activeFilter === 'journal') return doc.type === 'journal';
    if (activeFilter === 'other') return doc.type === 'memory' || doc.type === 'document';
    if (activeFilter === 'content') return doc.type === 'note' || doc.tags.includes('content');
    if (activeFilter === 'newsletters') return doc.tags.includes('newsletters');
    return true;
  });

  return (
    <div className="h-screen flex flex-col bg-[var(--background)]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--background-secondary)]">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">Mission Control</span>
          </div>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
            <TabsList className="bg-[var(--card)]">
              <TabsTrigger value="tasks" className="gap-1.5 data-[state=active]:bg-[var(--background)]">
                <ListTodo className="w-4 h-4" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="docs" className="gap-1.5 data-[state=active]:bg-[var(--background)]">
                <FileText className="w-4 h-4" />
                Docs
              </TabsTrigger>
              <TabsTrigger value="people" className="gap-1.5 data-[state=active]:bg-[var(--background)]">
                <Users className="w-4 h-4" />
                People
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            Pause
          </Button>
          <Button size="sm" className="bg-[var(--accent)] hover:bg-[var(--accent)]/80">
            Ping Henry
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-[var(--border)] flex flex-col bg-[var(--background-secondary)]">
          {/* Search */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <Input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[var(--card)] border-[var(--border)]"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 pb-4 flex gap-2 flex-wrap">
            {filters.map((filter) => (
              <Badge
                key={filter.id}
                variant="secondary"
                className={`cursor-pointer transition-colors ${
                  activeFilter === filter.id
                    ? getTagVariant(filter.id)
                    : 'bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--card)]/80'
                }`}
                onClick={() => setActiveFilter(activeFilter === filter.id ? 'all' : filter.id)}
              >
                {filter.label}
              </Badge>
            ))}
          </div>

          <Separator />

          {/* Document List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {isLoading ? (
                <div className="p-4 text-center text-[var(--muted-foreground)]">Loading...</div>
              ) : filteredDocuments.length === 0 ? (
                <div className="p-4 text-center text-[var(--muted-foreground)]">No documents found</div>
              ) : (
                filteredDocuments.map((doc) => (
                  <button
                    key={doc.slug}
                    onClick={() => setSelectedDoc(doc)}
                    className={`w-full text-left p-3 rounded-lg mb-1 transition-all ${
                      selectedDoc?.slug === doc.slug
                        ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/30'
                        : 'hover:bg-[var(--card)] border border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 text-[var(--muted-foreground)] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{doc.title}</span>
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-5 flex-shrink-0 ${getTagVariant(doc.type)}`}>
                            {doc.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1 truncate">
                          {doc.path}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedDoc ? (
            <>
              {/* Document Header */}
              <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--background-secondary)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h1 className="text-lg font-semibold">{selectedDoc.title}</h1>
                    <Badge variant="secondary" className={getTagVariant(selectedDoc.type)}>
                      {selectedDoc.type}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">{selectedDoc.path}</p>
              </div>

              {/* Document Content */}
              <ScrollArea className="flex-1">
                <div className="p-6 max-w-4xl">
                  <Card className="bg-transparent border-none shadow-none">
                    <CardHeader className="px-0 pt-0">
                      <CardTitle className="text-xl">
                        {formatDocDate(selectedDoc.date)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-0">
                      <article className="markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {selectedDoc.content}
                        </ReactMarkdown>
                      </article>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>

              {/* Input Bar */}
              <div className="p-4 border-t border-[var(--border)] bg-[var(--background-secondary)]">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" className="text-[var(--muted-foreground)]">
                    Debug
                  </Button>
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Send a message to Henry..."
                      className="bg-[var(--card)] border-[var(--border)] pr-24"
                    />
                  </div>
                  <Button variant="ghost" size="sm" className="text-[var(--muted-foreground)]">
                    New session
                  </Button>
                  <Button size="sm" className="bg-[var(--accent)] hover:bg-[var(--accent)]/80 gap-1.5">
                    <Send className="w-4 h-4" />
                    Send
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-[var(--muted-foreground)]">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a document to view</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
