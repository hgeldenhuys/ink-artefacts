/**
 * Neon Clock — A glowing gradient clock with retro neon aesthetic.
 *
 * Usage:
 *   node --import tsx examples/neon-clock/index.tsx
 */

import React from 'react';
import { render } from 'ink';
import { PanelStack } from '../../src/index.js';
import type { PanelConfig } from '../../src/index.js';
import { NeonClockPanel } from './NeonClockPanel.js';

const rootPanel: PanelConfig = {
  id: 'neon-clock',
  title: 'Neon Clock',
  component: NeonClockPanel as any,
  data: { title: 'Neon Clock' },
  state: { type: 'neon-clock' },
};

const { unmount } = render(
  <PanelStack
    appName="neon-clock"
    initialPanel={rootPanel}
    onExit={() => {
      unmount();
      process.exit(0);
    }}
  />,
);
