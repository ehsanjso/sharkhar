'use client';

import { useState, useEffect } from 'react';
import { Search, Send, FileText, MoreHorizontal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format, parseISO } from 'date-fns';
import { Document } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

type FilterType = 'all' | 'journal' | 'other' | 'content' | 'newsletters';

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
    <div className="h-[calc(100vh-3.5rem)] flex bg-background">
      {/* Sidebar */}
      <aside className="w-80 border-r flex flex-col bg-card">
        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="px-4 pb-4 flex gap-2 flex-wrap">
          {filters.map((filter) => (
            <Badge
              key={filter.id}
              variant={activeFilter === filter.id ? "default" : "secondary"}
              className="cursor-pointer"
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
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : filteredDocuments.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No documents found</div>
            ) : (
              filteredDocuments.map((doc) => (
                <button
                  key={doc.slug}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                    selectedDoc?.slug === doc.slug
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{doc.title}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 flex-shrink-0">
                          {doc.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
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
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        {selectedDoc ? (
          <>
            {/* Document Header */}
            <div className="px-6 py-4 border-b bg-card/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h1 className="text-lg font-semibold">{selectedDoc.title}</h1>
                  <Badge variant="outline">
                    {selectedDoc.type}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{selectedDoc.path}</p>
            </div>

            {/* Document Content */}
            <ScrollArea className="flex-1">
              <div className="p-6 max-w-4xl">
                <Card className="border-0 shadow-none">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-xl">
                      {formatDocDate(selectedDoc.date)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0">
                    <article className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80 prose-strong:text-foreground prose-a:text-primary prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {selectedDoc.content}
                      </ReactMarkdown>
                    </article>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>

            {/* Input Bar */}
            <div className="p-4 border-t bg-card/50">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  Debug
                </Button>
                <Input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Send a message..."
                  className="flex-1"
                />
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  New session
                </Button>
                <Button size="sm" className="gap-1.5">
                  <Send className="w-4 h-4" />
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a document to view</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
