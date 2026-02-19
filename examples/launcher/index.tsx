/**
 * Launcher — Pick an example from a menu and launch it.
 *
 * Usage:
 *   node --import tsx examples/launcher/index.tsx
 */

import React from 'react';
import { render } from 'ink';
import { PanelStack, ListPanel } from '../../src/index.js';
import type { PanelConfig, PanelProps } from '../../src/index.js';
import { execSync } from 'child_process';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');

interface Example {
  name: string;
  description: string;
  dir: string;
  args?: string;
}

const examples: Example[] = [
  { name: 'File Browser', description: 'Navigate the filesystem with detail panels', dir: 'file-browser' },
  { name: 'Doc Reader', description: 'Browse & read markdown/source files with rendering', dir: 'doc-reader' },
  { name: 'Git Dashboard', description: 'Git repo overview — branches, log, status, stash', dir: 'git-dashboard' },
  { name: 'Project Dashboard', description: 'Project overview — package.json, deps, scripts', dir: 'project-dashboard' },
  { name: 'System Monitor', description: 'Live system stats — CPU, memory, disk, processes', dir: 'system-monitor' },
  { name: 'SWARM Explorer', description: 'Browse .swarm stories, tasks, knowledge, retros', dir: 'swarm-explorer' },
  { name: 'Scrum Board', description: 'Kanban-style scrum board with task management', dir: 'scrum-board' },
  { name: 'DB Browser', description: 'Browse SQLite databases interactively', dir: 'db-browser' },
  { name: 'Hook Editor', description: 'Browse and edit Claude Code hooks across all scopes', dir: 'hook-editor' },
  { name: 'Slide Deck', description: 'Terminal presentation: The Anatomy of an AI Coding Agent', dir: 'slide-deck' },
  { name: 'YAML Editor', description: 'Browse and edit YAML files with vim-style keys', dir: 'yaml-editor' },
  { name: 'Clock', description: 'Animated terminal clock with timer', dir: 'clock' },
  { name: 'Neon Clock', description: 'Glowing gradient clock with cycling neon themes', dir: 'neon-clock' },
  { name: 'Canvas Viewer', description: 'Artifact viewer — renders JSON artifact tabs', dir: 'artifact-viewer' },
];

let unmountFn: (() => void) | null = null;

function launchExample(example: Example): void {
  if (unmountFn) {
    unmountFn();
  }
  const script = join(ROOT, example.dir, 'index.tsx');
  const args = example.args ? ` ${example.args}` : '';
  const cmd = `NODE_ENV=production node --import tsx ${script}${args}`;
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch {
    // Example exited (user quit) — relaunch the launcher
    startLauncher();
  }
}

function makeLauncherPanel(): PanelConfig {
  return {
    id: 'launcher',
    title: 'Launcher',
    component: ListPanel as any,
    data: {
      title: 'ink-panels Examples',
      items: examples.map((ex, i) => ({
        id: String(i),
        label: ex.name,
        description: ex.description,
        badge: ex.dir,
        badgeColor: 'cyan',
      })),
      onSelect: (_item: any, index: number, _props: PanelProps<any>) => {
        const example = examples[index];
        if (example) {
          launchExample(example);
        }
      },
    },
  };
}

function startLauncher(): void {
  const { unmount } = render(
    <PanelStack
      appName="launcher"
      initialPanel={makeLauncherPanel()}
      onExit={() => {
        unmount();
        process.exit(0);
      }}
    />,
  );
  unmountFn = unmount;
}

startLauncher();
