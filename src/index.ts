// Core
export { PanelStack } from './components/PanelStack.js';
export { Breadcrumb } from './components/Breadcrumb.js';

// Built-in panels
export { TablePanel } from './components/TablePanel.js';
export { DetailPanel } from './components/DetailPanel.js';
export { ListPanel } from './components/ListPanel.js';

// Hooks
export { usePanelNavigation } from './hooks/usePanelNavigation.js';
export { useStateFile } from './hooks/useStateFile.js';
export { useInputLock, InputLockContext } from './hooks/useInputLock.js';

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
} from './types.js';
