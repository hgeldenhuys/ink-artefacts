import type { ReactNode } from 'react';

/**
 * Configuration for a panel in the stack.
 */
export interface PanelConfig<TData = unknown> {
  /** Unique identifier for this panel instance */
  id: string;
  /** Display title shown in the breadcrumb */
  title: string;
  /** The React component to render */
  component: React.ComponentType<PanelProps<TData>>;
  /** Data passed to the panel component */
  data?: TData;
  /** Serializable state written to the Claude state file */
  state?: Record<string, unknown>;
}

/**
 * Props injected into every panel component.
 */
export interface PanelProps<TData = unknown> {
  /** Data passed when this panel was pushed */
  data: TData;
  /** Push a new panel onto the stack */
  push: (panel: PanelConfig) => void;
  /** Pop this panel (go back). Returns false if at root. */
  pop: () => boolean;
  /** Replace the current panel with another */
  replace: (panel: PanelConfig) => void;
  /** Update the serialized state for Claude integration */
  updateState: (state: Record<string, unknown>) => void;
  /** Persisted panel state from previous navigation */
  state?: Record<string, unknown>;
  /** Available width in columns */
  width: number;
  /** Available height in rows (minus breadcrumb) */
  height: number;
}

/**
 * Entry in the navigation history.
 */
export interface BreadcrumbEntry {
  id: string;
  title: string;
}

/**
 * State file written for Claude Code integration.
 */
export interface ClaudeStateFile {
  app: string;
  timestamp: string;
  breadcrumb: string[];
  activePanel: {
    id: string;
    title: string;
    state: Record<string, unknown>;
  };
  history: Array<{
    id: string;
    title: string;
    state?: Record<string, unknown>;
  }>;
}

/**
 * Configuration for the PanelStack component.
 */
export interface PanelStackConfig {
  /** Application name, written to state file */
  appName: string;
  /** The root/initial panel */
  initialPanel: PanelConfig;
  /** Path to write the Claude state file. Defaults to ~/.claude/tui-state.json */
  stateFilePath?: string;
  /** Whether to write state files. Defaults to true. */
  enableStateFile?: boolean;
  /** Debounce interval for state file writes in ms. Defaults to 300. */
  stateFileDebounceMs?: number;
  /** Whether to use fullscreen alternate buffer. Defaults to false (TMUX-friendly). */
  fullscreen?: boolean;
  /** Custom breadcrumb separator. Defaults to ' > ' */
  breadcrumbSeparator?: string;
  /** Callback when the user pops the last panel (exits). */
  onExit?: () => void;
}

/**
 * Column definition for TablePanel.
 */
export interface TableColumn<TRow = Record<string, unknown>> {
  /** Column header text */
  header: string;
  /** Key to access in the row data, or accessor function */
  accessor: keyof TRow | ((row: TRow) => string);
  /** Fixed width in columns. If omitted, auto-sized. */
  width?: number;
  /** Minimum width */
  minWidth?: number;
  /** Maximum width */
  maxWidth?: number;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
}

/**
 * Configuration for a detail field.
 */
export interface DetailField {
  /** Label shown on the left */
  label: string;
  /** Value shown on the right */
  value: string | number | boolean | null | undefined;
  /** Optional color for the value */
  color?: string;
}

/**
 * A single slide in a presentation.
 */
export interface Slide {
  /** Title shown in breadcrumb and footer */
  title: string;
  /** Markdown body rendered via marked + marked-terminal */
  body: string;
}

/**
 * Configuration for a form field.
 */
export interface FormField {
  /** Field key */
  key: string;
  /** Display label */
  label: string;
  /** Field type */
  type: 'text' | 'select' | 'toggle';
  /** Current value */
  value: string | boolean;
  /** Options for select type */
  options?: Array<{ label: string; value: string }>;
}
