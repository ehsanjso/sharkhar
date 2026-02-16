'use client';

import { useState, useRef, useEffect } from 'react';
import { CheckCircle, Circle, Clock, ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

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
  { id: '20', title: 'Baseline Remotion render test (30% faster)', status: 'done', tags: ['video', 'optimization'] },
  { id: '21', title: 'Add --pi-optimize flag to render.sh', status: 'done', tags: ['video', 'automation'] },
  { id: '22', title: 'Document Pi optimization in README', status: 'done', tags: ['docs'] },
  { id: '23', title: 'Clean up Mission Control TODO comments', status: 'done', tags: ['app', 'refactor'] },
  
  // Future Tasks
  { id: '19', title: 'Add Last30Days API keys', status: 'todo', tags: ['automation'] },
];

type FilterType = 'all' | 'todo' | 'progress' | 'done';

const filterConfig: { id: FilterType; label: string; icon: typeof Circle }[] = [
  { id: 'todo', label: 'To Do', icon: Circle },
  { id: 'progress', label: 'In Progress', icon: Clock },
  { id: 'done', label: 'Done', icon: CheckCircle },
];

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showLargeTitle, setShowLargeTitle] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const moveTask = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const filteredTasks = tasks.filter(task => {
    if (activeFilter === 'all') return true;
    return task.status === activeFilter;
  });

  const counts = {
    todo: tasks.filter(t => t.status === 'todo').length,
    progress: tasks.filter(t => t.status === 'progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'todo': return Circle;
      case 'progress': return Clock;
      case 'done': return CheckCircle;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'todo': return 'text-muted-foreground';
      case 'progress': return 'text-yellow-500';
      case 'done': return 'text-green-500';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* iOS Navigation Bar - shows when scrolled */}
      <header className={`ios-nav-bar sticky top-0 z-40 transition-all duration-200 ${
        showLargeTitle ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="flex items-center justify-center h-[44px] px-4">
          <h1 className="ios-navigation-title text-foreground">Tasks</h1>
        </div>
      </header>

      {/* Scrollable content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="px-4">
          {/* iOS Large Title */}
          <div className={`pt-2 pb-2 transition-all duration-200 ${
            showLargeTitle ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'
          }`}>
            <h1 className="ios-large-title text-foreground">Tasks</h1>
          </div>

          {/* Status summary */}
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <Circle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{counts.todo}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">{counts.progress}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">{counts.done}</span>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
            {filterConfig.map((filter) => {
              const Icon = filter.icon;
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
                  <Icon className="w-3.5 h-3.5" />
                  {filter.label}
                </button>
              );
            })}
          </div>

          {/* Task List - iOS grouped style */}
          <div className="ios-grouped-list mb-4">
            {filteredTasks.length === 0 ? (
              <div className="ios-list-item text-center text-muted-foreground py-8">
                No tasks
              </div>
            ) : (
              filteredTasks.map((task, index) => {
                const StatusIcon = getStatusIcon(task.status);
                const statusColor = getStatusColor(task.status);
                
                return (
                  <div
                    key={task.id}
                    className={`ios-list-item flex items-start gap-3 ${
                      index === 0 ? 'rounded-t-[10px]' : ''
                    } ${
                      index === filteredTasks.length - 1 ? 'rounded-b-[10px] border-b-0' : ''
                    }`}
                  >
                    <button
                      onClick={() => {
                        const nextStatus = task.status === 'todo' ? 'progress' : 
                                          task.status === 'progress' ? 'done' : 'todo';
                        moveTask(task.id, nextStatus);
                      }}
                      className={`mt-0.5 ${statusColor}`}
                    >
                      <StatusIcon className="w-5 h-5" fill={task.status === 'done' ? 'currentColor' : 'none'} />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <span className={`text-[17px] ${task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {task.title}
                      </span>
                      <div className="flex gap-1.5 flex-wrap mt-1.5">
                        {task.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {task.priority && (
                          <Badge
                            variant={task.priority === 'high' ? 'destructive' : 'secondary'}
                            className="text-[10px] px-1.5 py-0 h-4"
                          >
                            {task.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
