#!/usr/bin/env bun
/**
 * PostToolUse hook for Claude Code live dashboard.
 *
 * Reads hook JSON from stdin, maintains persistent state in
 * ~/.claude/dashboard-state.json, and writes session-scoped artifact files
 * to ~/.claude/artifacts/ that the canvas viewer picks up via fs.watch().
 *
 * Artifacts are scoped by session ID so they don't conflict with other
 * artifacts (examples, other sessions, etc.).
 *
 * NOTE: TaskCreate/TaskUpdate tools do NOT trigger PostToolUse hooks.
 * Instead, we parse the transcript file on each hook call to extract
 * task state from the assistant's tool_use blocks.
 *
 * No external dependencies — uses only Node builtins.
 */

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ─── Paths ───────────────────────────────────────────────

const HOME = homedir();
const STATE_PATH = join(HOME, '.claude', 'dashboard-state.json');
const ARTIFACTS_DIR = join(HOME, '.claude', 'artifacts');


// ─── Types ───────────────────────────────────────────────

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

interface HookInput {
  hook_event_name: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: unknown;
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
}

// ─── State management ────────────────────────────────────

function loadState(): DashboardState {
  try {
    const raw = readFileSync(STATE_PATH, 'utf-8');
    return JSON.parse(raw) as DashboardState;
  } catch {
    return {
      recentFiles: [],
      toolCallCount: 0,
      sessionStartedAt: new Date().toISOString(),
    };
  }
}

function saveState(state: DashboardState): void {
  mkdirSync(join(HOME, '.claude'), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// ─── Transcript parsing for tasks ────────────────────────

function extractTasksFromTranscript(transcriptPath: string): Task[] {
  const tasks: Task[] = [];
  const pendingCreates = new Map<string, Task>();
  const taskById = new Map<string, Task>();
  const pendingUpdates: Array<{ taskId: string; status?: string; subject?: string; activeForm?: string }> = [];

  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      let entry: any;
      try {
        entry = JSON.parse(line);
      } catch {
        continue;
      }

      const message = entry.message;
      if (!message) continue;
      const blocks = Array.isArray(message.content) ? message.content : [];

      if (entry.type === 'assistant') {
        for (const block of blocks) {
          if (block.type !== 'tool_use') continue;

          if (block.name === 'TaskCreate') {
            const input = block.input || {};
            pendingCreates.set(block.id, {
              id: '',
              subject: String(input.subject || 'Untitled'),
              activeForm: String(input.activeForm || input.subject || 'Working'),
              status: 'pending',
            });
          }

          if (block.name === 'TaskUpdate') {
            const input = block.input || {};
            pendingUpdates.push({
              taskId: String(input.taskId || ''),
              status: input.status as string | undefined,
              subject: input.subject as string | undefined,
              activeForm: input.activeForm as string | undefined,
            });
          }
        }
      }

      if (entry.type === 'user') {
        for (const block of blocks) {
          if (block.type !== 'tool_result') continue;
          if (!pendingCreates.has(block.tool_use_id)) continue;

          const task = pendingCreates.get(block.tool_use_id)!;
          const ct = block.content;
          let resultText = '';
          if (typeof ct === 'string') {
            resultText = ct;
          } else if (Array.isArray(ct)) {
            for (const c of ct) {
              if (typeof c === 'string') resultText += c;
              else if (typeof c === 'object' && c) resultText += c.text || '';
            }
          }

          const match = resultText.match(/Task #(\d+)/);
          task.id = match ? match[1] : String(tasks.length + 1);
          tasks.push(task);
          taskById.set(task.id, task);
          pendingCreates.delete(block.tool_use_id);
        }
      }
    }

    for (const update of pendingUpdates) {
      const task = taskById.get(update.taskId);
      if (task) {
        if (update.status) task.status = update.status as Task['status'];
        if (update.subject) task.subject = update.subject;
        if (update.activeForm) task.activeForm = update.activeForm;
      }
    }

    for (const task of pendingCreates.values()) {
      if (!task.id) task.id = String(tasks.length + 1);
      tasks.push(task);
    }
  } catch {
    // Transcript might not exist or be unreadable
  }

  return tasks;
}

// ─── Artifact writers ────────────────────────────────────

function writeArtifact(filename: string, artifact: object): void {
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  writeFileSync(join(ARTIFACTS_DIR, filename), JSON.stringify(artifact, null, 2));
}

function writeTasksArtifact(sessionId: string, tasks: Task[]): void {
  const completed = tasks.filter(t => t.status === 'completed');
  const inProgress = tasks.filter(t => t.status === 'in_progress');
  const open = tasks.filter(t => t.status === 'pending');

  const parts: string[] = [];

  // Summary line
  const summaryParts: string[] = [];
  if (completed.length > 0) summaryParts.push(`${completed.length} done`);
  if (inProgress.length > 0) summaryParts.push(`${inProgress.length} in progress`);
  if (open.length > 0) summaryParts.push(`${open.length} open`);
  parts.push(`${tasks.length} tasks (${summaryParts.join(', ')})`);
  parts.push('');

  // In-progress first, then open, then completed (with strikethrough)
  for (const t of inProgress) {
    parts.push(`  \u25FC ${t.subject}`);
  }
  for (const t of open) {
    parts.push(`  \u25FB ${t.subject}`);
  }
  for (const t of completed) {
    parts.push(`  \u2714 ~${t.subject}~`);
  }

  writeArtifact(`session-${sessionId}-01-tasks.json`, {
    id: `session-${sessionId}-tasks`,
    title: 'Tasks',
    type: 'log',
    data: {
      content: parts.join('\n'),
    },
    createdAt: new Date().toISOString(),
  });
}

function writeFilesArtifact(sessionId: string, state: DashboardState): void {
  const items = [];
  for (const f of state.recentFiles.slice(0, 15)) {
    const fileParts = f.path.split('/');
    const shortName = fileParts.length > 2
      ? `.../${fileParts.slice(-2).join('/')}`
      : f.path;
    const time = new Date(f.timestamp);
    const timeStr = time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    items.push({
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
    data: items,
    createdAt: new Date().toISOString(),
  });
}

function writeContextArtifact(sessionId: string, state: DashboardState, tasks: Task[], input: HookInput): void {
  let transcriptSizeKB = 0;
  let contextPercent = 0;
  const MAX_CONTEXT_KB = 2048;

  if (input.transcript_path) {
    try {
      const stat = statSync(input.transcript_path);
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

  const data: Record<string, string> = {
    'Context Usage': contextBar,
    'Transcript Size': `${transcriptSizeKB} KB`,
    'Tool Calls': String(state.toolCallCount),
    'Session Duration': durationStr,
    'Tasks Progress': totalTasks > 0 ? `${completedTasks}/${totalTasks}` : 'No tasks',
    'Last Tool': input.tool_name,
    'Files Touched': String(state.recentFiles.length),
  };

  writeArtifact(`session-${sessionId}-03-context.json`, {
    id: `session-${sessionId}-context`,
    title: 'Context',
    type: 'key-value',
    data,
    createdAt: new Date().toISOString(),
  });
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  let rawInput = '';
  const stdin = process.stdin;
  stdin.setEncoding('utf-8');

  rawInput = await new Promise<string>((resolve) => {
    let data = '';
    stdin.on('data', (chunk: string) => { data += chunk; });
    stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(data), 2000);
  });

  if (!rawInput.trim()) process.exit(0);

  let input: HookInput;
  try {
    input = JSON.parse(rawInput) as HookInput;
  } catch {
    process.exit(0);
  }

  const sessionId = input.session_id || 'unknown';
  const state = loadState();
  state.toolCallCount++;

  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  // ─── Handle Write/Edit ───────────────────────────────
  if (toolName === 'Write' || toolName === 'Edit') {
    const filePath = String(toolInput.file_path || '');
    if (filePath) {
      const action: 'W' | 'E' = toolName === 'Write' ? 'W' : 'E';
      const now = new Date().toISOString();
      const timeStr = new Date(now).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Build diff entry for Edit operations
      const diff: DiffEntry | null = toolName === 'Edit'
        ? {
            old: String(toolInput.old_string || ''),
            new: String(toolInput.new_string || ''),
            timestamp: timeStr,
          }
        : null;

      const existingIdx = state.recentFiles.findIndex(f => f.path === filePath);
      if (existingIdx >= 0) {
        // Move to top, append new diff
        const existing = state.recentFiles.splice(existingIdx, 1)[0]!;
        existing.action = action;
        existing.timestamp = now;
        if (diff) {
          existing.diffs.unshift(diff);
          if (existing.diffs.length > 10) existing.diffs = existing.diffs.slice(0, 10);
        }
        state.recentFiles.unshift(existing);
      } else {
        state.recentFiles.unshift({
          path: filePath,
          action,
          timestamp: now,
          diffs: diff ? [diff] : [],
        });
      }
      // Cap files at 15 and diffs at 10 per file to prevent unbounded growth
      if (state.recentFiles.length > 15) state.recentFiles = state.recentFiles.slice(0, 15);
      // Also cap total diffs across all files
      let totalDiffs = 0;
      for (const f of state.recentFiles) {
        totalDiffs += f.diffs.length;
        if (totalDiffs > 100) {
          f.diffs = f.diffs.slice(0, Math.max(0, f.diffs.length - (totalDiffs - 100)));
          totalDiffs = 100;
        }
      }
    }
  }

  // ─── Extract tasks from transcript ───────────────────
  let tasks: Task[] = [];
  if (input.transcript_path) {
    tasks = extractTasksFromTranscript(input.transcript_path);
  }

  // ─── Save state and write session-scoped artifacts ───
  saveState(state);
  writeTasksArtifact(sessionId, tasks);
  writeFilesArtifact(sessionId, state);
  writeContextArtifact(sessionId, state, tasks, input);

  process.exit(0);
}

main().catch((err) => {
  // Write error to log file for debugging
  try {
    const errLog = join(HOME, '.claude', 'dashboard-hook-errors.log');
    const msg = `[${new Date().toISOString()}] ${err?.message || String(err)}\n`;
    writeFileSync(errLog, msg, { flag: 'a' });
  } catch {}
  process.exit(0);
});
