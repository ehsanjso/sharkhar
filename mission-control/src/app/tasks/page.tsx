'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'progress' | 'done';
  tags: string[];
  priority?: 'high' | 'medium' | 'low';
}

const initialTasks: Task[] = [
  // DONE (got screenshot from video)
  { id: '1', title: '✅ Got screenshot of video UI', status: 'done', tags: ['video', 'design'] },
  { id: '2', title: '🌅 Set up Morning Brief (8am cron)', status: 'todo', tags: ['automation'], priority: 'high' },
  { id: '3', title: '📊 Daily Research Report (afternoon)', status: 'todo', tags: ['automation'] },
  { id: '4', title: '🔍 Install Last30Days Skill', status: 'todo', tags: ['automation'] },
  { id: '5', title: '🤖 Proactive Coder (11pm build sessions)', status: 'todo', tags: ['automation'] },
  
  // DONE (moved from in progress)
  { id: '6', title: '✅ Match UI to video design', status: 'done', tags: ['app', 'design'] },
  
  // DONE
  { id: '7', title: '✅ Mission Control Next.js app', status: 'done', tags: ['app'] },
  { id: '8', title: '✅ Dark theme (Obsidian + Linear)', status: 'done', tags: ['design'] },
  { id: '9', title: '✅ Document list & viewer', status: 'done', tags: ['app'] },
  { id: '10', title: '✅ Memory folder structure', status: 'done', tags: ['app'] },
  { id: '11', title: '✅ Journal entry created', status: 'done', tags: ['app'] },
];

const tagColors: Record<string, string> = {
  video: 'bg-purple-500/20 text-purple-400',
  design: 'bg-pink-500/20 text-pink-400',
  automation: 'bg-green-500/20 text-green-400',
  app: 'bg-blue-500/20 text-blue-400',
};

const priorityColors: Record<string, string> = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-gray-500/20 text-gray-400',
};

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const columns = [
    { id: 'todo', title: 'To Do', icon: Circle, color: 'bg-yellow-500' },
    { id: 'progress', title: 'In Progress', icon: Clock, color: 'bg-blue-500' },
    { id: 'done', title: 'Done', icon: CheckCircle, color: 'bg-green-500' },
  ];

  const moveTask = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#e5e5e5] p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="p-2 hover:bg-[#1f1f1f] rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] flex items-center justify-center">
            ⚡
          </div>
          <div>
            <h1 className="text-xl font-semibold">Task Board</h1>
            <p className="text-sm text-[#737373]">Following Alex Finn's ClawdBot use cases</p>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => {
          const columnTasks = tasks.filter(t => t.status === column.id);
          const Icon = column.icon;
          
          return (
            <div
              key={column.id}
              className="bg-[#171717] rounded-xl p-4 border border-[#262626]"
            >
              {/* Column Header */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#262626]">
                <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
                <span className="font-medium text-sm">{column.title}</span>
                <span className="ml-auto text-xs bg-[#262626] px-2 py-0.5 rounded-full text-[#737373]">
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="space-y-3">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-[#1f1f1f] rounded-lg p-3 border border-[#333] hover:border-[#444] transition-colors cursor-pointer group"
                  >
                    <div className="text-sm font-medium mb-2">{task.title}</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {task.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-[10px] px-2 py-0.5 rounded ${tagColors[tag] || 'bg-[#262626] text-[#737373]'}`}
                        >
                          {tag}
                        </span>
                      ))}
                      {task.priority && (
                        <span className={`text-[10px] px-2 py-0.5 rounded ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                    
                    {/* Quick actions on hover */}
                    {column.id !== 'done' && (
                      <div className="hidden group-hover:flex gap-2 mt-2 pt-2 border-t border-[#333]">
                        {column.id === 'todo' && (
                          <button
                            onClick={() => moveTask(task.id, 'progress')}
                            className="text-[10px] text-blue-400 hover:text-blue-300"
                          >
                            → Start
                          </button>
                        )}
                        <button
                          onClick={() => moveTask(task.id, 'done')}
                          className="text-[10px] text-green-400 hover:text-green-300"
                        >
                          ✓ Done
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-center text-[#525252] text-xs mt-8">
        Last updated: Jan 30, 2026 • View in Mission Control at http://192.168.0.217:3456/tasks
      </p>
    </div>
  );
}
