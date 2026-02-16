'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, FileText, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format, parseISO } from 'date-fns';
import { Document } from '@/lib/types';

import { Badge } from '@/components/ui/badge';

type FilterType = 'all' | 'journal' | 'other' | 'content' | 'newsletters';

function formatDocDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, 'EEEE, MMMM d');
  } catch {
    return dateStr;
  }
}

export default function MissionControl() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showLargeTitle, setShowLargeTitle] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Handle scroll for large title transition
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        setShowLargeTitle(scrollRef.current.scrollTop < 20);
      }
    };

    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', handleScroll);
      return () => scrollEl.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      setDocuments(data);
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

  // Document detail view
  if (selectedDoc) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* iOS Navigation Bar with back button */}
        <header className="ios-nav-bar sticky top-0 z-40">
          <div className="flex items-center h-[44px] px-4">
            <button
              onClick={() => setSelectedDoc(null)}
              className="flex items-center text-[#007AFF] -ml-1"
            >
              <ChevronRight className="h-[22px] w-[22px] rotate-180 -mr-0.5" strokeWidth={2.5} />
              <span className="text-[17px]">Home</span>
            </button>
          </div>
        </header>

        {/* Document content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4">
            {/* Large title */}
            <h1 className="ios-large-title text-foreground mb-1">
              {selectedDoc.title}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {formatDocDate(selectedDoc.date)}
            </p>

            {/* Content */}
            <article className="prose prose-slate dark:prose-invert prose-sm max-w-none 
              prose-headings:text-foreground prose-headings:font-semibold
              prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3
              prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
              prose-p:text-foreground/85 prose-p:leading-relaxed prose-p:mb-3
              prose-li:text-foreground/85 prose-li:leading-relaxed
              prose-ul:my-3 prose-ul:pl-5 prose-ol:my-3 prose-ol:pl-5
              prose-strong:text-foreground prose-strong:font-semibold
              prose-a:text-primary prose-a:no-underline
              prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
              prose-pre:bg-muted prose-pre:border prose-pre:border-border">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {selectedDoc.content}
              </ReactMarkdown>
            </article>
          </div>
        </div>
      </div>
    );
  }

  // Main list view
  return (
    <div className="min-h-screen flex flex-col">
      {/* iOS Navigation Bar - shows when scrolled */}
      <header className={`ios-nav-bar sticky top-0 z-40 transition-all duration-200 ${
        showLargeTitle ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="flex items-center justify-center h-[44px] px-4">
          <h1 className="ios-navigation-title text-foreground">Home</h1>
        </div>
      </header>

      {/* Scrollable content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="px-4">
          {/* iOS Large Title - visible when at top */}
          <div className={`pt-2 pb-2 transition-all duration-200 ${
            showLargeTitle ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'
          }`}>
            <h1 className="ios-large-title text-foreground">Home</h1>
          </div>

          {/* iOS Search Field */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[36px] pl-9 pr-4 rounded-[10px] bg-muted/60 text-foreground placeholder:text-muted-foreground text-[17px] outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Filter Pills - iOS style horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(activeFilter === filter.id ? 'all' : filter.id)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                  activeFilter === filter.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted/60 text-foreground'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Document List - iOS grouped style */}
          <div className="ios-grouped-list mb-4">
            {isLoading ? (
              <div className="ios-list-item text-center text-muted-foreground py-8">
                Loading...
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="ios-list-item text-center text-muted-foreground py-8">
                No documents found
              </div>
            ) : (
              filteredDocuments.map((doc, index) => (
                <button
                  key={doc.slug}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full text-left ios-list-item flex items-center gap-3 active:bg-muted/80 transition-colors ${
                    index === 0 ? 'rounded-t-[10px]' : ''
                  } ${
                    index === filteredDocuments.length - 1 ? 'rounded-b-[10px] border-b-0' : ''
                  }`}
                >
                  <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[17px] text-foreground truncate">
                        {doc.title}
                      </span>
                    </div>
                    <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                      {doc.path}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[11px] px-2 py-0.5 shrink-0">
                    {doc.type}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
