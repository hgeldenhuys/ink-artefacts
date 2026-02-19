import { useEffect, useRef, useCallback } from 'react';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { ClaudeStateFile, PanelConfig } from '../types.js';

export function useStateFile(
  appName: string,
  stack: PanelConfig[],
  filePath: string,
  enabled: boolean,
  debounceMs: number,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const writeState = useCallback(() => {
    if (!enabled || stack.length === 0) return;

    const activePanel = stack[stack.length - 1]!;
    const stateData: ClaudeStateFile = {
      app: appName,
      timestamp: new Date().toISOString(),
      breadcrumb: stack.map(p => p.title),
      activePanel: {
        id: activePanel.id,
        title: activePanel.title,
        state: activePanel.state ?? {},
      },
      history: stack.map(p => ({
        id: p.id,
        title: p.title,
        state: p.state,
      })),
    };

    try {
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, JSON.stringify(stateData, null, 2) + '\n');
    } catch {
      // Silently fail -- don't break the TUI if state file can't be written
    }
  }, [appName, stack, filePath, enabled]);

  useEffect(() => {
    if (!enabled) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(writeState, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [writeState, debounceMs, enabled]);

  // Write immediately on unmount (cleanup)
  useEffect(() => {
    return () => {
      if (enabled) {
        try {
          mkdirSync(dirname(filePath), { recursive: true });
          writeFileSync(filePath, JSON.stringify({
            app: appName,
            timestamp: new Date().toISOString(),
            breadcrumb: [],
            activePanel: null,
            history: [],
            status: 'closed',
          }, null, 2) + '\n');
        } catch {
          // ignore
        }
      }
    };
  }, []);
}
