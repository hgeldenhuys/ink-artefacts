import { useState, useCallback, useRef } from 'react';
import type { PanelConfig } from '../types.js';

export function usePanelNavigation(initialPanel: PanelConfig) {
  const [stack, setStack] = useState<PanelConfig[]>([initialPanel]);
  const [forwardStack, setForwardStack] = useState<PanelConfig[]>([]);
  // Refs mirror state synchronously
  const stackRef = useRef<PanelConfig[]>([initialPanel]);
  const forwardRef = useRef<PanelConfig[]>([]);

  const push = useCallback((panel: PanelConfig) => {
    // New branch — clear forward history
    forwardRef.current = [];
    setForwardStack([]);
    const next = [...stackRef.current, panel];
    stackRef.current = next;
    setStack(next);
  }, []);

  const pop = useCallback((): boolean => {
    if (stackRef.current.length <= 1) return false;
    const next = stackRef.current.slice(0, -1);
    stackRef.current = next;
    setStack(next);
    // Escape clears forward history
    forwardRef.current = [];
    setForwardStack([]);
    return true;
  }, []);

  // Go back but preserve forward history ([ key)
  const goBack = useCallback((): boolean => {
    if (stackRef.current.length <= 1) return false;
    const popped = stackRef.current[stackRef.current.length - 1]!;
    const newForward = [popped, ...forwardRef.current];
    forwardRef.current = newForward;
    setForwardStack(newForward);
    const next = stackRef.current.slice(0, -1);
    stackRef.current = next;
    setStack(next);
    return true;
  }, []);

  // Go forward through history (] key)
  const goForward = useCallback((): boolean => {
    if (forwardRef.current.length === 0) return false;
    const next = forwardRef.current[0]!;
    const newForward = forwardRef.current.slice(1);
    forwardRef.current = newForward;
    setForwardStack(newForward);
    const updated = [...stackRef.current, next];
    stackRef.current = updated;
    setStack(updated);
    return true;
  }, []);

  const replace = useCallback((panel: PanelConfig) => {
    forwardRef.current = [];
    setForwardStack([]);
    const prev = stackRef.current;
    const next = prev.length === 0 ? [panel] : [...prev.slice(0, -1), panel];
    stackRef.current = next;
    setStack(next);
  }, []);

  const updateState = useCallback((state: Record<string, unknown>) => {
    const prev = stackRef.current;
    if (prev.length === 0) return;
    const updated = [...prev];
    const last = { ...updated[updated.length - 1]! };
    last.state = { ...last.state, ...state };
    updated[updated.length - 1] = last;
    stackRef.current = updated;
    setStack(updated);
  }, []);

  const activePanel = stack[stack.length - 1]!;
  const breadcrumbs = stack.map(p => ({ id: p.id, title: p.title }));
  const forwardBreadcrumbs = forwardStack.map(p => ({ id: p.id, title: p.title }));
  const canGoForward = forwardStack.length > 0;
  const canGoBack = stack.length > 1;

  return {
    stack, activePanel, breadcrumbs, forwardBreadcrumbs,
    push, pop, replace, updateState,
    goBack, goForward, canGoBack, canGoForward,
  };
}
