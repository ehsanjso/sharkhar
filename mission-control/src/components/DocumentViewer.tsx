'use client';

import { format, parseISO } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Calendar, Tag, FileText, ArrowLeft, ExternalLink, Edit } from 'lucide-react';
import { Document } from '@/lib/types';

interface DocumentViewerProps {
  document: Document | null;
  onBack?: () => void;
}

function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
  } catch {
    return dateStr;
  }
}

function getTypeBadgeColor(type: Document['type']): string {
  switch (type) {
    case 'journal': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'memory': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'task': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'document': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

export default function DocumentViewer({ document, onBack }: DocumentViewerProps) {
  if (!document) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
        <div className="text-center">
          <FileText size={64} className="mx-auto mb-4 opacity-30" />
          <h2 className="text-lg font-medium mb-2">No document selected</h2>
          <p className="text-sm">Select a document from the list to view its contents</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)] px-6 py-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-[var(--card-hover)] rounded-lg transition-colors md:hidden"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-xs px-2 py-1 rounded border ${getTypeBadgeColor(document.type)}`}>
                {document.type}
              </span>
              <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                <Calendar size={12} />
                {formatDate(document.date)}
              </div>
            </div>
            <h1 className="text-xl font-semibold truncate">{document.title}</h1>
            {document.tags.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Tag size={12} className="text-[var(--muted)]" />
                <div className="flex gap-1 flex-wrap">
                  {document.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-[var(--card-hover)] rounded-lg transition-colors text-[var(--muted)]">
              <Edit size={18} />
            </button>
            <button className="p-2 hover:bg-[var(--card-hover)] rounded-lg transition-colors text-[var(--muted)]">
              <ExternalLink size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <article className="max-w-3xl mx-auto markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Custom checkbox handling for task lists
              input: ({ node, ...props }) => {
                if (props.type === 'checkbox') {
                  return (
                    <input
                      {...props}
                      className="mr-2 accent-[var(--accent)] w-4 h-4 rounded"
                    />
                  );
                }
                return <input {...props} />;
              },
              // Links open in new tab
              a: ({ node, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              ),
            }}
          >
            {document.content}
          </ReactMarkdown>
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] px-6 py-3 bg-[var(--card)]">
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>📁 {document.path}</span>
          <span>{document.content.split(/\s+/).length} words</span>
        </div>
      </footer>
    </div>
  );
}
