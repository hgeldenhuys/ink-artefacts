#!/usr/bin/env bun
/**
 * Installs the dashboard PostToolUse hook into a project's .claude/settings.json.
 *
 * Usage:
 *   bun hooks/install-hooks.ts [target-project-dir]
 *
 * If target-project-dir is omitted, defaults to CWD.
 *
 * The hook command is written as a path relative to the target project root,
 * so it works portably when ink-panels is installed as a dependency
 * (node_modules/ink-panels/hooks/dashboard-hook.ts) or when ink-panels IS
 * the project (hooks/dashboard-hook.ts).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Where this script physically lives: <ink-panels>/hooks/
const HOOK_SCRIPT = join(__dirname, 'dashboard-hook.ts');

// Target project root — either the argument or CWD
const targetDir = resolve(process.argv[2] || process.cwd());

// Settings file location
const claudeDir = join(targetDir, '.claude');
const settingsPath = join(claudeDir, 'settings.json');

// Compute the hook path relative to the target project root
const relativeHookPath = relative(targetDir, HOOK_SCRIPT);

// The command Claude Code will execute. CWD at hook run time is the project root,
// so a relative path works. We use "bun" as the runner.
const hookCommand = `bun ${relativeHookPath}`;

console.log('');
console.log('ink-panels Dashboard Hook Installer');
console.log('════════════════════════════════════');
console.log(`Target project: ${targetDir}`);
console.log(`Hook script:    ${HOOK_SCRIPT}`);
console.log(`Hook command:   ${hookCommand}`);
console.log('');

// ─── Read or create settings ─────────────────────────────

let settings: Record<string, unknown> = {};

if (existsSync(settingsPath)) {
  try {
    const raw = readFileSync(settingsPath, 'utf-8');
    settings = JSON.parse(raw);
    console.log('Found existing .claude/settings.json');
  } catch {
    console.log('Could not parse existing settings.json, creating fresh');
    settings = {};
  }
} else {
  console.log('No .claude/settings.json found, creating one');
}

// ─── Ensure hooks structure ──────────────────────────────

if (!settings.hooks || typeof settings.hooks !== 'object') {
  settings.hooks = {};
}

const hooks = settings.hooks as Record<string, unknown>;

if (!Array.isArray(hooks.PostToolUse)) {
  hooks.PostToolUse = [];
}

const postToolUseEntries = hooks.PostToolUse as Array<Record<string, unknown>>;

// ─── Check if hook is already installed ──────────────────

let alreadyInstalled = false;
for (const entry of postToolUseEntries) {
  if (!Array.isArray(entry.hooks)) continue;
  for (const h of entry.hooks as Array<Record<string, unknown>>) {
    if (typeof h.command === 'string' && h.command.includes('dashboard-hook')) {
      // Update existing hook command in case path changed
      h.command = hookCommand;
      alreadyInstalled = true;
      console.log('Hook already installed — updated command path');
    }
  }
}

if (!alreadyInstalled) {
  postToolUseEntries.push({
    matcher: '.*',
    hooks: [
      {
        type: 'command',
        command: hookCommand,
      },
    ],
  });
  console.log('Added PostToolUse hook entry');
}

// ─── Write settings ──────────────────────────────────────

mkdirSync(claudeDir, { recursive: true });
writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');

console.log(`Wrote: ${settingsPath}`);
console.log('');
console.log('Done! The dashboard hook will fire on every tool use.');
console.log('Launch the canvas viewer to see live updates:');
console.log('  bun run canvas');
console.log('');
