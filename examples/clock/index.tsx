import React from 'react';
import { render } from 'ink';
import { PanelStack } from '../../src/index.js';
import type { PanelConfig } from '../../src/index.js';
import { ClockPanel } from './ClockPanel.js';

// Parse --exec "command" from CLI args
let execCmd: string | undefined;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--exec' && i + 1 < args.length) {
    execCmd = args[i + 1];
    break;
  }
}

const rootPanel: PanelConfig = {
  id: 'clock',
  title: 'Clock',
  component: ClockPanel as any,
  data: { title: 'Digital Clock', onTimerEnd: execCmd },
  state: { type: 'clock' },
};

const { unmount } = render(
  <PanelStack
    appName="clock"
    initialPanel={rootPanel}
    onExit={() => {
      unmount();
      process.exit(0);
    }}
  />,
);
