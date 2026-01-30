import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Document } from './types';

const WORKSPACE_PATH = path.join(process.cwd(), '..');
const MEMORY_PATH = path.join(WORKSPACE_PATH, 'memory');
const DOCS_PATH = path.join(WORKSPACE_PATH, 'docs');

function inferType(filePath: string, frontmatter: any): Document['type'] {
  if (frontmatter.type) return frontmatter.type;
  
  const fileName = path.basename(filePath).toLowerCase();
  const dirName = path.dirname(filePath).toLowerCase();
  
  // Date pattern for journal entries (YYYY-MM-DD.md)
  if (/^\d{4}-\d{2}-\d{2}\.md$/.test(path.basename(filePath))) {
    return 'journal';
  }
  
  if (dirName.includes('memory') || fileName.includes('memory')) {
    return 'memory';
  }
  
  if (fileName.includes('task') || frontmatter.tasks) {
    return 'task';
  }
  
  return 'document';
}

function inferTags(content: string, frontmatter: any): string[] {
  if (frontmatter.tags) {
    return Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags];
  }
  
  const tags: string[] = [];
  const lowerContent = content.toLowerCase();
  
  // Auto-detect common tags
  if (lowerContent.includes('todo') || lowerContent.includes('task')) tags.push('tasks');
  if (lowerContent.includes('idea')) tags.push('ideas');
  if (lowerContent.includes('meeting')) tags.push('meeting');
  if (lowerContent.includes('project')) tags.push('project');
  if (lowerContent.includes('note')) tags.push('notes');
  
  return tags;
}

function getMarkdownFiles(dir: string, baseDir: string = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      files.push(...getMarkdownFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

export function getAllDocuments(): Document[] {
  const documents: Document[] = [];
  
  // Get all markdown files from memory folder
  const memoryFiles = getMarkdownFiles(MEMORY_PATH);
  
  // Get workspace-level markdown files (MEMORY.md, etc.)
  const workspaceFiles = fs.readdirSync(WORKSPACE_PATH)
    .filter(f => f.endsWith('.md') && !['README.md', 'AGENTS.md', 'BOOTSTRAP.md'].includes(f))
    .map(f => path.join(WORKSPACE_PATH, f));
  
  // Get docs folder if exists
  const docsFiles = getMarkdownFiles(DOCS_PATH);
  
  const allFiles = [...memoryFiles, ...workspaceFiles, ...docsFiles];
  
  for (const filePath of allFiles) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data: frontmatter, content } = matter(fileContent);
      
      const relativePath = path.relative(WORKSPACE_PATH, filePath);
      const slug = relativePath.replace(/\.md$/, '').replace(/\//g, '-');
      
      // Get title from frontmatter or first heading or filename
      let title = frontmatter.title;
      if (!title) {
        const headingMatch = content.match(/^#\s+(.+)$/m);
        if (headingMatch) {
          title = headingMatch[1];
        } else {
          title = path.basename(filePath, '.md');
        }
      }
      
      // Get date from frontmatter or filename or file stats
      let date = frontmatter.date;
      if (!date) {
        const dateMatch = path.basename(filePath).match(/^(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          date = dateMatch[1];
        } else {
          const stats = fs.statSync(filePath);
          date = stats.mtime.toISOString().split('T')[0];
        }
      }
      
      documents.push({
        slug,
        title,
        content,
        date: typeof date === 'string' ? date : date?.toISOString?.()?.split('T')[0] || new Date().toISOString().split('T')[0],
        tags: inferTags(content, frontmatter),
        type: inferType(filePath, frontmatter),
        path: relativePath,
      });
    } catch (error) {
      console.error(`Error reading ${filePath}:`, error);
    }
  }
  
  // Sort by date, newest first
  return documents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getDocumentBySlug(slug: string): Document | null {
  const documents = getAllDocuments();
  return documents.find(doc => doc.slug === slug) || null;
}
