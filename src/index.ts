// Core
export { PanelStack } from './components/PanelStack.js';
export { Breadcrumb } from './components/Breadcrumb.js';

// Built-in panels
export { TablePanel } from './components/TablePanel.js';
export { DetailPanel } from './components/DetailPanel.js';
export { ListPanel } from './components/ListPanel.js';
export { SlideViewer } from './components/SlideViewer.js';
export type { SlideViewerProps } from './components/SlideViewer.js';

// Hooks
export { usePanelNavigation } from './hooks/usePanelNavigation.js';
export { useStateFile } from './hooks/useStateFile.js';
export { useInputLock, InputLockContext } from './hooks/useInputLock.js';
export { useCanvasEvents, logCanvasEvent, CANVAS_EVENTS_PATH } from './hooks/useCanvasEvents.js';

// Utilities
export { parseExecArg, runExec } from './utils/exec.js';

// Types
export type {
  PanelConfig,
  PanelProps,
  PanelStackConfig,
  BreadcrumbEntry,
  ClaudeStateFile,
  TableColumn,
  DetailField,
  FormField,
  Slide,
} from './types.js';
export type { CanvasEvent } from './hooks/useCanvasEvents.js';
