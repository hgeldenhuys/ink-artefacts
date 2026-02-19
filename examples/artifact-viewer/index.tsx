import React from 'react';
import { render } from 'ink';
import { join } from 'path';
import { homedir } from 'os';
import { ArtifactWorkspace } from './ArtifactWorkspace.js';

const artifactsDir = process.argv[2] || join(homedir(), '.claude', 'artifacts');

const { unmount } = render(
  <ArtifactWorkspace
    artifactsDir={artifactsDir}
    appName="artifact-viewer"
    onExit={() => {
      unmount();
      process.exit(0);
    }}
  />,
);
