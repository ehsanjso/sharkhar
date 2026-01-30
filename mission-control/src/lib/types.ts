export interface Document {
  slug: string;
  title: string;
  content: string;
  date: string;
  tags: string[];
  type: 'journal' | 'note' | 'memory' | 'task' | 'document';
  path: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  tags: string[];
}

export type ViewType = 'all' | 'journal' | 'memory' | 'tasks' | 'documents';
