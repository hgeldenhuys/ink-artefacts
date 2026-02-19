#!/usr/bin/env node --import tsx
/**
 * SWARM Explorer — Interactive terminal UI for browsing recursive-ai projects.
 *
 * Usage:
 *   node --import tsx examples/swarm-explorer/index.tsx [path-to-.swarm-dir]
 *
 * If no path is given, uses the sample data in ./sample-swarm/
 */

import React from 'react';
import { render } from 'ink';
import { SwarmExplorer } from './SwarmExplorer.js';
import { join, resolve } from 'path';

const swarmDir = process.argv[2]
  ? resolve(process.argv[2])
  : join(import.meta.dirname, 'sample-swarm');

const { unmount, waitUntilExit } = render(
  <SwarmExplorer
    swarmDir={swarmDir}
    appName="swarm-explorer"
    onExit={() => {
      unmount();
      process.exit(0);
    }}
  />
);

waitUntilExit().then(() => process.exit(0));
