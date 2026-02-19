#!/usr/bin/env bun
/**
 * On-demand dashboard artifact injector.
 *
 * Reads the dashboard state + meta collected by the hooks and writes
 * artifacts to ~/.claude/artifacts/ for the canvas viewer to display.
 *
 * Usage:
 *   bun run canvas:dashboard          # inject all (tasks + files + context)
 *   bun run canvas:dashboard tasks     # inject tasks only
 *   bun run canvas:dashboard files     # inject files only
 *   bun run canvas:dashboard context   # inject context only
 *   bun run canvas:dashboard tasks files  # inject tasks + files
 */

import { readFileSync, writeFileSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const HOME = homedir();
const STATE_PATH = join(HOME, '.claude', 'dashboard-state.json');
const META_PATH = join(HOME, '.claude', 'dashboard-meta.json');
const ARTIFACTS_DIR = join(HOME, '.claude', 'artifacts');

interface Task {
  id: string;
  subject: string;
  activeForm: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface DiffEntry {
  old: string;
  new: string;
  timestamp: string;
}

interface RecentFile {
  path: string;
  action: 'W' | 'E';
  timestamp: string;
  diffs: DiffEntry[];
}

interface DashboardState {
  recentFiles: RecentFile[];
  toolCallCount: number;
  sessionStartedAt: string;
}

interface DashboardMeta {
  sessionId: string;
  tasks: Task[];
  transcriptPath: string;
  toolName: string;
}

function writeArtifact(filename: string, artifact: object): void {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  writeFileSync(join(ARTIFACTS_DIR, filename), JSON.stringify(artifact, null, 2));
}

// ─── Parse which panels to inject ───────────────────────

const args = process.argv.slice(2);
const validPanels = new Set(['tasks', 'files', 'context']);
const requested = new Set<string>();

for (const arg of args) {
  if (validPanels.has(arg)) requested.add(arg);
}

// No args = inject all
const injectAll = requested.size === 0;
const injectTasks = injectAll || requested.has('tasks');
const injectFiles = injectAll || requested.has('files');
const injectContext = injectAll || requested.has('context');

// ─── Load state + meta ──────────────────────────────────

let state: DashboardState;
try {
  state = JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
} catch {
  console.log('No dashboard state found. Run a session with hooks first.');
  process.exit(0);
}

let meta: DashboardMeta;
try {
  meta = JSON.parse(readFileSync(META_PATH, 'utf-8'));
} catch {
  console.log('No dashboard meta found. Run a session with hooks first.');
  process.exit(0);
}

const sessionId = meta.sessionId;
const tasks = meta.tasks;
const injected: string[] = [];

// ─── Clean up session artifacts not requested ───────────
// Remove any session artifacts that weren't asked for so the canvas only shows what you want.
const artifactSlots = [
  { key: 'tasks', suffix: '01-tasks' },
  { key: 'files', suffix: '02-files' },
  { key: 'context', suffix: '03-context' },
];
for (const slot of artifactSlots) {
  if (injectAll) break; // injecting all — don't remove anything
  if (!requested.has(slot.key)) {
    const filePath = join(ARTIFACTS_DIR, `session-${sessionId}-${slot.suffix}.json`);
    try { unlinkSync(filePath); } catch {}
  }
}

// ─── Tasks artifact ─────────────────────────────────────

if (injectTasks) {
  const completed = tasks.filter(t => t.status === 'completed');
  const inProgress = tasks.filter(t => t.status === 'in_progress');
  const open = tasks.filter(t => t.status === 'pending');

  const taskParts: string[] = [];
  const summaryParts: string[] = [];
  if (completed.length > 0) summaryParts.push(`${completed.length} done`);
  if (inProgress.length > 0) summaryParts.push(`${inProgress.length} in progress`);
  if (open.length > 0) summaryParts.push(`${open.length} open`);
  taskParts.push(`${tasks.length} tasks (${summaryParts.join(', ')})`);
  taskParts.push('');

  for (const t of inProgress) taskParts.push(`  \u25FC ${t.subject}`);
  for (const t of open) taskParts.push(`  \u25FB ${t.subject}`);
  for (const t of completed) taskParts.push(`  \u2714 ~${t.subject}~`);

  writeArtifact(`session-${sessionId}-01-tasks.json`, {
    id: `session-${sessionId}-tasks`,
    title: 'Tasks',
    type: 'log',
    data: { content: taskParts.join('\n') },
    createdAt: new Date().toISOString(),
  });
  injected.push(`Tasks (${tasks.length})`);
}

// ─── Files artifact ─────────────────────────────────────

if (injectFiles) {
  const fileItems = [];
  for (const f of state.recentFiles.slice(0, 15)) {
    const fileParts = f.path.split('/');
    const shortName = fileParts.length > 2
      ? `.../${fileParts.slice(-2).join('/')}`
      : f.path;
    const time = new Date(f.timestamp);
    const timeStr = time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    fileItems.push({
      shortName,
      path: f.path,
      action: f.action,
      timestamp: timeStr,
      diffs: f.diffs || [],
    });
  }

  writeArtifact(`session-${sessionId}-02-files.json`, {
    id: `session-${sessionId}-files`,
    title: 'Files',
    type: 'diff-list',
    data: fileItems,
    createdAt: new Date().toISOString(),
  });
  injected.push(`Files (${fileItems.length})`);
}

// ─── Context artifact ───────────────────────────────────

if (injectContext) {
  let transcriptSizeKB = 0;
  let contextPercent = 0;
  const MAX_CONTEXT_KB = 2048;

  if (meta.transcriptPath) {
    try {
      const stat = statSync(meta.transcriptPath);
      transcriptSizeKB = Math.round(stat.size / 1024);
      contextPercent = Math.min(100, Math.round((stat.size / (MAX_CONTEXT_KB * 1024)) * 100));
    } catch {}
  }

  const barWidth = 20;
  const filled = Math.round((contextPercent / 100) * barWidth);
  const empty = barWidth - filled;
  const contextBar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty) + ` ${contextPercent}%`;

  const startTime = new Date(state.sessionStartedAt);
  const now = new Date();
  const durationMs = now.getTime() - startTime.getTime();
  const minutes = Math.floor(durationMs / 60000);
  const seconds = Math.floor((durationMs % 60000) / 1000);
  const durationStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;

  writeArtifact(`session-${sessionId}-03-context.json`, {
    id: `session-${sessionId}-context`,
    title: 'Context',
    type: 'key-value',
    data: {
      'Context Usage': contextBar,
      'Transcript Size': `${transcriptSizeKB} KB`,
      'Tool Calls': String(state.toolCallCount),
      'Session Duration': durationStr,
      'Tasks Progress': totalTasks > 0 ? `${completedTasks}/${totalTasks}` : 'No tasks',
      'Last Tool': meta.toolName || 'N/A',
      'Files Touched': String(state.recentFiles.length),
    },
    createdAt: new Date().toISOString(),
  });
  injected.push('Context');
}

console.log(`Injected: ${injected.join(', ')}`);
