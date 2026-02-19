/**
 * SWARM data parser — reads .swarm/ directories and parses
 * frontmatter from story, knowledge, and retrospective files.
 *
 * Uses js-yaml for YAML parsing. No dependency on @recursive-ai/core.
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

// ─── Types (mirroring @recursive-ai/core) ────────────────

export type StoryStatus =
  | 'draft' | 'ideating' | 'planned' | 'executing'
  | 'verifying' | 'done' | 'archived' | 'awaiting_input';

export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type Complexity = 'trivial' | 'simple' | 'moderate' | 'complex' | 'epic';
export type ACStatus = 'pending' | 'passing' | 'failing';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped';
export type KnowledgeDimension = 'epistemology' | 'qualia' | 'praxeology';
export type HierarchyScope = 'repo' | 'team' | 'department' | 'enterprise';
export type Confidence = 'low' | 'medium' | 'high';
export type KnowledgeDomain =
  | 'frontend' | 'backend' | 'devops' | 'architecture'
  | 'testing' | 'process' | 'documentation' | 'security';

export interface AcceptanceCriterion {
  id: string;
  description: string;
  status: ACStatus;
  evidence: string;
}

export interface SwarmTask {
  id: string;
  title: string;
  agent: string;
  status: TaskStatus;
  depends_on: string[];
  effort_estimate: string;
  ac_coverage: string[];
}

export interface StoryMeta {
  id: string;
  title: string;
  status: StoryStatus;
  priority: Priority;
  complexity: Complexity;
  created: string;
  updated: string;
  author: string;
  tags: string[];
  acceptance_criteria: AcceptanceCriterion[];
  tasks: SwarmTask[];
  execution: {
    started_at: string | null;
    completed_at: string | null;
    session_ids: string[];
  };
  why: {
    problem: string;
    root_cause: string;
    impact: string;
  };
}

export interface KnowledgeItem {
  id: string;
  source_story: string;
  source_repo: string;
  created: string;
  author: string;
  dimension: KnowledgeDimension;
  scope: HierarchyScope;
  hoistable: boolean;
  confidence: Confidence;
  tags: string[];
  domain: KnowledgeDomain;
  title: string;
  description: string;
  context: string;
  recommendation: string;
}

export interface RetroMeta {
  story_id: string;
  title: string;
  completed: string;
  duration: string;
  agents_involved: string[];
  repo: string;
  metrics: {
    tasks_total: number;
    tasks_completed: number;
    acs_total: number;
    acs_passing: number;
    files_changed: number;
    tests_added: number;
    cycle_time_hours: number;
  };
}

export interface ConfigMeta {
  project: string;
  prefix: string;
  counter: number;
  definition_of_ready: string[];
  definition_of_done: string[];
  ways_of_working: Record<string, string | number | boolean>;
}

export interface ParsedFile<T> {
  meta: T;
  body: string;
  filePath: string;
}

// ─── Frontmatter parser ──────────────────────────────────

export function parseFrontmatter<T>(content: string): { meta: T; body: string } | null {
  if (!content.startsWith('---')) return null;
  const closingIndex = content.indexOf('\n---', 3);
  if (closingIndex === -1) return null;

  const yamlBlock = content.slice(4, closingIndex);
  const afterClosing = closingIndex + 4;
  const body = afterClosing < content.length && content[afterClosing] === '\n'
    ? content.slice(afterClosing + 1)
    : content.slice(afterClosing);

  try {
    const meta = yaml.load(yamlBlock) as T;
    if (meta === null || meta === undefined || typeof meta !== 'object') return null;
    return { meta, body };
  } catch {
    return null;
  }
}

// ─── Directory readers ───────────────────────────────────

function readMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith('.md') && !f.startsWith('.'))
      .map(f => join(dir, f));
  } catch {
    return [];
  }
}

export function loadStories(swarmDir: string): ParsedFile<StoryMeta>[] {
  const results: ParsedFile<StoryMeta>[] = [];
  const dirs = [join(swarmDir, 'backlog'), join(swarmDir, 'archive')];

  for (const dir of dirs) {
    const files = readMarkdownFiles(dir);
    for (const filePath of files) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const parsed = parseFrontmatter<StoryMeta>(content);
        if (parsed && parsed.meta.id) {
          results.push({ ...parsed, filePath });
        }
      } catch { /* skip unreadable files */ }
    }
  }

  return results;
}

export function loadKnowledge(swarmDir: string): ParsedFile<KnowledgeItem>[] {
  const results: ParsedFile<KnowledgeItem>[] = [];
  const files = readMarkdownFiles(join(swarmDir, 'knowledge'));

  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const parsed = parseFrontmatter<KnowledgeItem>(content);
      if (parsed && parsed.meta.id) {
        results.push({ ...parsed, filePath });
      }
    } catch { /* skip */ }
  }

  return results;
}

export function loadRetros(swarmDir: string): ParsedFile<RetroMeta>[] {
  const results: ParsedFile<RetroMeta>[] = [];
  const files = readMarkdownFiles(join(swarmDir, 'retrospectives'));

  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const parsed = parseFrontmatter<RetroMeta>(content);
      if (parsed && parsed.meta.story_id) {
        results.push({ ...parsed, filePath });
      }
    } catch { /* skip */ }
  }

  return results;
}

export function loadConfig(swarmDir: string): ParsedFile<ConfigMeta> | null {
  const configPath = join(swarmDir, 'config.md');
  if (!existsSync(configPath)) return null;
  try {
    const content = readFileSync(configPath, 'utf-8');
    const parsed = parseFrontmatter<ConfigMeta>(content);
    if (parsed) return { ...parsed, filePath: configPath };
  } catch { /* skip */ }
  return null;
}

// ─── Status helpers ──────────────────────────────────────

const STATUS_ORDER: Record<StoryStatus, number> = {
  executing: 0,
  verifying: 1,
  awaiting_input: 2,
  planned: 3,
  ideating: 4,
  draft: 5,
  done: 6,
  archived: 7,
};

const STATUS_COLORS: Record<StoryStatus, string> = {
  draft: 'gray',
  ideating: 'blue',
  planned: 'cyan',
  executing: 'yellow',
  verifying: 'magenta',
  done: 'green',
  archived: 'gray',
  awaiting_input: 'red',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  critical: 'red',
  high: 'yellow',
  medium: 'cyan',
  low: 'gray',
};

const DIMENSION_LABELS: Record<KnowledgeDimension, string> = {
  epistemology: 'Pattern',
  qualia: 'Pain Point',
  praxeology: 'Best Practice',
};

const DIMENSION_SHORT: Record<KnowledgeDimension, string> = {
  epistemology: 'E',
  qualia: 'Q',
  praxeology: 'P',
};

const DIMENSION_COLORS: Record<KnowledgeDimension, string> = {
  epistemology: 'blue',
  qualia: 'red',
  praxeology: 'green',
};

export {
  STATUS_ORDER, STATUS_COLORS, PRIORITY_COLORS,
  DIMENSION_LABELS, DIMENSION_SHORT, DIMENSION_COLORS,
};
