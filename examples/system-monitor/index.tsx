#!/usr/bin/env node --import tsx
/**
 * System Monitor — Real-time system dashboard.
 *
 * Usage:
 *   node --import tsx examples/system-monitor/index.tsx
 */

import React from 'react';
import { render } from 'ink';
import { SystemMonitor } from './SystemMonitor.js';

const { waitUntilExit } = render(<SystemMonitor />);
waitUntilExit().then(() => process.exit(0));
