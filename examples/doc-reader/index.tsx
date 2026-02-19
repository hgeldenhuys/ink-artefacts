/**
 * Doc Reader — Browse and read files with markdown rendering and syntax highlighting.
 *
 * Usage:
 *   node --import tsx examples/doc-reader/index.tsx [directory]
 *
 * Features:
 *   - Browse directories, filtered to docs and source files
 *   - Markdown files rendered with ink-markdown (headers, bold, code blocks, lists)
 *   - Source files rendered with ink-syntax-highlight (language auto-detection)
 *   - Scrollable content with vim-style keys
 */

import React from 'react';
import { render } from 'ink';
import { PanelStack, ListPanel } from '../../src/index.js';
import type { PanelConfig } from '../../src/index.js';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join, basename, extname } from 'path';
import { MarkdownPanel } from './MarkdownPanel.js';
import { CodePanel } from './CodePanel.js';

// ─── File type detection ─────────────────────────────────

const MD_EXTS = new Set(['.md', '.mdx', '.markdown', '.txt', '.rst']);
const CODE_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java',
  '.c', '.cpp', '.h', '.hpp', '.rb', '.php', '.swift', '.kt',
  '.sh', '.bash', '.zsh', '.fish', '.css', '.scss', '.less',
  '.html', '.xml', '.svg', '.json', '.yaml', '.yml', '.toml',
  '.sql', '.graphql', '.lua', '.r', '.dart', '.vim', '.el',
  '.zig', '.hs', '.ex', '.exs', '.erl', '.clj', '.ml',
]);

function isMarkdown(name: string): boolean {
  return MD_EXTS.has(extname(name).toLowerCase());
}

function isCode(name: string): boolean {
  return CODE_EXTS.has(extname(name).toLowerCase());
}

function isReadable(name: string): boolean {
  return isMarkdown(name) || isCode(name);
}

function langFromExt(name: string): string {
  const ext = extname(name).toLowerCase().slice(1);
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    py: 'python', rs: 'rust', go: 'go', java: 'java',
    c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp', rb: 'ruby',
    php: 'php', swift: 'swift', kt: 'kotlin', sh: 'bash',
    bash: 'bash', zsh: 'bash', css: 'css', scss: 'scss',
    html: 'html', xml: 'xml', json: 'json', yaml: 'yaml',
    yml: 'yaml', toml: 'toml', sql: 'sql', lua: 'lua',
    r: 'r', dart: 'dart', zig: 'zig', hs: 'haskell',
    ex: 'elixir', exs: 'elixir', erl: 'erlang', clj: 'clojure',
    ml: 'ocaml', graphql: 'graphql',
  };
  return map[ext] || ext;
}

// ─── Format helpers ──────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function extLabel(name: string): string {
  const ext = extname(name).toLowerCase().slice(1);
  return ext.toUpperCase() || '';
}

// ─── Directory panel ─────────────────────────────────────

function makeDirPanel(dirPath: string): PanelConfig {
  let entries: Array<{ name: string; isDir: boolean; size: number; path: string }> = [];
  try {
    const names = readdirSync(dirPath);
    for (const name of names) {
      if (name.startsWith('.') && name !== '.github') continue;
      try {
        const fullPath = join(dirPath, name);
        const stat = statSync(fullPath);
        if (stat.isDirectory() || isReadable(name)) {
          entries.push({ name, isDir: stat.isDirectory(), size: stat.size, path: fullPath });
        }
      } catch { /* skip unreadable */ }
    }
  } catch { /* empty */ }

  entries.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    // Prioritize README/docs at the top
    const aIsDoc = a.name.toLowerCase().startsWith('readme') ? -1 : 0;
    const bIsDoc = b.name.toLowerCase().startsWith('readme') ? -1 : 0;
    if (aIsDoc !== bIsDoc) return aIsDoc - bIsDoc;
    return a.name.localeCompare(b.name);
  });

  const items = entries.map(entry => ({
    id: entry.path,
    label: entry.name,
    description: entry.isDir ? '' : formatSize(entry.size),
    badge: entry.isDir ? 'DIR' : extLabel(entry.name),
    badgeColor: entry.isDir ? 'blue' : isMarkdown(entry.name) ? 'green' : 'yellow',
  }));

  return {
    id: `dir-${dirPath}`,
    title: basename(dirPath) || dirPath,
    component: ListPanel as any,
    data: {
      title: dirPath,
      items,
      onSelect: (item: any, _index: number, panelProps: any) => {
        const entry = entries.find(e => e.path === item.id);
        if (!entry) return;

        if (entry.isDir) {
          panelProps.push(makeDirPanel(entry.path));
        } else if (isMarkdown(entry.name)) {
          let content = '';
          try { content = readFileSync(entry.path, 'utf-8'); } catch { content = 'Error reading file'; }
          panelProps.push({
            id: `md-${entry.path}`,
            title: entry.name,
            component: MarkdownPanel as any,
            data: { title: entry.name, content, filePath: entry.path },
            state: { type: 'markdown', path: entry.path },
          });
        } else {
          let content = '';
          try { content = readFileSync(entry.path, 'utf-8'); } catch { content = '// Error reading file'; }
          panelProps.push({
            id: `code-${entry.path}`,
            title: entry.name,
            component: CodePanel as any,
            data: { title: entry.name, code: content, language: langFromExt(entry.name), filePath: entry.path },
            state: { type: 'code', path: entry.path },
          });
        }
      },
    },
  };
}

// ─── Launch ──────────────────────────────────────────────

const startDir = process.argv[2] || process.cwd();

const { unmount } = render(
  <PanelStack
    appName="doc-reader"
    initialPanel={makeDirPanel(startDir)}
    onExit={() => {
      unmount();
      process.exit(0);
    }}
  />,
);
