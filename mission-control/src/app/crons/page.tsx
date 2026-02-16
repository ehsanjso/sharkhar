'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Play,
  Pause,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';

interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: string;
  lastRunAt?: number;
  lastStatus?: 'ok' | 'error';
  lastError?: string;
  lastDurationMs?: number;
  nextRunAt?: number;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatNextRun(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (diff < 0) return 'overdue';
  if (minutes < 60) return `in ${minutes}m`;
  if (hours < 24) return `in ${hours}h`;
  return new Date(timestamp).toLocaleDateString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

type FilterType = 'all' | 'active' | 'paused' | 'failed';

export default function CronJobsPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showLargeTitle, setShowLargeTitle] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/agent-context');
      const data = await res.json();
      setJobs(data.cronJobs || []);
    } catch (error) {
      console.error('Failed to fetch cron jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
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

  const enabledJobs = jobs.filter(j => j.enabled);
  const disabledJobs = jobs.filter(j => !j.enabled);
  const failedJobs = jobs.filter(j => j.lastStatus === 'error');

  const filteredJobs = jobs.filter(job => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return job.enabled;
    if (activeFilter === 'paused') return !job.enabled;
    if (activeFilter === 'failed') return job.lastStatus === 'error';
    return true;
  });

  const filterConfig: { id: FilterType; label: string; count: number }[] = [
    { id: 'active', label: 'Active', count: enabledJobs.length },
    { id: 'paused', label: 'Paused', count: disabledJobs.length },
    { id: 'failed', label: 'Failed', count: failedJobs.length },
  ];

  const getStatusIcon = (job: CronJob) => {
    if (job.lastStatus === 'ok') return CheckCircle;
    if (job.lastStatus === 'error') return XCircle;
    return Clock;
  };

  const getStatusColor = (job: CronJob) => {
    if (job.lastStatus === 'ok') return 'text-green-500';
    if (job.lastStatus === 'error') return 'text-red-500';
    return 'text-muted-foreground';
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* iOS Navigation Bar - shows when scrolled */}
      <header className={`ios-nav-bar sticky top-0 z-40 transition-all duration-200 ${
        showLargeTitle ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="flex items-center justify-between h-[44px] px-4">
          <div className="w-[60px]" />
          <h1 className="ios-navigation-title text-foreground">Crons</h1>
          <button
            onClick={fetchJobs}
            disabled={isLoading}
            className="w-[60px] flex justify-end text-primary"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="px-4">
          {/* iOS Large Title with refresh button */}
          <div className={`pt-2 pb-2 flex items-center justify-between transition-all duration-200 ${
            showLargeTitle ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'
          }`}>
            <h1 className="ios-large-title text-foreground">Crons</h1>
            <button
              onClick={fetchJobs}
              disabled={isLoading}
              className="text-primary p-2"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Summary Stats */}
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <Play className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">{enabledJobs.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Pause className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">{disabledJobs.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-muted-foreground">{failedJobs.length}</span>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
            {filterConfig.map((filter) => {
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(activeFilter === filter.id ? 'all' : filter.id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted/60 text-foreground'
                  }`}
                >
                  {filter.label}
                  <span className={`text-[11px] ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Jobs List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="ios-grouped-list">
              <div className="ios-list-item text-muted-foreground text-center rounded-[10px] py-8">
                No cron jobs found
              </div>
            </div>
          ) : (
            <div className="ios-grouped-list mb-4">
              {filteredJobs.map((job, index) => {
                const StatusIcon = getStatusIcon(job);
                const statusColor = getStatusColor(job);
                
                return (
                  <div 
                    key={job.id}
                    className={`ios-list-item ${
                      index === 0 ? 'rounded-t-[10px]' : ''
                    } ${
                      index === filteredJobs.length - 1 ? 'rounded-b-[10px] border-b-0' : ''
                    } ${
                      job.lastStatus === 'error' ? 'bg-red-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <StatusIcon className={`w-5 h-5 mt-0.5 ${statusColor}`} fill={job.lastStatus === 'ok' ? 'currentColor' : 'none'} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[17px] text-foreground truncate">{job.name}</span>
                          <Badge variant={job.enabled ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                            {job.enabled ? 'active' : 'paused'}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[13px] text-muted-foreground">
                          <span className="font-mono">{job.schedule}</span>
                          {job.lastRunAt && (
                            <span>Last: {formatRelativeTime(job.lastRunAt)}</span>
                          )}
                          {job.nextRunAt && (
                            <span>Next: {formatNextRun(job.nextRunAt)}</span>
                          )}
                          {job.lastDurationMs && (
                            <span>{formatDuration(job.lastDurationMs)}</span>
                          )}
                        </div>
                        
                        {job.lastError && (
                          <div className="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-[12px] text-red-400 font-mono break-all line-clamp-2">
                              {job.lastError}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
