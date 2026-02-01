'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Play,
  Pause,
  RefreshCw,
  Calendar,
  AlertTriangle
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

export default function CronJobsPage() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const enabledJobs = jobs.filter(j => j.enabled);
  const disabledJobs = jobs.filter(j => !j.enabled);
  const failedJobs = jobs.filter(j => j.lastStatus === 'error');

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Page Header */}
      <div className="border-b bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Cron Jobs</h1>
                <p className="text-sm text-muted-foreground">Scheduled automation tasks</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1.5"
              onClick={fetchJobs}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                  <p className="text-2xl font-bold">{jobs.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-500">{enabledJobs.length}</p>
                </div>
                <Play className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Paused</p>
                  <p className="text-2xl font-bold text-yellow-500">{disabledJobs.length}</p>
                </div>
                <Pause className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold text-red-500">{failedJobs.length}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs List */}
        <Card>
          <CardHeader>
            <CardTitle>All Jobs</CardTitle>
            <CardDescription>Click a job to see details</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : jobs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No cron jobs found</p>
                ) : (
                  jobs.map((job) => (
                    <div 
                      key={job.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        job.lastStatus === 'error' 
                          ? 'border-red-500/50 bg-red-500/5' 
                          : 'bg-card hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            {job.lastStatus === 'ok' ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : job.lastStatus === 'error' ? (
                              <XCircle className="w-5 h-5 text-red-500" />
                            ) : (
                              <Clock className="w-5 h-5 text-muted-foreground" />
                            )}
                            <h3 className="font-medium">{job.name}</h3>
                            <Badge variant={job.enabled ? 'default' : 'secondary'}>
                              {job.enabled ? 'active' : 'paused'}
                            </Badge>
                          </div>
                          
                          <div className="ml-8 mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Schedule</p>
                              <p className="font-mono text-xs">{job.schedule}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Last Run</p>
                              <p>{job.lastRunAt ? formatRelativeTime(job.lastRunAt) : 'never'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Next Run</p>
                              <p>{job.nextRunAt ? formatNextRun(job.nextRunAt) : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Duration</p>
                              <p>{job.lastDurationMs ? formatDuration(job.lastDurationMs) : 'N/A'}</p>
                            </div>
                          </div>
                          
                          {job.lastError && (
                            <div className="ml-8 mt-3 p-3 rounded bg-red-500/10 border border-red-500/20">
                              <p className="text-sm text-red-400 font-mono break-all">
                                {job.lastError}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
