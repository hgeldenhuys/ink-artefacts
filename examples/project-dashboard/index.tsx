/**
 * Project Dashboard — Beautiful terminal overview of any Node.js project.
 *
 * Usage:
 *   node --import tsx examples/project-dashboard/index.tsx [project-path]
 *
 * Features:
 *   - Giant gradient project name (ink-big-text + ink-gradient)
 *   - Loading spinner (ink-spinner)
 *   - File type distribution with Unicode bar charts
 *   - Project health checks (README, tests, CI, TS, linter, etc.)
 *   - Dependency browser with prod/dev split
 *   - Script viewer with syntax-highlighted commands
 *   - Directory size breakdown
 *   - TODO/FIXME counter
 */

import React from 'react';
import { render } from 'ink';
import { PanelStack } from '../../src/index.js';
import type { PanelConfig } from '../../src/index.js';
import { ProjectDashboardPanel } from './ProjectDashboard.js';
import { resolve } from 'path';

const projectPath = resolve(process.argv[2] || process.cwd());

const rootPanel: PanelConfig = {
  id: 'project-dashboard',
  title: 'Dashboard',
  component: ProjectDashboardPanel as any,
  data: { projectPath },
};

const { unmount } = render(
  <PanelStack
    appName="project-dashboard"
    initialPanel={rootPanel}
    onExit={() => {
      unmount();
      process.exit(0);
    }}
  />,
);
