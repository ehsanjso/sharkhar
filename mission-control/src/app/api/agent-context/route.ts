import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

const CLAWD_DIR = '/home/ehsanjso/clawd';
const MEMORY_DIR = path.join(CLAWD_DIR, 'memory');
const CLAWDBOT_STATE = '/home/ehsanjso/.clawdbot';

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

async function getCronJobs(): Promise<CronJob[]> {
  try {
    // Try to get cron jobs from clawdbot gateway API
    const gatewayUrl = 'http://127.0.0.1:18789';
    const tokenPath = path.join(CLAWDBOT_STATE, 'clawdbot.json');
    
    let token = '';
    try {
      const config = JSON.parse(await fs.readFile(tokenPath, 'utf-8'));
      token = config.gateway?.auth?.token || '';
    } catch {
      // Token not found
    }
    
    const response = await fetch(`${gatewayUrl}/api/cron/list`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });
    
    if (response.ok) {
      const data = await response.json();
      return (data.jobs || []).map((job: any) => ({
        id: job.id,
        name: job.name,
        enabled: job.enabled,
        schedule: job.schedule?.expr || job.schedule?.kind || 'unknown',
        lastRunAt: job.state?.lastRunAtMs,
        lastStatus: job.state?.lastStatus,
        lastError: job.state?.lastError,
        nextRunAt: job.state?.nextRunAtMs,
      }));
    }
  } catch (error) {
    console.error('Failed to fetch cron jobs:', error);
  }
  return [];
}

async function getRecentCommits(): Promise<RecentActivity[]> {
  try {
    const { stdout } = await execAsync(
      `cd ${CLAWD_DIR} && git log --oneline --format="%H|%s|%at" -10 2>/dev/null || echo ""`
    );
    
    return stdout.trim().split('\n')
      .filter(line => line.includes('|'))
      .map(line => {
        const [hash, message, timestamp] = line.split('|');
        return {
          type: 'commit' as const,
          title: message,
          timestamp: parseInt(timestamp) * 1000,
          details: hash.substring(0, 7),
        };
      });
  } catch {
    return [];
  }
}

async function getMemoryFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(MEMORY_DIR);
    return files.filter(f => f.endsWith('.md')).sort().reverse();
  } catch {
    return [];
  }
}

async function getRecentMemoryActivity(): Promise<RecentActivity[]> {
  try {
    const files = await getMemoryFiles();
    const activities: RecentActivity[] = [];
    
    for (const file of files.slice(0, 5)) {
      const filePath = path.join(MEMORY_DIR, file);
      const stat = await fs.stat(filePath);
      activities.push({
        type: 'memory',
        title: `Memory updated: ${file}`,
        timestamp: stat.mtime.getTime(),
      });
    }
    
    return activities;
  } catch {
    return [];
  }
}

async function getQuotaInfo() {
  // Try to read from a cached quota file if it exists
  try {
    const quotaPath = path.join(CLAWD_DIR, 'memory', 'quota-cache.json');
    const data = await fs.readFile(quotaPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Return placeholder if no cache exists
    return null;
  }
}

async function getActiveProjects(): Promise<string[]> {
  // Look for project directories or patterns in memory
  try {
    const memoryPath = path.join(CLAWD_DIR, 'MEMORY.md');
    const content = await fs.readFile(memoryPath, 'utf-8');
    
    // Extract project names from headers or patterns
    const projectPattern = /## (?:Project|Active):\s*(.+)/gi;
    const projects: string[] = [];
    let match;
    while ((match = projectPattern.exec(content)) !== null) {
      projects.push(match[1]);
    }
    
    // Also check for common project folders
    const dirs = await fs.readdir(CLAWD_DIR);
    const projectDirs = ['mission-control', 'investor-tracker', 'remotion-video', 'skills'];
    for (const dir of projectDirs) {
      if (dirs.includes(dir)) {
        projects.push(dir);
      }
    }
    
    return [...new Set(projects)];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const [cronJobs, commits, memoryActivity, memoryFiles, quota, activeProjects] = await Promise.all([
      getCronJobs(),
      getRecentCommits(),
      getRecentMemoryActivity(),
      getMemoryFiles(),
      getQuotaInfo(),
      getActiveProjects(),
    ]);
    
    // Combine and sort activities
    const recentActivity = [...commits, ...memoryActivity]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 15);
    
    // Add cron run activities
    for (const job of cronJobs) {
      if (job.lastRunAt) {
        recentActivity.push({
          type: 'cron',
          title: `Cron: ${job.name}`,
          timestamp: job.lastRunAt,
          details: job.lastStatus === 'ok' ? 'completed' : 'failed',
        });
      }
    }
    
    // Re-sort after adding cron activities
    recentActivity.sort((a, b) => b.timestamp - a.timestamp);
    
    return NextResponse.json({
      cronJobs,
      recentActivity: recentActivity.slice(0, 20),
      memoryFiles,
      quota,
      activeProjects,
    });
  } catch (error) {
    console.error('Error fetching agent context:', error);
    return NextResponse.json({ error: 'Failed to fetch context' }, { status: 500 });
  }
}
