'use client';

import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { FileText, Calendar, Brain, CheckSquare, FolderOpen } from 'lucide-react';
import { Document } from '@/lib/types';

interface DocumentListProps {
  documents: Document[];
  selectedSlug: string | null;
  onSelect: (doc: Document) => void;
}

function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

function getTypeIcon(type: Document['type']) {
  switch (type) {
    case 'journal': return Calendar;
    case 'memory': return Brain;
    case 'task': return CheckSquare;
    case 'document': return FolderOpen;
    default: return FileText;
  }
}

function getTypeColor(type: Document['type']): string {
  switch (type) {
    case 'journal': return 'text-blue-400';
    case 'memory': return 'text-purple-400';
    case 'task': return 'text-green-400';
    case 'document': return 'text-yellow-400';
    default: return 'text-[var(--muted)]';
  }
}

// Group documents by date
function groupByDate(documents: Document[]): Map<string, Document[]> {
  const groups = new Map<string, Document[]>();
  
  for (const doc of documents) {
    const dateKey = formatDate(doc.date);
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(doc);
  }
  
  return groups;
}

export default function DocumentList({ documents, selectedSlug, onSelect }: DocumentListProps) {
  const grouped = groupByDate(documents);

  if (documents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
        <div className="text-center">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No documents yet</p>
          <p className="text-xs mt-1">Documents will appear here as you create them</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {Array.from(grouped.entries()).map(([dateLabel, docs]) => (
        <div key={dateLabel} className="mb-4">
          <div className="sticky top-0 bg-[var(--background)] px-4 py-2 text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
            {dateLabel}
          </div>
          <div className="px-2 space-y-1">
            {docs.map((doc) => {
              const Icon = getTypeIcon(doc.type);
              const isSelected = doc.slug === selectedSlug;
              
              return (
                <button
                  key={doc.slug}
                  onClick={() => onSelect(doc)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    isSelected
                      ? 'bg-[var(--accent)] bg-opacity-15 border border-[var(--accent)] border-opacity-30'
                      : 'hover:bg-[var(--card-hover)] border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon size={16} className={`mt-0.5 ${getTypeColor(doc.type)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{doc.title}</div>
                      <div className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2">
                        {doc.content.slice(0, 100).replace(/[#*`]/g, '')}...
                      </div>
                      {doc.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {doc.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--card)] text-[var(--muted)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
