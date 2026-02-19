/**
 * hook-data.ts — Data layer for Claude Code hook management.
 *
 * Reads/writes hooks from 3 settings file scopes:
 *   User:    ~/.claude/settings.json
 *   Project: <projectDir>/.claude/settings.json
 *   Local:   <projectDir>/.claude/settings.local.json
 *
 * Preserves all non-hooks keys (permissions, plugins, etc.) when writing.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

// ─── Types ────────────────────────────────────────────────

export type HookScope = 'user' | 'project' | 'local';

export type HookEventType =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Notification'
  | 'Stop'
  | 'SubagentStop'
  | 'PreCompact'
  | 'PostCompact'
  | 'PreToolUseAccepted'
  | 'ToolError'
  | 'SessionStart'
  | 'SessionStop'
  | 'PreUserPromptSubmit'
  | 'PostUserPromptSubmit'
  | 'McpToolResult';

export const ALL_EVENTS: HookEventType[] = [
  'PreToolUse',
  'PostToolUse',
  'PreToolUseAccepted',
  'ToolError',
  'McpToolResult',
  'Notification',
  'Stop',
  'SubagentStop',
  'PreCompact',
  'PostCompact',
  'SessionStart',
  'SessionStop',
  'PreUserPromptSubmit',
  'PostUserPromptSubmit',
];

export type HookHandlerType = 'command' | 'prompt' | 'agent';

export interface HookHandler {
  type: HookHandlerType;
  command?: string;
  prompt?: string;
  model?: string;
  timeout?: number;
  async?: boolean;
}

export interface MatcherGroup {
  matcher?: string;
  hooks: HookHandler[];
}

export interface ScopedMatcherGroup {
  scope: HookScope;
  event: HookEventType;
  matcherGroupIndex: number;
  matcher?: string;
  hooks: HookHandler[];
}

export interface EventSummary {
  event: HookEventType;
  userCount: number;
  projectCount: number;
  localCount: number;
  totalCount: number;
}

// ─── Settings file paths ──────────────────────────────────

function getSettingsPath(scope: HookScope, projectDir: string): string {
  if (scope === 'user') {
    return join(homedir(), '.claude', 'settings.json');
  }
  if (scope === 'project') {
    return join(projectDir, '.claude', 'settings.json');
  }
  return join(projectDir, '.claude', 'settings.local.json');
}

// ─── Read/write settings files ────────────────────────────

function readSettings(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return {};
  }
}

function writeSettings(path: string, settings: Record<string, unknown>): void {
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(settings, null, 2) + '\n');
}

function getHooksFromSettings(settings: Record<string, unknown>): Record<string, MatcherGroup[]> {
  const hooks = settings.hooks;
  if (!hooks || typeof hooks !== 'object') return {};
  return hooks as Record<string, MatcherGroup[]>;
}

// ─── Load all hooks ───────────────────────────────────────

export function loadAllHooks(projectDir: string): ScopedMatcherGroup[] {
  const result: ScopedMatcherGroup[] = [];
  const scopes: HookScope[] = ['user', 'project', 'local'];

  for (const scope of scopes) {
    const path = getSettingsPath(scope, projectDir);
    const settings = readSettings(path);
    const hooks = getHooksFromSettings(settings);

    for (const event of ALL_EVENTS) {
      const matcherGroups = hooks[event];
      if (!Array.isArray(matcherGroups)) continue;

      for (let i = 0; i < matcherGroups.length; i++) {
        const mg = matcherGroups[i]!;
        result.push({
          scope,
          event: event as HookEventType,
          matcherGroupIndex: i,
          matcher: mg.matcher,
          hooks: Array.isArray(mg.hooks) ? mg.hooks : [],
        });
      }
    }
  }

  return result;
}

// ─── Build event summaries ────────────────────────────────

export function buildEventSummaries(allHooks: ScopedMatcherGroup[]): EventSummary[] {
  const summaries: EventSummary[] = [];

  for (const event of ALL_EVENTS) {
    let userCount = 0;
    let projectCount = 0;
    let localCount = 0;

    for (const h of allHooks) {
      if (h.event !== event) continue;
      const handlerCount = h.hooks.length;
      if (h.scope === 'user') userCount += handlerCount;
      else if (h.scope === 'project') projectCount += handlerCount;
      else localCount += handlerCount;
    }

    summaries.push({
      event,
      userCount,
      projectCount,
      localCount,
      totalCount: userCount + projectCount + localCount,
    });
  }

  return summaries;
}

// ─── CRUD operations ──────────────────────────────────────

export function addMatcherGroup(
  projectDir: string,
  scope: HookScope,
  event: HookEventType,
  matcher: string | undefined,
  handler: HookHandler,
): void {
  const path = getSettingsPath(scope, projectDir);
  const settings = readSettings(path);

  if (!settings.hooks || typeof settings.hooks !== 'object') {
    settings.hooks = {};
  }
  const hooks = settings.hooks as Record<string, unknown[]>;

  if (!Array.isArray(hooks[event])) {
    hooks[event] = [];
  }

  const newGroup: MatcherGroup = {
    hooks: [handler],
  };
  if (matcher) {
    newGroup.matcher = matcher;
  }

  (hooks[event] as MatcherGroup[]).push(newGroup);
  writeSettings(path, settings);
}

export function updateHookHandler(
  projectDir: string,
  scope: HookScope,
  event: HookEventType,
  matcherGroupIndex: number,
  handlerIndex: number,
  updates: Partial<HookHandler>,
): void {
  const path = getSettingsPath(scope, projectDir);
  const settings = readSettings(path);
  const hooks = getHooksFromSettings(settings);

  const groups = hooks[event];
  if (!Array.isArray(groups) || !groups[matcherGroupIndex]) return;

  const group = groups[matcherGroupIndex]!;
  if (!Array.isArray(group.hooks) || !group.hooks[handlerIndex]) return;

  const handler = group.hooks[handlerIndex]!;

  // Apply updates — clear fields that don't apply to the new type
  if (updates.type && updates.type !== handler.type) {
    if (updates.type === 'command') {
      delete handler.prompt;
      delete handler.model;
    } else {
      delete handler.command;
      delete handler.timeout;
      delete handler.async;
    }
  }

  Object.assign(handler, updates);

  // Clean up undefined/null values
  for (const key of Object.keys(handler)) {
    if ((handler as any)[key] === undefined || (handler as any)[key] === null) {
      delete (handler as any)[key];
    }
  }

  settings.hooks = hooks;
  writeSettings(path, settings);
}

export function updateMatcherGroupMatcher(
  projectDir: string,
  scope: HookScope,
  event: HookEventType,
  matcherGroupIndex: number,
  newMatcher: string | undefined,
): void {
  const path = getSettingsPath(scope, projectDir);
  const settings = readSettings(path);
  const hooks = getHooksFromSettings(settings);

  const groups = hooks[event];
  if (!Array.isArray(groups) || !groups[matcherGroupIndex]) return;

  if (newMatcher) {
    groups[matcherGroupIndex]!.matcher = newMatcher;
  } else {
    delete groups[matcherGroupIndex]!.matcher;
  }

  settings.hooks = hooks;
  writeSettings(path, settings);
}

export function addHandlerToGroup(
  projectDir: string,
  scope: HookScope,
  event: HookEventType,
  matcherGroupIndex: number,
  handler: HookHandler,
): void {
  const path = getSettingsPath(scope, projectDir);
  const settings = readSettings(path);
  const hooks = getHooksFromSettings(settings);

  const groups = hooks[event];
  if (!Array.isArray(groups) || !groups[matcherGroupIndex]) return;

  groups[matcherGroupIndex]!.hooks.push(handler);
  settings.hooks = hooks;
  writeSettings(path, settings);
}

export function deleteHookHandler(
  projectDir: string,
  scope: HookScope,
  event: HookEventType,
  matcherGroupIndex: number,
  handlerIndex: number,
): void {
  const path = getSettingsPath(scope, projectDir);
  const settings = readSettings(path);
  const hooks = getHooksFromSettings(settings);

  const groups = hooks[event];
  if (!Array.isArray(groups) || !groups[matcherGroupIndex]) return;

  const group = groups[matcherGroupIndex]!;
  if (!Array.isArray(group.hooks)) return;

  group.hooks.splice(handlerIndex, 1);

  // Remove empty matcher groups
  if (group.hooks.length === 0) {
    groups.splice(matcherGroupIndex, 1);
  }

  // Remove empty event keys
  if (groups.length === 0) {
    delete hooks[event];
  }

  settings.hooks = hooks;
  writeSettings(path, settings);
}

export function deleteMatcherGroup(
  projectDir: string,
  scope: HookScope,
  event: HookEventType,
  matcherGroupIndex: number,
): void {
  const path = getSettingsPath(scope, projectDir);
  const settings = readSettings(path);
  const hooks = getHooksFromSettings(settings);

  const groups = hooks[event];
  if (!Array.isArray(groups)) return;

  groups.splice(matcherGroupIndex, 1);

  if (groups.length === 0) {
    delete hooks[event];
  }

  settings.hooks = hooks;
  writeSettings(path, settings);
}

// ─── Scope display helpers ────────────────────────────────

export const SCOPE_COLORS: Record<HookScope, string> = {
  user: 'blue',
  project: 'green',
  local: 'yellow',
};

export const SCOPE_LABELS: Record<HookScope, string> = {
  user: 'User',
  project: 'Project',
  local: 'Local',
};

// ─── Event category helpers ───────────────────────────────

export const EVENT_CATEGORIES: Record<string, HookEventType[]> = {
  'Tool Lifecycle': ['PreToolUse', 'PostToolUse', 'PreToolUseAccepted', 'ToolError', 'McpToolResult'],
  'Session': ['SessionStart', 'SessionStop', 'Stop', 'SubagentStop'],
  'Prompt': ['PreUserPromptSubmit', 'PostUserPromptSubmit', 'Notification'],
  'Context': ['PreCompact', 'PostCompact'],
};
