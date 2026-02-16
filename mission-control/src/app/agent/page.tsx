'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Activity,
  Gauge,
  Server,
  Wifi,
  WifiOff,
  ChevronRight,
  GitCommit,
  Brain
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
  nextRunAt?: number;
}

interface RecentActivity {
  type: 'commit' | 'cron' | 'memory' | 'session';
  title: string;
  timestamp: number;
  details?: string;
}

interface QuotaInfo {
  session: { used: number; resetIn: string };
  weeklyAll: { used: number; resetAt: string };
  weeklySonnet: { used: number; resetAt: string };
  lastChecked: string;
}

interface AgentContext {
  cronJobs: CronJob[];
  recentActivity: RecentActivity[];
  quota: QuotaInfo | null;
  memoryFiles: string[];
  activeProjects: string[];
}

interface ServiceStatus {
  id: number;
  name: string;
  type: string;
  enabled: boolean;
  status: 'up' | 'down' | 'paused' | 'pending';
  url?: string;
  hostname?: string;
}

interface ServiceHealth {
  services: ServiceStatus[];
  lastChecked: string;
  allUp: boolean;
  upCount: number;
  downCount: number;
  total: number;
  error?: string;
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

export default function AgentDashboard() {
  const [context, setContext] = useState<AgentContext | null>(null);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLargeTitle, setShowLargeTitle] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchContext = async () => {
    setIsLoading(true);
    try {
      const [contextRes, healthRes] = await Promise.all([
        fetch('/api/agent-context'),
        fetch('/api/service-health'),
      ]);
      const [contextData, healthData] = await Promise.all([
        contextRes.json(),
        healthRes.json(),
      ]);
      setContext(contextData);
      setServiceHealth(healthData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
    const interval = setInterval(fetchContext, 5 * 60 * 1000);
    return () => clearInterval(interval);
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

  const cronJobsOk = context?.cronJobs.filter(j => j.lastStatus === 'ok').length || 0;
  const cronJobsError = context?.cronJobs.filter(j => j.lastStatus === 'error').length || 0;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'commit': return GitCommit;
      case 'cron': return Clock;
      case 'memory': return Brain;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'commit': return 'text-blue-500 bg-blue-500/10';
      case 'cron': return 'text-purple-500 bg-purple-500/10';
      case 'memory': return 'text-green-500 bg-green-500/10';
      default: return 'text-orange-500 bg-orange-500/10';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* iOS Navigation Bar - shows when scrolled */}
      <header className={`ios-nav-bar sticky top-0 z-40 transition-all duration-200 ${
        showLargeTitle ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="flex items-center justify-between h-[44px] px-4">
          <div className="w-[60px]" />
          <h1 className="ios-navigation-title text-foreground">Agent</h1>
          <button
            onClick={fetchContext}
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
            <h1 className="ios-large-title text-foreground">Agent</h1>
            <button
              onClick={fetchContext}
              disabled={isLoading}
              className="text-primary p-2"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoading && !context ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Quota Section */}
              <div className="mb-4">
                <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide px-4 mb-2">
                  Claude Quota
                </h2>
                <div className="ios-grouped-list">
                  {context?.quota ? (
                    <>
                      <div className="ios-list-item flex items-center justify-between rounded-t-[10px]">
                        <div className="flex items-center gap-3">
                          <Gauge className="w-5 h-5 text-primary" />
                          <span className="text-[17px]">Session</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${context.quota.session.used}%` }}
                            />
                          </div>
                          <span className="text-[13px] text-muted-foreground w-10 text-right">
                            {context.quota.session.used}%
                          </span>
                        </div>
                      </div>
                      <div className="ios-list-item flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Activity className="w-5 h-5 text-blue-500" />
                          <span className="text-[17px]">Weekly All</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${context.quota.weeklyAll.used}%` }}
                            />
                          </div>
                          <span className="text-[13px] text-muted-foreground w-10 text-right">
                            {context.quota.weeklyAll.used}%
                          </span>
                        </div>
                      </div>
                      <div className="ios-list-item flex items-center justify-between rounded-b-[10px] border-b-0">
                        <div className="flex items-center gap-3">
                          <Activity className="w-5 h-5 text-green-500" />
                          <span className="text-[17px]">Sonnet</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${context.quota.weeklySonnet.used}%` }}
                            />
                          </div>
                          <span className="text-[13px] text-muted-foreground w-10 text-right">
                            {context.quota.weeklySonnet.used}%
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="ios-list-item text-muted-foreground text-center rounded-[10px]">
                      No quota data available
                    </div>
                  )}
                </div>
              </div>

              {/* Cron Jobs Section */}
              <div className="mb-4">
                <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide px-4 mb-2">
                  Cron Jobs
                </h2>
                <div className="ios-grouped-list">
                  <div className="ios-list-item flex items-center justify-between rounded-[10px]">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-[15px]">{cronJobsOk} ok</span>
                      </div>
                      {cronJobsError > 0 && (
                        <div className="flex items-center gap-1.5">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-[15px]">{cronJobsError} failed</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                </div>
              </div>

              {/* Services Section */}
              <div className="mb-4">
                <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide px-4 mb-2">
                  Services
                </h2>
                <div className="ios-grouped-list">
                  {serviceHealth?.error ? (
                    <div className="ios-list-item flex items-center gap-3 rounded-[10px]">
                      <WifiOff className="w-5 h-5 text-red-500" />
                      <span className="text-[17px] text-red-500">Failed to fetch status</span>
                    </div>
                  ) : serviceHealth ? (
                    <>
                      <div className="ios-list-item flex items-center justify-between rounded-t-[10px]">
                        <div className="flex items-center gap-3">
                          {serviceHealth.allUp ? (
                            <Wifi className="w-5 h-5 text-green-500" />
                          ) : (
                            <WifiOff className="w-5 h-5 text-red-500" />
                          )}
                          <span className="text-[17px]">
                            {serviceHealth.allUp ? 'All systems operational' : `${serviceHealth.downCount} down`}
                          </span>
                        </div>
                      </div>
                      {serviceHealth.services.slice(0, 5).map((service, index) => (
                        <div 
                          key={service.id} 
                          className={`ios-list-item flex items-center gap-3 ${
                            index === Math.min(serviceHealth.services.length - 1, 4) ? 'rounded-b-[10px] border-b-0' : ''
                          }`}
                        >
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            service.status === 'up' ? 'bg-green-500' :
                            service.status === 'down' ? 'bg-red-500' :
                            service.status === 'paused' ? 'bg-yellow-500' :
                            'bg-gray-500'
                          }`} />
                          <span className="text-[15px] text-muted-foreground">{service.name}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="ios-list-item text-muted-foreground text-center rounded-[10px]">
                      Loading...
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity Section */}
              <div className="mb-4">
                <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide px-4 mb-2">
                  Recent Activity
                </h2>
                <div className="ios-grouped-list">
                  {context?.recentActivity && context.recentActivity.length > 0 ? (
                    context.recentActivity.slice(0, 5).map((activity, index) => {
                      const Icon = getActivityIcon(activity.type);
                      const colorClass = getActivityColor(activity.type);
                      
                      return (
                        <div 
                          key={index}
                          className={`ios-list-item flex items-start gap-3 ${
                            index === 0 ? 'rounded-t-[10px]' : ''
                          } ${
                            index === Math.min((context.recentActivity?.length || 0) - 1, 4) ? 'rounded-b-[10px] border-b-0' : ''
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] text-foreground">{activity.title}</p>
                            {activity.details && (
                              <p className="text-[13px] text-muted-foreground truncate">{activity.details}</p>
                            )}
                            <p className="text-[12px] text-muted-foreground mt-0.5">
                              {formatRelativeTime(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="ios-list-item text-muted-foreground text-center rounded-[10px]">
                      No recent activity
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mb-4">
                <h2 className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide px-4 mb-2">
                  Quick Stats
                </h2>
                <div className="ios-grouped-list">
                  <div className="ios-list-item flex items-center justify-between rounded-t-[10px]">
                    <span className="text-[17px]">Memory files</span>
                    <span className="text-[17px] text-muted-foreground">{context?.memoryFiles.length || 0}</span>
                  </div>
                  <div className="ios-list-item flex items-center justify-between rounded-b-[10px] border-b-0">
                    <span className="text-[17px]">Active projects</span>
                    <span className="text-[17px] text-muted-foreground">{context?.activeProjects.length || 0}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
