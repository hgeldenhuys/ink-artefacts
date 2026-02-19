import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { Breadcrumb } from './Breadcrumb.js';
import { usePanelNavigation } from '../hooks/usePanelNavigation.js';
import { useStateFile } from '../hooks/useStateFile.js';
import { InputLockContext, createInputLock } from '../hooks/useInputLock.js';
import { homedir } from 'os';
import { join } from 'path';
import type { PanelStackConfig } from '../types.js';

export function PanelStack({
  appName,
  initialPanel,
  stateFilePath,
  enableStateFile = true,
  stateFileDebounceMs = 300,
  onExit,
}: PanelStackConfig) {
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState({
    width: stdout.columns || 80,
    height: stdout.rows || 24,
  });

  const inputLock = useMemo(() => createInputLock(), []);

  // Track terminal resize
  useEffect(() => {
    const onResize = () => {
      setDimensions({
        width: stdout.columns || 80,
        height: stdout.rows || 24,
      });
    };
    stdout.on('resize', onResize);
    return () => { stdout.off('resize', onResize); };
  }, [stdout]);

  const {
    stack, activePanel, breadcrumbs, forwardBreadcrumbs,
    push, pop, replace, updateState,
    goBack, goForward, canGoBack, canGoForward,
  } = usePanelNavigation(initialPanel);

  const resolvedPath = stateFilePath ?? join(homedir(), '.claude', 'tui-state.json');
  useStateFile(appName, stack, resolvedPath, enableStateFile, stateFileDebounceMs);

  // Global key handler — respects input lock from child panels
  useInput((input, key) => {
    if (inputLock.isLocked()) return;

    if (key.escape) {
      const didPop = pop();
      if (!didPop && onExit) {
        onExit();
      }
    }
    // [ = go back (preserves forward history)
    if (input === '[') {
      goBack();
    }
    // ] = go forward (re-enter previous panel)
    if (input === ']') {
      goForward();
    }
    // 'q' at root level exits the app
    if (input === 'q' && stack.length === 1 && onExit) {
      onExit();
    }
  });

  const Component = activePanel.component;
  const panelHeight = dimensions.height - 1; // 1 line for breadcrumb
  const panelWidth = dimensions.width;

  return (
    <InputLockContext.Provider value={inputLock}>
      <Box flexDirection="column" width={dimensions.width} height={dimensions.height}>
        <Box flexDirection="column" flexGrow={1} width={panelWidth} height={panelHeight}>
          <Component
            data={activePanel.data}
            push={push}
            pop={pop}
            replace={replace}
            updateState={updateState}
            state={activePanel.state}
            width={panelWidth}
            height={panelHeight}
          />
        </Box>
        <Breadcrumb
          entries={breadcrumbs}
          forwardEntries={forwardBreadcrumbs}
          width={panelWidth}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
        />
      </Box>
    </InputLockContext.Provider>
  );
}
