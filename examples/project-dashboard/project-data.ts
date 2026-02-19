/**
 * Project data collectors — reads package.json, counts files, analyzes structure.
 * No external dependencies, uses only Node builtins.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';

// ─── Types ───────────────────────────────────────────────

export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  license: string;
  main: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface FileTypeCount {
  ext: string;
  label: string;
  count: number;
  totalSize: number;
  color: string;
}

export interface DirSummary {
  name: string;
  fileCount: number;
  totalSize: number;
}

export interface ProjectHealth {
  hasReadme: boolean;
  hasLicense: boolean;
  hasTests: boolean;
  hasCI: boolean;
  hasTypeScript: boolean;
  hasLinter: boolean;
  hasGitignore: boolean;
  hasLockFile: boolean;
  hasClaude: boolean;
}

export interface ProjectData {
  path: string;
  packageInfo: PackageInfo | null;
  fileTypes: FileTypeCount[];
  dirs: DirSummary[];
  totalFiles: number;
  totalSize: number;
  health: ProjectHealth;
  todoCount: number;
  lineCount: number;
}

// ─── Helpers ─────────────────────────────────────────────

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.cache',
  'coverage', '.nyc_output', '__pycache__', 'target', '.turbo',
]);

const EXT_COLORS: Record<string, string> = {
  ts: 'blue', tsx: 'blue', js: 'yellow', jsx: 'yellow',
  py: 'green', rs: 'red', go: 'cyan', java: 'red',
  css: 'magenta', scss: 'magenta', html: 'red', json: 'yellow',
  md: 'green', yaml: 'gray', yml: 'gray', sh: 'green',
  sql: 'cyan', graphql: 'magenta', toml: 'gray',
};

const EXT_LABELS: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TSX', js: 'JavaScript', jsx: 'JSX',
  py: 'Python', rs: 'Rust', go: 'Go', java: 'Java',
  css: 'CSS', scss: 'SCSS', html: 'HTML', json: 'JSON',
  md: 'Markdown', yaml: 'YAML', yml: 'YAML', sh: 'Shell',
  sql: 'SQL', graphql: 'GraphQL', toml: 'TOML',
  svg: 'SVG', xml: 'XML', txt: 'Text',
};

function walkDir(dir: string, counts: Map<string, { count: number; size: number }>, dirSummaries: Map<string, DirSummary>, depth = 0): { files: number; size: number; lines: number; todos: number } {
  let totalFiles = 0;
  let totalSize = 0;
  let totalLines = 0;
  let totalTodos = 0;

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith('.') && depth === 0 && entry !== '.github') continue;
      if (SKIP_DIRS.has(entry)) continue;

      const fullPath = join(dir, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          const sub = walkDir(fullPath, counts, dirSummaries, depth + 1);
          totalFiles += sub.files;
          totalSize += sub.size;
          totalLines += sub.lines;
          totalTodos += sub.todos;

          if (depth === 0) {
            dirSummaries.set(entry, {
              name: entry,
              fileCount: sub.files,
              totalSize: sub.size,
            });
          }
        } else if (stat.isFile()) {
          const ext = extname(entry).toLowerCase().slice(1);
          if (ext) {
            const current = counts.get(ext) || { count: 0, size: 0 };
            current.count++;
            current.size += stat.size;
            counts.set(ext, current);
          }
          totalFiles++;
          totalSize += stat.size;

          // Count lines and TODOs for text files
          if (stat.size < 500000 && isTextExt(ext)) {
            try {
              const content = readFileSync(fullPath, 'utf-8');
              const fileLines = content.split('\n');
              totalLines += fileLines.length;
              for (const line of fileLines) {
                if (line.includes('TODO') || line.includes('FIXME') || line.includes('HACK')) {
                  totalTodos++;
                }
              }
            } catch { /* skip binary files */ }
          }
        }
      } catch { /* skip inaccessible */ }
    }
  } catch { /* empty */ }

  return { files: totalFiles, size: totalSize, lines: totalLines, todos: totalTodos };
}

function isTextExt(ext: string): boolean {
  return ['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h',
    'rb', 'php', 'swift', 'css', 'scss', 'html', 'json', 'yaml', 'yml',
    'md', 'txt', 'sh', 'sql', 'toml', 'xml', 'graphql'].includes(ext);
}

// ─── Main collector ──────────────────────────────────────

export function collectProjectData(projectPath: string): ProjectData {
  // Read package.json
  let packageInfo: PackageInfo | null = null;
  try {
    const pkgPath = join(projectPath, 'package.json');
    const raw = readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw);
    packageInfo = {
      name: pkg.name || basename(projectPath),
      version: pkg.version || '0.0.0',
      description: pkg.description || '',
      license: pkg.license || 'unlicensed',
      main: pkg.main || pkg.exports?.['.']?.import || '',
      scripts: pkg.scripts || {},
      dependencies: pkg.dependencies || {},
      devDependencies: pkg.devDependencies || {},
    };
  } catch { /* no package.json */ }

  // Walk directory
  const extCounts = new Map<string, { count: number; size: number }>();
  const dirSummaries = new Map<string, DirSummary>();
  const { files, size, lines, todos } = walkDir(projectPath, extCounts, dirSummaries);

  // Build file type list
  const fileTypes: FileTypeCount[] = [...extCounts.entries()]
    .map(([ext, data]) => ({
      ext,
      label: EXT_LABELS[ext] || ext.toUpperCase(),
      count: data.count,
      totalSize: data.size,
      color: EXT_COLORS[ext] || 'white',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // Dir summaries sorted by file count
  const dirs = [...dirSummaries.values()].sort((a, b) => b.fileCount - a.fileCount);

  // Health checks
  const health: ProjectHealth = {
    hasReadme: existsSync(join(projectPath, 'README.md')) || existsSync(join(projectPath, 'readme.md')),
    hasLicense: existsSync(join(projectPath, 'LICENSE')) || existsSync(join(projectPath, 'license')),
    hasTests: existsSync(join(projectPath, 'tests')) || existsSync(join(projectPath, 'test')) || existsSync(join(projectPath, '__tests__')),
    hasCI: existsSync(join(projectPath, '.github/workflows')) || existsSync(join(projectPath, '.gitlab-ci.yml')),
    hasTypeScript: existsSync(join(projectPath, 'tsconfig.json')),
    hasLinter: existsSync(join(projectPath, '.eslintrc.json')) || existsSync(join(projectPath, '.eslintrc.js')) || existsSync(join(projectPath, 'eslint.config.js')) || existsSync(join(projectPath, 'biome.json')),
    hasGitignore: existsSync(join(projectPath, '.gitignore')),
    hasLockFile: existsSync(join(projectPath, 'bun.lockb')) || existsSync(join(projectPath, 'package-lock.json')) || existsSync(join(projectPath, 'yarn.lock')) || existsSync(join(projectPath, 'pnpm-lock.yaml')),
    hasClaude: existsSync(join(projectPath, 'CLAUDE.md')) || existsSync(join(projectPath, '.claude')),
  };

  return {
    path: projectPath,
    packageInfo,
    fileTypes,
    dirs,
    totalFiles: files,
    totalSize: size,
    health,
    todoCount: todos,
    lineCount: lines,
  };
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}
