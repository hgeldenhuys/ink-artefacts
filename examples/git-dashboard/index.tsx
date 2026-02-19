/**
 * Git Dashboard — Interactive terminal overview of any git repository.
 *
 * Usage:
 *   node --import tsx examples/git-dashboard/index.tsx [repo-path]
 *
 * Features:
 *   - Giant gradient repo name header (ink-big-text + ink-gradient)
 *   - Branch/HEAD/status info bar
 *   - Tabbed sections: Commits, Branches, Changes, Stats
 *   - Drill into commit details, branch lists, change lists
 *   - Contributor bar charts with Unicode blocks
 */

import React from 'react';
import { render } from 'ink';
import { PanelStack } from '../../src/index.js';
import type { PanelConfig } from '../../src/index.js';
import { GitDashboardPanel } from './GitDashboard.js';
import { resolve } from 'path';
import { execSync } from 'child_process';

const repoPath = process.argv[2] || process.cwd();

// Verify it's a git repo
try {
  execSync('git rev-parse --git-dir', { cwd: resolve(repoPath), stdio: 'pipe' });
} catch {
  console.error(`Error: ${repoPath} is not a git repository`);
  process.exit(1);
}

const rootPanel: PanelConfig = {
  id: 'git-dashboard',
  title: 'Dashboard',
  component: GitDashboardPanel as any,
  data: { repoPath: resolve(repoPath) },
};

const { unmount } = render(
  <PanelStack
    appName="git-dashboard"
    initialPanel={rootPanel}
    onExit={() => {
      unmount();
      process.exit(0);
    }}
  />,
);
