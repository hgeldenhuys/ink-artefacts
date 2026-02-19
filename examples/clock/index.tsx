import React from 'react';
import { render } from 'ink';
import { PanelStack } from '../../src/index.js';
import type { PanelConfig } from '../../src/index.js';
import { ClockPanel } from './ClockPanel.js';

const rootPanel: PanelConfig = {
  id: 'clock',
  title: 'Clock',
  component: ClockPanel as any,
  data: { title: 'Digital Clock' },
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
