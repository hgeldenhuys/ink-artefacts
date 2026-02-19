#!/usr/bin/env node --import tsx
/**
 * Hook Editor — Interactive terminal UI for managing Claude Code hooks.
 *
 * Usage:
 *   node --import tsx examples/hook-editor/index.tsx [project-dir]
 *
 * If no project dir is given, uses CWD.
 */

import React from 'react';
import { render } from 'ink';
import { HookExplorer } from './HookExplorer.js';
import { resolve } from 'path';

const projectDir = resolve(process.argv[2] || process.cwd());

const { unmount, waitUntilExit } = render(
  <HookExplorer
    projectDir={projectDir}
    appName="hook-editor"
    onExit={() => {
      unmount();
      process.exit(0);
    }}
  />
);

waitUntilExit().then(() => process.exit(0));
