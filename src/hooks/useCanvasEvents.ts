import { useCallback, useRef } from 'react';
import { appendFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

/**
 * Schema for a single canvas interaction event (one JSONL line).
 */
export interface CanvasEvent {
  /** ISO 8601 timestamp */
  ts: string;
  /** Claude session ID */
  sid: string;
  /** Canvas name, e.g. "artifact-viewer" */
  canvas: string;
  /** Panel name, e.g. "files" */
  panel: string;
  /** Action type: navigate | select | push | pop | tab_switch | bookmark | scroll */
  action: string;
  /** Action-specific payload */
  target: Record<string, unknown>;
  /** Optional metadata */
  meta?: Record<string, unknown>;
}

/** Path to the JSONL event log file. */
export const CANVAS_EVENTS_PATH = join(homedir(), '.claude', 'canvas-events.jsonl');

/** Path to the dashboard meta file that contains the session ID. */
const DASHBOARD_META_PATH = join(homedir(), '.claude', 'dashboard-meta.json');

/** Cached session ID -- read once from disk, then reused. */
let cachedSessionId: string | null = null;

/**
 * Read the Claude session ID from ~/.claude/dashboard-meta.json.
 * Caches the result on first successful read. Returns "unknown" if the
 * file is missing or unreadable.
 */
function getSessionId(): string {
  if (cachedSessionId !== null) {
    return cachedSessionId;
  }
  try {
    const raw = readFileSync(DASHBOARD_META_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as { sessionId?: string };
    cachedSessionId = parsed.sessionId ?? 'unknown';
  } catch {
    cachedSessionId = 'unknown';
  }
  return cachedSessionId;
}

/**
 * Ensure the parent directory for the event log exists, then append a
 * single JSONL line. Errors are silently swallowed so the TUI is never
 * interrupted by logging failures.
 */
function appendEvent(event: CanvasEvent): void {
  try {
    mkdirSync(join(homedir(), '.claude'), { recursive: true });
    appendFileSync(CANVAS_EVENTS_PATH, JSON.stringify(event) + '\n');
  } catch {
    // Silently fail -- logging must never break the TUI
  }
}

/**
 * Non-hook utility for logging a canvas event from non-component code
 * (e.g. the ArtifactWorkspace tab switch handler or plain functions).
 *
 * @param canvasName - Name of the canvas, e.g. "artifact-viewer"
 * @param action     - Event action, e.g. "tab_switch"
 * @param panel      - Panel name, e.g. "files"
 * @param target     - Action-specific payload
 * @param meta       - Optional metadata
 */
export function logCanvasEvent(
  canvasName: string,
  action: string,
  panel: string,
  target: Record<string, unknown>,
  meta?: Record<string, unknown>,
): void {
  const event: CanvasEvent = {
    ts: new Date().toISOString(),
    sid: getSessionId(),
    canvas: canvasName,
    panel,
    action,
    target,
  };
  if (meta !== undefined) {
    event.meta = meta;
  }
  appendEvent(event);
}

/** Debounce interval for scroll events (ms). */
const SCROLL_DEBOUNCE_MS = 500;

/**
 * React hook that returns a `log` function for recording canvas
 * interaction events to ~/.claude/canvas-events.jsonl.
 *
 * All actions are written synchronously (fire-and-forget) except for
 * `scroll`, which is debounced to at most once per 500 ms.
 *
 * @param canvasName - Identifier for the canvas, e.g. "artifact-viewer"
 * @returns An object with a `log` function
 *
 * @example
 * ```tsx
 * const { log } = useCanvasEvents('artifact-viewer');
 * log('select', 'files', { file: 'readme.md' });
 * ```
 */
export function useCanvasEvents(canvasName: string): {
  log: (
    action: string,
    panel: string,
    target: Record<string, unknown>,
    meta?: Record<string, unknown>,
  ) => void;
} {
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollTimeRef = useRef<number>(0);

  const log = useCallback(
    (
      action: string,
      panel: string,
      target: Record<string, unknown>,
      meta?: Record<string, unknown>,
    ): void => {
      if (action === 'scroll') {
        const now = Date.now();
        const elapsed = now - lastScrollTimeRef.current;

        if (elapsed >= SCROLL_DEBOUNCE_MS) {
          // Enough time has passed -- log immediately
          lastScrollTimeRef.current = now;
          logCanvasEvent(canvasName, action, panel, target, meta);
        } else {
          // Schedule a trailing write if one isn't already pending
          if (scrollTimerRef.current !== null) {
            clearTimeout(scrollTimerRef.current);
          }
          scrollTimerRef.current = setTimeout(() => {
            lastScrollTimeRef.current = Date.now();
            scrollTimerRef.current = null;
            logCanvasEvent(canvasName, action, panel, target, meta);
          }, SCROLL_DEBOUNCE_MS - elapsed);
        }
        return;
      }

      // Non-scroll actions: write immediately
      logCanvasEvent(canvasName, action, panel, target, meta);
    },
    [canvasName],
  );

  return { log };
}
