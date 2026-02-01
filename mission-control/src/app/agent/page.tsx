'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Zap, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Brain,
  Calendar,
  GitCommit,
  RefreshCw,
  Activity,
  Gauge
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

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

export default function AgentDashboard() {
  const [context, setContext] = useState<AgentContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchContext = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/agent-context');
      const data = await res.json();
      setContext(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch agent context:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchContext, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const cronJobsOk = context?.cronJobs.filter(j => j.lastStatus === 'ok').length || 0;
  const cronJobsError = context?.cronJobs.filter(j => j.lastStatus === 'error').length || 0;
  const cronJobsTotal = context?.cronJobs.length || 0;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Agent Dashboard</h1>
                  <p className="text-sm text-muted-foreground">Context recovery & status</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                Updated {lastRefresh.toLocaleTimeString()}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5"
                onClick={fetchContext}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {isLoading && !context ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Status Cards */}
            <div className="space-y-6">
              {/* Quota Status */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gauge className="w-4 h-4" />
                    Claude Quota
                  </CardTitle>
                  <CardDescription>
                    {context?.quota?.lastChecked || 'Not checked yet'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {context?.quota ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Session</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${context.quota.session.used}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {context.quota.session.used}%
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Weekly All</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${context.quota.weeklyAll.used}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {context.quota.weeklyAll.used}%
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Sonnet</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${context.quota.weeklySonnet.used}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-12 text-right">
                            {context.quota.weeklySonnet.used}%
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No quota data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Cron Jobs Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="w-4 h-4" />
                    Cron Jobs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{cronJobsOk} ok</span>
                    </div>
                    {cronJobsError > 0 && (
                      <div className="flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm">{cronJobsError} failed</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="text-sm">{cronJobsTotal} total</span>
                    </div>
                  </div>
                  <Link href="/crons" className="block mt-3">
                    <Button variant="outline" size="sm" className="w-full">
                      View All Jobs
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="w-4 h-4" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Memory files</span>
                    <span>{context?.memoryFiles.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active projects</span>
                    <span>{context?.activeProjects.length || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Middle Column - Cron Jobs List */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="w-4 h-4" />
                  Scheduled Jobs
                </CardTitle>
                <CardDescription>Next runs & recent status</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-2">
                    {context?.cronJobs.map((job) => (
                      <div 
                        key={job.id}
                        className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {job.lastStatus === 'ok' ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                              ) : job.lastStatus === 'error' ? (
                                <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                              )}
                              <span className="text-sm font-medium truncate">{job.name}</span>
                            </div>
                            {job.lastRunAt && (
                              <p className="text-xs text-muted-foreground mt-1 ml-5">
                                Last: {formatRelativeTime(job.lastRunAt)}
                              </p>
                            )}
                            {job.nextRunAt && (
                              <p className="text-xs text-muted-foreground ml-5">
                                Next: {formatNextRun(job.nextRunAt)}
                              </p>
                            )}
                          </div>
                          <Badge variant={job.enabled ? 'default' : 'secondary'} className="text-[10px]">
                            {job.enabled ? 'active' : 'paused'}
                          </Badge>
                        </div>
                        {job.lastError && (
                          <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                            <p className="text-xs text-red-400 truncate">{job.lastError}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right Column - Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitCommit className="w-4 h-4" />
                  Recent Activity
                </CardTitle>
                <CardDescription>What happened while I was away</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-2">
                    {context?.recentActivity.map((activity, i) => (
                      <div 
                        key={i}
                        className="flex items-start gap-3 p-2 rounded hover:bg-accent/50 transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          activity.type === 'commit' ? 'bg-blue-500/20 text-blue-500' :
                          activity.type === 'cron' ? 'bg-purple-500/20 text-purple-500' :
                          activity.type === 'memory' ? 'bg-green-500/20 text-green-500' :
                          'bg-orange-500/20 text-orange-500'
                        }`}>
                          {activity.type === 'commit' ? <GitCommit className="w-4 h-4" /> :
                           activity.type === 'cron' ? <Clock className="w-4 h-4" /> :
                           activity.type === 'memory' ? <Brain className="w-4 h-4" /> :
                           <Activity className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{activity.title}</p>
                          {activity.details && (
                            <p className="text-xs text-muted-foreground truncate">{activity.details}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!context?.recentActivity || context.recentActivity.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No recent activity
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
