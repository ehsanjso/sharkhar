'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, Circle, Clock, Zap, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'progress' | 'done';
  tags: string[];
  priority?: 'high' | 'medium' | 'low';
}

const initialTasks: Task[] = [
  // Alex Finn Video Tasks - ALL DONE! 🎉
  { id: '1', title: 'Got screenshot of video UI', status: 'done', tags: ['video', 'design'] },
  { id: '2', title: 'Set up Morning Brief (8am cron)', status: 'done', tags: ['automation'] },
  { id: '3', title: 'Daily Research Report (2pm cron)', status: 'done', tags: ['automation'] },
  { id: '4', title: 'Install Last30Days Skill', status: 'done', tags: ['automation'] },
  { id: '5', title: 'Proactive Coder (11pm cron)', status: 'done', tags: ['automation'] },
  { id: '6', title: 'Match UI to video design', status: 'done', tags: ['app', 'design'] },
  { id: '7', title: 'Mission Control Next.js app', status: 'done', tags: ['app'] },
  { id: '8', title: 'Dark theme (shadcn default)', status: 'done', tags: ['design'] },
  { id: '9', title: 'Document list & viewer', status: 'done', tags: ['app'] },
  { id: '10', title: 'Memory folder structure', status: 'done', tags: ['app'] },
  { id: '11', title: 'Journal entry created', status: 'done', tags: ['app'] },
  { id: '12', title: 'Upgrade to shadcn/ui', status: 'done', tags: ['app', 'design'] },
  
  // From Duncan Rogoff's 63 Use Cases Video
  { id: '13', title: 'Deep Research templates', status: 'done', tags: ['automation'] },
  { id: '14', title: 'Video clips (ffmpeg)', status: 'done', tags: ['video'] },
  { id: '15', title: 'Remotion video creation', status: 'done', tags: ['video'] },
  
  // From Tonight's Build (2026-01-30)
  { id: '16', title: 'Mission Control systemd service', status: 'done', tags: ['app'] },
  { id: '17', title: 'Test Remotion on ARM (Pi 5)', status: 'done', tags: ['video'] },
  
  // Tonight's Build (2026-01-31)
  { id: '18', title: 'Quote template for Remotion', status: 'done', tags: ['video'] },
  
  // TODO
  { id: '19', title: 'Add Last30Days API keys', status: 'todo', tags: ['automation'] },
];

const columnConfig = [
  { id: 'todo' as const, title: 'To Do', icon: Circle },
  { id: 'progress' as const, title: 'In Progress', icon: Clock },
  { id: 'done' as const, title: 'Done', icon: CheckCircle },
];

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const moveTask = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

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
                <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Task Board</h1>
                  <p className="text-sm text-muted-foreground">ClawdBot automation tasks</p>
                </div>
              </div>
            </div>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columnConfig.map((column) => {
            const columnTasks = tasks.filter(t => t.status === column.id);
            const Icon = column.icon;
            
            return (
              <Card key={column.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Icon className="w-4 h-4" />
                    {column.title}
                    <Badge variant="secondary" className="ml-auto">
                      {columnTasks.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="space-y-3 pr-2">
                      {columnTasks.map((task) => (
                        <Card
                          key={task.id}
                          className="cursor-pointer hover:bg-accent/50 transition-colors group"
                        >
                          <CardContent className="p-3">
                            <div className="text-sm font-medium mb-2">{task.title}</div>
                            <div className="flex gap-1.5 flex-wrap">
                              {task.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 h-5"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {task.priority && (
                                <Badge
                                  variant={task.priority === 'high' ? 'destructive' : 'secondary'}
                                  className="text-[10px] px-1.5 py-0 h-5"
                                >
                                  {task.priority}
                                </Badge>
                              )}
                            </div>
                            
                            {/* Quick actions on hover */}
                            {column.id !== 'done' && (
                              <div className="hidden group-hover:flex gap-2 mt-3 pt-3 border-t">
                                {column.id === 'todo' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs px-2"
                                    onClick={() => moveTask(task.id, 'progress')}
                                  >
                                    → Start
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-xs px-2"
                                  onClick={() => moveTask(task.id, 'done')}
                                >
                                  ✓ Done
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      
                      {columnTasks.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No tasks
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 mt-6">
        <p className="text-center text-muted-foreground text-xs">
          Mission Control • {new Date().toLocaleDateString()}
        </p>
      </footer>
    </div>
  );
}
