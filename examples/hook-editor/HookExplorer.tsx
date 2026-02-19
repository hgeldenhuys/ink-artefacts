/**
 * HookExplorer — All panel components for browsing and editing Claude Code hooks.
 *
 * Navigation:
 *   HookDashboard → EventHooksList → MatcherGroupDetail → HookHandlerEditor
 *                                   → NewHookWizard (step-by-step creation)
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { PanelStack } from '../../src/index.js';
import type { PanelConfig, PanelProps } from '../../src/index.js';
import { useInputLock } from '../../src/hooks/useInputLock.js';
import {
  loadAllHooks, buildEventSummaries,
  addMatcherGroup, updateHookHandler, updateMatcherGroupMatcher,
  addHandlerToGroup, deleteHookHandler, deleteMatcherGroup,
  ALL_EVENTS, EVENT_CATEGORIES, SCOPE_COLORS, SCOPE_LABELS,
  type HookScope, type HookEventType, type HookHandlerType,
  type HookHandler, type ScopedMatcherGroup, type EventSummary,
} from './hook-data.js';

// ─── HookDashboard Panel ──────────────────────────────────

interface DashboardData {
  projectDir: string;
}

function HookDashboardPanel(props: PanelProps<DashboardData>) {
  const { data, push, width, height } = props;

  const allHooks = loadAllHooks(data.projectDir);
  const summaries = buildEventSummaries(allHooks);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const totalHooks = summaries.reduce((sum, s) => sum + s.totalCount, 0);

  // Build ordered summaries following category display order
  const orderedSummaries: EventSummary[] = [];
  for (const [, events] of Object.entries(EVENT_CATEGORIES)) {
    for (const event of events) {
      const summary = summaries.find(s => s.event === event);
      if (summary) orderedSummaries.push(summary);
    }
  }

  const headerLines = 4;
  const footerLines = 1;
  const visibleItems = Math.max(1, height - headerLines - footerLines);

  useEffect(() => {
    if (selectedIndex < scrollOffset) setScrollOffset(selectedIndex);
    else if (selectedIndex >= scrollOffset + visibleItems) setScrollOffset(selectedIndex - visibleItems + 1);
  }, [selectedIndex, scrollOffset, visibleItems]);

  useInput((input: string, key: any) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(orderedSummaries.length - 1, prev + 1));
    } else if (key.return) {
      const summary = orderedSummaries[selectedIndex];
      if (summary) {
        push(makeEventHooksListPanel(data.projectDir, summary.event));
      }
    } else if (input === 'n') {
      push(makeNewHookWizardPanel(data.projectDir));
    } else if (input === 'g') {
      setSelectedIndex(0);
    } else if (input === 'G') {
      setSelectedIndex(orderedSummaries.length - 1);
    }
  });

  // Build display rows with category headers
  type DisplayRow = { kind: 'category'; name: string } | { kind: 'event'; summary: EventSummary; eventIndex: number };
  const displayRows: DisplayRow[] = [];

  let eventIdx = 0;
  for (const [category, events] of Object.entries(EVENT_CATEGORIES)) {
    const catEvents = events.filter(e => summaries.find(s => s.event === e));
    if (catEvents.length === 0) continue;
    displayRows.push({ kind: 'category', name: category });
    for (const event of catEvents) {
      const summary = summaries.find(s => s.event === event)!;
      displayRows.push({ kind: 'event', summary, eventIndex: eventIdx });
      eventIdx++;
    }
  }

  const windowRows = displayRows.slice(scrollOffset, scrollOffset + visibleItems);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box justifyContent="center" width={width}>
        <Text bold color="cyan">Hook Editor</Text>
        <Text dimColor> — {totalHooks} hook{totalHooks !== 1 ? 's' : ''} across {summaries.filter(s => s.totalCount > 0).length} events</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      <Box paddingLeft={2}>
        <Text dimColor>{'Event'.padEnd(25)}</Text>
        <Text color="blue"> U </Text>
        <Text color="green"> P </Text>
        <Text color="yellow"> L </Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {windowRows.map((row, windowIdx) => {
        const actualIdx = scrollOffset + windowIdx;

        if (row.kind === 'category') {
          return (
            <Box key={`cat-${row.name}`} paddingLeft={1}>
              <Text dimColor bold>{'── '}{row.name}{' ──'}</Text>
            </Box>
          );
        }

        const { summary, eventIndex } = row;
        const isSelected = eventIndex === selectedIndex;

        return (
          <Box key={summary.event}>
            <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? ' > ' : '   '}</Text>
            <Text bold={isSelected} color={isSelected ? 'cyan' : undefined}>
              {summary.event.padEnd(22)}
            </Text>
            <Text color="blue">{summary.userCount > 0 ? String(summary.userCount).padStart(2) : ' ·'}</Text>
            <Text> </Text>
            <Text color="green">{summary.projectCount > 0 ? String(summary.projectCount).padStart(2) : ' ·'}</Text>
            <Text> </Text>
            <Text color="yellow">{summary.localCount > 0 ? String(summary.localCount).padStart(2) : ' ·'}</Text>
          </Box>
        );
      })}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor> {selectedIndex + 1}/{orderedSummaries.length}</Text>
        <Text dimColor>j/k:move  Enter:drill  n:new hook  q:quit</Text>
      </Box>
    </Box>
  );
}

// ─── EventHooksList Panel ─────────────────────────────────

function makeEventHooksListPanel(projectDir: string, event: HookEventType): PanelConfig {
  return {
    id: `event-${event}`,
    title: event,
    component: EventHooksListPanel as any,
    data: { projectDir, event },
    state: { event },
  };
}

interface EventHooksListData {
  projectDir: string;
  event: HookEventType;
}

function EventHooksListPanel(props: PanelProps<EventHooksListData>) {
  const { data, push, width, height } = props;
  const { projectDir, event } = data;

  const allHooks = loadAllHooks(projectDir);
  const groups = allHooks.filter(h => h.event === event);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(-1);

  const headerLines = 2;
  const footerLines = 1;
  const visibleItems = Math.max(1, height - headerLines - footerLines);

  useEffect(() => {
    if (selectedIndex < scrollOffset) setScrollOffset(selectedIndex);
    else if (selectedIndex >= scrollOffset + visibleItems) setScrollOffset(selectedIndex - visibleItems + 1);
  }, [selectedIndex, scrollOffset, visibleItems]);

  useInput((input: string, key: any) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      setConfirmDelete(-1);
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(groups.length - 1, prev + 1));
      setConfirmDelete(-1);
    } else if (key.return) {
      const group = groups[selectedIndex];
      if (group) {
        push(makeMatcherGroupDetailPanel(projectDir, group));
      }
    } else if (input === 'a') {
      push(makeNewHookWizardPanel(projectDir, event));
    } else if (input === 'd') {
      if (groups.length === 0) return;
      if (confirmDelete === selectedIndex) {
        const group = groups[selectedIndex]!;
        deleteMatcherGroup(projectDir, group.scope, group.event, group.matcherGroupIndex);
        setConfirmDelete(-1);
        setSelectedIndex(prev => Math.max(0, Math.min(prev, groups.length - 2)));
      } else {
        setConfirmDelete(selectedIndex);
      }
    } else if (input === 'g') {
      setSelectedIndex(0);
    } else if (input === 'G') {
      setSelectedIndex(groups.length - 1);
    }
  });

  const windowItems = groups.slice(scrollOffset, scrollOffset + visibleItems);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="cyan">{event}</Text>
        <Text dimColor> ({groups.length} matcher group{groups.length !== 1 ? 's' : ''})</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {groups.length === 0 && (
        <Box paddingLeft={2} marginTop={1}>
          <Text dimColor>No hooks configured for this event.</Text>
        </Box>
      )}

      {windowItems.map((group, windowIdx) => {
        const actualIdx = scrollOffset + windowIdx;
        const isSelected = actualIdx === selectedIndex;
        const isConfirmingDelete = confirmDelete === actualIdx;

        return (
          <Box key={`${group.scope}-${group.matcherGroupIndex}`} flexDirection="column">
            <Box>
              <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? ' > ' : '   '}</Text>
              <Text color={SCOPE_COLORS[group.scope] as any} bold>[{SCOPE_LABELS[group.scope]}]</Text>
              <Text> </Text>
              <Text dimColor>matcher: </Text>
              <Text bold={isSelected} color={isSelected ? 'white' : undefined}>
                {group.matcher || '(all)'}
              </Text>
              <Text dimColor> ({group.hooks.length} handler{group.hooks.length !== 1 ? 's' : ''})</Text>
              {isConfirmingDelete && (
                <Text color="red" bold> press d again to delete</Text>
              )}
            </Box>
            {group.hooks.map((handler, hi) => (
              <Box key={hi} paddingLeft={7}>
                <Text dimColor>
                  {handler.type === 'command' ? '$ ' : handler.type === 'prompt' ? '? ' : '@ '}
                </Text>
                <Text color={isSelected ? 'white' : undefined} dimColor={!isSelected}>
                  {handler.type === 'command'
                    ? truncate(handler.command || '', width - 15)
                    : truncate(handler.prompt || '', width - 15)}
                </Text>
              </Box>
            ))}
          </Box>
        );
      })}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor> {groups.length > 0 ? `${selectedIndex + 1}/${groups.length}` : 'Empty'}</Text>
        <Text dimColor>j/k:move  Enter:detail  a:add  d:delete  Esc:back</Text>
      </Box>
    </Box>
  );
}

// ─── MatcherGroupDetail Panel ─────────────────────────────

function makeMatcherGroupDetailPanel(projectDir: string, group: ScopedMatcherGroup): PanelConfig {
  return {
    id: `group-${group.scope}-${group.event}-${group.matcherGroupIndex}`,
    title: `${group.event} [${SCOPE_LABELS[group.scope]}]`,
    component: MatcherGroupDetailPanel as any,
    data: { projectDir, group },
    state: { scope: group.scope, event: group.event, mgIndex: group.matcherGroupIndex },
  };
}

interface MatcherGroupDetailData {
  projectDir: string;
  group: ScopedMatcherGroup;
}

function MatcherGroupDetailPanel(props: PanelProps<MatcherGroupDetailData>) {
  const { data, push, replace, width, height } = props;
  const { projectDir } = data;
  const inputLock = useInputLock();

  // Reload from disk to get fresh data
  const allHooks = loadAllHooks(projectDir);
  const freshGroup = allHooks.find(
    h => h.scope === data.group.scope
      && h.event === data.group.event
      && h.matcherGroupIndex === data.group.matcherGroupIndex
  ) || data.group;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(-1);
  const [editingMatcher, setEditingMatcher] = useState(false);
  const [matcherBuffer, setMatcherBuffer] = useState(freshGroup.matcher || '');

  // 0 = matcher row, 1..N = handler rows
  const totalRows = 1 + freshGroup.hooks.length;

  useEffect(() => {
    if (editingMatcher) {
      inputLock.lock();
    } else {
      inputLock.unlock();
    }
    return () => { inputLock.unlock(); };
  }, [editingMatcher]);

  useInput((input: string, key: any) => {
    if (editingMatcher) {
      if (key.return) {
        updateMatcherGroupMatcher(
          projectDir, freshGroup.scope, freshGroup.event,
          freshGroup.matcherGroupIndex, matcherBuffer || undefined,
        );
        setEditingMatcher(false);
        return;
      }
      if (key.escape) {
        setMatcherBuffer(freshGroup.matcher || '');
        setEditingMatcher(false);
        return;
      }
      if (key.backspace || key.delete) {
        setMatcherBuffer(prev => prev.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setMatcherBuffer(prev => prev + input);
        return;
      }
      return;
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
      setConfirmDelete(-1);
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(totalRows - 1, prev + 1));
      setConfirmDelete(-1);
    } else if (input === 'e' || key.return) {
      if (selectedIndex === 0) {
        setMatcherBuffer(freshGroup.matcher || '');
        setEditingMatcher(true);
      } else {
        const handlerIndex = selectedIndex - 1;
        const handler = freshGroup.hooks[handlerIndex];
        if (handler) {
          push(makeHookHandlerEditorPanel(projectDir, freshGroup, handlerIndex, handler));
        }
      }
    } else if (input === 'a') {
      addHandlerToGroup(
        projectDir, freshGroup.scope, freshGroup.event,
        freshGroup.matcherGroupIndex,
        { type: 'command', command: 'echo "new hook"' },
      );
      // Refresh by replacing panel
      replace(makeMatcherGroupDetailPanel(projectDir, freshGroup));
    } else if (input === 'd') {
      if (selectedIndex === 0) return; // Can't delete matcher row
      const handlerIndex = selectedIndex - 1;
      if (confirmDelete === selectedIndex) {
        deleteHookHandler(
          projectDir, freshGroup.scope, freshGroup.event,
          freshGroup.matcherGroupIndex, handlerIndex,
        );
        setConfirmDelete(-1);
        replace(makeMatcherGroupDetailPanel(projectDir, data.group));
      } else {
        setConfirmDelete(selectedIndex);
      }
    }
  });

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="cyan">{freshGroup.event}</Text>
        <Text> </Text>
        <Text color={SCOPE_COLORS[freshGroup.scope] as any} bold>[{SCOPE_LABELS[freshGroup.scope]}]</Text>
        <Text dimColor> group #{freshGroup.matcherGroupIndex}</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {/* Matcher row */}
      <Box>
        <Text color={selectedIndex === 0 ? 'cyan' : undefined}>
          {selectedIndex === 0 ? (editingMatcher ? ' ✎ ' : ' > ') : '   '}
        </Text>
        <Text dimColor>Matcher: </Text>
        {editingMatcher ? (
          <Text color="white" bold>
            {matcherBuffer}<Text color="cyan" inverse> </Text>
          </Text>
        ) : (
          <Text bold={selectedIndex === 0} color={selectedIndex === 0 ? 'white' : undefined}>
            {freshGroup.matcher || '(all tools)'}
          </Text>
        )}
      </Box>

      <Box marginTop={1} paddingLeft={2}>
        <Text bold>Handlers ({freshGroup.hooks.length})</Text>
      </Box>

      {freshGroup.hooks.map((handler, hi) => {
        const rowIdx = hi + 1;
        const isSelected = rowIdx === selectedIndex;
        const isConfirmingDelete = confirmDelete === rowIdx;

        return (
          <Box key={hi} flexDirection="column">
            <Box>
              <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? ' > ' : '   '}</Text>
              <Text color={handler.type === 'command' ? 'green' : handler.type === 'prompt' ? 'magenta' : 'blue'} bold>
                [{handler.type}]
              </Text>
              <Text> </Text>
              <Text bold={isSelected} color={isSelected ? 'white' : undefined}>
                {handler.type === 'command'
                  ? truncate(handler.command || '', width - 20)
                  : truncate(handler.prompt || '', width - 20)}
              </Text>
              {isConfirmingDelete && (
                <Text color="red" bold> press d to confirm</Text>
              )}
            </Box>
            {handler.type === 'command' && (
              <Box paddingLeft={7}>
                {handler.timeout !== undefined && <Text dimColor>timeout:{handler.timeout}ms </Text>}
                {handler.async && <Text dimColor>async </Text>}
              </Box>
            )}
            {(handler.type === 'prompt' || handler.type === 'agent') && handler.model && (
              <Box paddingLeft={7}>
                <Text dimColor>model: {handler.model}</Text>
              </Box>
            )}
          </Box>
        );
      })}

      {freshGroup.hooks.length === 0 && (
        <Box paddingLeft={4}>
          <Text dimColor>No handlers. Press 'a' to add one.</Text>
        </Box>
      )}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor> {selectedIndex + 1}/{totalRows}</Text>
        <Text dimColor>
          {editingMatcher
            ? 'Type matcher  Enter:save  Esc:cancel'
            : 'j/k:move  e/Enter:edit  a:add handler  d:delete  Esc:back'}
        </Text>
      </Box>
    </Box>
  );
}

// ─── HookHandlerEditor Panel ──────────────────────────────

function makeHookHandlerEditorPanel(
  projectDir: string,
  group: ScopedMatcherGroup,
  handlerIndex: number,
  handler: HookHandler,
): PanelConfig {
  return {
    id: `handler-${group.scope}-${group.event}-${group.matcherGroupIndex}-${handlerIndex}`,
    title: `Handler #${handlerIndex}`,
    component: HookHandlerEditorPanel as any,
    data: { projectDir, group, handlerIndex, handler },
    state: { handlerIndex },
  };
}

interface HookHandlerEditorData {
  projectDir: string;
  group: ScopedMatcherGroup;
  handlerIndex: number;
  handler: HookHandler;
}

interface EditorField {
  key: string;
  label: string;
  fieldType: 'string' | 'boolean' | 'number' | 'enum';
  value: unknown;
  enumOptions?: string[];
  description?: string;
}

function buildEditorFields(handler: HookHandler): EditorField[] {
  const fields: EditorField[] = [
    {
      key: 'type',
      label: 'Type',
      fieldType: 'enum',
      value: handler.type,
      enumOptions: ['command', 'prompt', 'agent'],
      description: 'Hook handler type',
    },
  ];

  if (handler.type === 'command') {
    fields.push({
      key: 'command',
      label: 'Command',
      fieldType: 'string',
      value: handler.command || '',
      description: 'Shell command to execute',
    });
    fields.push({
      key: 'timeout',
      label: 'Timeout (ms)',
      fieldType: 'number',
      value: handler.timeout ?? '',
      description: 'Max execution time in milliseconds (empty for default)',
    });
    fields.push({
      key: 'async',
      label: 'Async',
      fieldType: 'boolean',
      value: handler.async ?? false,
      description: 'Run without blocking Claude',
    });
  } else {
    fields.push({
      key: 'prompt',
      label: 'Prompt',
      fieldType: 'string',
      value: handler.prompt || '',
      description: handler.type === 'prompt' ? 'Prompt text for Claude' : 'Agent instruction',
    });
    fields.push({
      key: 'model',
      label: 'Model',
      fieldType: 'string',
      value: handler.model || '',
      description: 'Model to use (empty for default)',
    });
  }

  return fields;
}

function HookHandlerEditorPanel(props: PanelProps<HookHandlerEditorData>) {
  const { data, pop, width, height } = props;
  const { projectDir, group, handlerIndex } = data;
  const inputLock = useInputLock();

  const [handler, setHandler] = useState<HookHandler>({ ...data.handler });
  const [fields, setFields] = useState<EditorField[]>(() => buildEditorFields(handler));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editBuffer, setEditBuffer] = useState('');
  const [modified, setModified] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  // Rebuild fields when type changes
  useEffect(() => {
    setFields(buildEditorFields(handler));
  }, [handler.type]);

  useEffect(() => {
    if (editMode) {
      inputLock.lock();
    } else {
      inputLock.unlock();
    }
    return () => { inputLock.unlock(); };
  }, [editMode]);

  useEffect(() => {
    if (savedMessage) {
      const timer = setTimeout(() => setSavedMessage(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [savedMessage]);

  // Clamp selection when fields change
  useEffect(() => {
    if (selectedIndex >= fields.length) {
      setSelectedIndex(Math.max(0, fields.length - 1));
    }
  }, [fields.length]);

  const applyChange = (fieldKey: string, newValue: unknown) => {
    const newHandler = { ...handler };

    if (fieldKey === 'type') {
      newHandler.type = newValue as HookHandlerType;
      // Clear irrelevant fields
      if (newHandler.type === 'command') {
        delete newHandler.prompt;
        delete newHandler.model;
        if (!newHandler.command) newHandler.command = '';
      } else {
        delete newHandler.command;
        delete newHandler.timeout;
        delete newHandler.async;
        if (!newHandler.prompt) newHandler.prompt = '';
      }
    } else if (fieldKey === 'command') {
      newHandler.command = String(newValue);
    } else if (fieldKey === 'prompt') {
      newHandler.prompt = String(newValue);
    } else if (fieldKey === 'model') {
      newHandler.model = String(newValue) || undefined;
    } else if (fieldKey === 'timeout') {
      const num = parseInt(String(newValue), 10);
      newHandler.timeout = isNaN(num) ? undefined : num;
    } else if (fieldKey === 'async') {
      newHandler.async = Boolean(newValue);
    }

    setHandler(newHandler);
    setModified(true);
  };

  useInput((input: string, key: any) => {
    // Edit mode
    if (editMode) {
      if (key.return) {
        const field = fields[selectedIndex];
        if (field) {
          if (field.fieldType === 'number') {
            applyChange(field.key, editBuffer);
          } else {
            applyChange(field.key, editBuffer);
          }
        }
        setEditMode(false);
        return;
      }
      if (key.escape) {
        setEditMode(false);
        return;
      }
      if (key.backspace || key.delete) {
        setEditBuffer(prev => prev.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        const field = fields[selectedIndex];
        if (field?.fieldType === 'number') {
          if (/[\d]/.test(input)) {
            setEditBuffer(prev => prev + input);
          }
        } else {
          setEditBuffer(prev => prev + input);
        }
        return;
      }
      return;
    }

    // Normal mode
    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(fields.length - 1, prev + 1));
    } else if (input === ' ' || key.return) {
      const field = fields[selectedIndex];
      if (!field) return;

      if (field.fieldType === 'boolean') {
        applyChange(field.key, !field.value);
      } else if (field.fieldType === 'enum' && field.enumOptions) {
        const currentIdx = field.enumOptions.indexOf(String(field.value));
        const nextIdx = (currentIdx + 1) % field.enumOptions.length;
        applyChange(field.key, field.enumOptions[nextIdx]);
      } else {
        setEditBuffer(String(field.value ?? ''));
        setEditMode(true);
      }
    } else if (key.leftArrow || key.rightArrow) {
      const field = fields[selectedIndex];
      if (field?.fieldType === 'enum' && field.enumOptions) {
        const currentIdx = field.enumOptions.indexOf(String(field.value));
        const dir = key.leftArrow ? -1 : 1;
        const nextIdx = (currentIdx + dir + field.enumOptions.length) % field.enumOptions.length;
        applyChange(field.key, field.enumOptions[nextIdx]);
      }
    } else if (input === 's') {
      // Build clean handler for saving
      const saveHandler: Partial<HookHandler> = { type: handler.type };
      if (handler.type === 'command') {
        saveHandler.command = handler.command;
        if (handler.timeout !== undefined) saveHandler.timeout = handler.timeout;
        if (handler.async) saveHandler.async = handler.async;
      } else {
        saveHandler.prompt = handler.prompt;
        if (handler.model) saveHandler.model = handler.model;
      }

      updateHookHandler(
        projectDir, group.scope, group.event,
        group.matcherGroupIndex, handlerIndex,
        saveHandler as HookHandler,
      );
      setModified(false);
      setSavedMessage('Saved!');
    } else if (input === 'u') {
      setHandler({ ...data.handler });
      setModified(false);
    }
  });

  // Render
  const maxKeyLen = Math.max(...fields.map(f => f.label.length)) + 2;
  const currentField = fields[selectedIndex];

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box justifyContent="space-between" width={width}>
        <Box>
          <Text bold color="cyan">Handler #{handlerIndex}</Text>
          <Text> </Text>
          <Text color={SCOPE_COLORS[group.scope] as any} bold>[{SCOPE_LABELS[group.scope]}]</Text>
          {modified && <Text color="yellow"> [modified]</Text>}
          {savedMessage && <Text color="green"> {savedMessage}</Text>}
        </Box>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {fields.map((field, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={field.key}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? (editMode ? ' ✎ ' : ' > ') : '   '}
            </Text>
            <Text bold={isSelected} dimColor={!isSelected}>
              {field.label.padEnd(maxKeyLen)}
            </Text>
            {renderFieldValue(field, isSelected, editMode && isSelected, editBuffer, width - maxKeyLen - 6)}
          </Box>
        );
      })}

      <Box flexGrow={1} />

      {/* Description */}
      <Box width={width}>
        <Text dimColor italic>
          {currentField?.description ? `  ${currentField.description}` : ''}
        </Text>
      </Box>

      <Box justifyContent="space-between" width={width}>
        <Text dimColor> {selectedIndex + 1}/{fields.length}{modified ? ' ●' : ''}</Text>
        <Text dimColor>
          {editMode
            ? 'Type to edit  Enter:confirm  Esc:cancel'
            : 'j/k:move  Enter/Space:edit  s:save  u:undo  Esc:back'}
        </Text>
      </Box>
    </Box>
  );
}

// ─── NewHookWizard Panel ──────────────────────────────────

function makeNewHookWizardPanel(projectDir: string, preSelectedEvent?: HookEventType): PanelConfig {
  return {
    id: 'new-hook-wizard',
    title: 'New Hook',
    component: NewHookWizardPanel as any,
    data: { projectDir, preSelectedEvent },
    state: { wizard: true },
  };
}

type WizardStep = 'event' | 'scope' | 'matcher' | 'type' | 'value' | 'confirm';

interface NewHookWizardData {
  projectDir: string;
  preSelectedEvent?: HookEventType;
}

function NewHookWizardPanel(props: PanelProps<NewHookWizardData>) {
  const { data, pop, width, height } = props;
  const { projectDir, preSelectedEvent } = data;
  const inputLock = useInputLock();

  const [step, setStep] = useState<WizardStep>(preSelectedEvent ? 'scope' : 'event');
  const [event, setEvent] = useState<HookEventType>(preSelectedEvent || ALL_EVENTS[0]!);
  const [scope, setScope] = useState<HookScope>('project');
  const [matcher, setMatcher] = useState('');
  const [handlerType, setHandlerType] = useState<HookHandlerType>('command');
  const [value, setValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [editingText, setEditingText] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const scopes: HookScope[] = ['user', 'project', 'local'];
  const handlerTypes: HookHandlerType[] = ['command', 'prompt', 'agent'];

  useEffect(() => {
    if (editingText) {
      inputLock.lock();
    } else {
      inputLock.unlock();
    }
    return () => { inputLock.unlock(); };
  }, [editingText]);

  useEffect(() => {
    if (savedMessage) {
      const timer = setTimeout(() => setSavedMessage(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [savedMessage]);

  const goBack = () => {
    if (step === 'event') { pop(); return; }
    if (step === 'scope') { if (preSelectedEvent) { pop(); return; } setStep('event'); setSelectedIndex(0); return; }
    if (step === 'matcher') { setStep('scope'); setSelectedIndex(0); return; }
    if (step === 'type') { setStep('matcher'); setSelectedIndex(0); return; }
    if (step === 'value') { setStep('type'); setSelectedIndex(0); return; }
    if (step === 'confirm') { setStep('value'); return; }
  };

  useInput((input: string, key: any) => {
    // Text editing mode for matcher and value
    if (editingText) {
      if (key.return) {
        setEditingText(false);
        if (step === 'matcher') {
          setStep('type');
          setSelectedIndex(0);
        } else if (step === 'value') {
          setStep('confirm');
        }
        return;
      }
      if (key.escape) {
        setEditingText(false);
        return;
      }
      if (key.backspace || key.delete) {
        if (step === 'matcher') setMatcher(prev => prev.slice(0, -1));
        else setValue(prev => prev.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        if (step === 'matcher') setMatcher(prev => prev + input);
        else setValue(prev => prev + input);
        return;
      }
      return;
    }

    // Non-editing navigation
    if (key.escape) {
      goBack();
      return;
    }

    if (step === 'event') {
      if (key.upArrow || input === 'k') {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow || input === 'j') {
        setSelectedIndex(prev => Math.min(ALL_EVENTS.length - 1, prev + 1));
      } else if (key.return) {
        setEvent(ALL_EVENTS[selectedIndex]!);
        setStep('scope');
        setSelectedIndex(0);
      }
    } else if (step === 'scope') {
      if (key.upArrow || input === 'k') {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow || input === 'j') {
        setSelectedIndex(prev => Math.min(scopes.length - 1, prev + 1));
      } else if (key.return) {
        setScope(scopes[selectedIndex]!);
        setStep('matcher');
        setMatcher('');
      }
    } else if (step === 'matcher') {
      setEditingText(true);
    } else if (step === 'type') {
      if (key.upArrow || input === 'k') {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (key.downArrow || input === 'j') {
        setSelectedIndex(prev => Math.min(handlerTypes.length - 1, prev + 1));
      } else if (key.return) {
        setHandlerType(handlerTypes[selectedIndex]!);
        setValue('');
        setStep('value');
      }
    } else if (step === 'value') {
      setEditingText(true);
    } else if (step === 'confirm') {
      if (key.return || input === 'y') {
        const handler: HookHandler = { type: handlerType };
        if (handlerType === 'command') {
          handler.command = value;
        } else {
          handler.prompt = value;
        }
        addMatcherGroup(projectDir, scope, event, matcher || undefined, handler);
        setSavedMessage('Hook created!');
        // Go back after short delay
        setTimeout(() => pop(), 500);
      } else if (input === 'n') {
        goBack();
      }
    }
  });

  // Render based on step
  const stepLabels: Record<WizardStep, string> = {
    event: '1. Event Type',
    scope: '2. Scope',
    matcher: '3. Matcher Pattern',
    type: '4. Handler Type',
    value: '5. Command / Prompt',
    confirm: '6. Confirm',
  };

  const steps: WizardStep[] = ['event', 'scope', 'matcher', 'type', 'value', 'confirm'];
  const stepIdx = steps.indexOf(step);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="cyan">New Hook</Text>
        {savedMessage && <Text color="green"> {savedMessage}</Text>}
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {/* Progress */}
      <Box paddingLeft={2}>
        {steps.map((s, i) => (
          <Box key={s}>
            <Text color={i < stepIdx ? 'green' : i === stepIdx ? 'cyan' : 'gray'}>
              {i < stepIdx ? '●' : i === stepIdx ? '◉' : '○'}
            </Text>
            {i < steps.length - 1 && <Text dimColor>─</Text>}
          </Box>
        ))}
        <Text dimColor> {stepLabels[step]}</Text>
      </Box>

      {/* Summary of prior selections */}
      {stepIdx > 0 && (
        <Box flexDirection="column" paddingLeft={2} marginTop={1}>
          {step !== 'event' && <Text dimColor>Event: <Text color="cyan">{event}</Text></Text>}
          {stepIdx >= 2 && <Text dimColor>Scope: <Text color={SCOPE_COLORS[scope] as any}>{SCOPE_LABELS[scope]}</Text></Text>}
          {stepIdx >= 3 && <Text dimColor>Matcher: <Text color="white">{matcher || '(all)'}</Text></Text>}
          {stepIdx >= 4 && <Text dimColor>Type: <Text color="green">{handlerType}</Text></Text>}
          {stepIdx >= 5 && <Text dimColor>{handlerType === 'command' ? 'Command' : 'Prompt'}: <Text color="white">{truncate(value, width - 20)}</Text></Text>}
        </Box>
      )}

      <Box marginTop={1} />

      {/* Step-specific content */}
      {step === 'event' && (
        <Box flexDirection="column">
          <Box paddingLeft={2}><Text bold>Select event type:</Text></Box>
          {ALL_EVENTS.map((ev, i) => {
            const isSelected = i === selectedIndex;
            return (
              <Box key={ev}>
                <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? ' > ' : '   '}</Text>
                <Text bold={isSelected} color={isSelected ? 'cyan' : undefined}>{ev}</Text>
              </Box>
            );
          })}
        </Box>
      )}

      {step === 'scope' && (
        <Box flexDirection="column">
          <Box paddingLeft={2}><Text bold>Select scope:</Text></Box>
          {scopes.map((s, i) => {
            const isSelected = i === selectedIndex;
            return (
              <Box key={s}>
                <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? ' > ' : '   '}</Text>
                <Text color={SCOPE_COLORS[s] as any} bold={isSelected}>{SCOPE_LABELS[s]}</Text>
                <Text dimColor>
                  {s === 'user' ? ' (~/.claude/settings.json)' :
                   s === 'project' ? ' (.claude/settings.json)' :
                   ' (.claude/settings.local.json)'}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {step === 'matcher' && (
        <Box flexDirection="column">
          <Box paddingLeft={2}><Text bold>Enter matcher pattern (regex, empty for all):</Text></Box>
          <Box paddingLeft={4}>
            <Text color="white" bold>
              {matcher}<Text color="cyan" inverse> </Text>
            </Text>
          </Box>
          <Box paddingLeft={4} marginTop={1}>
            <Text dimColor>Examples: .* (all), Bash|Edit (specific tools), Write (single tool)</Text>
          </Box>
        </Box>
      )}

      {step === 'type' && (
        <Box flexDirection="column">
          <Box paddingLeft={2}><Text bold>Select handler type:</Text></Box>
          {handlerTypes.map((t, i) => {
            const isSelected = i === selectedIndex;
            const desc = t === 'command' ? 'Run a shell command'
              : t === 'prompt' ? 'Send a prompt to Claude'
              : 'Spawn a sub-agent';
            return (
              <Box key={t}>
                <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? ' > ' : '   '}</Text>
                <Text bold={isSelected} color={isSelected ? 'cyan' : undefined}>{t}</Text>
                <Text dimColor> — {desc}</Text>
              </Box>
            );
          })}
        </Box>
      )}

      {step === 'value' && (
        <Box flexDirection="column">
          <Box paddingLeft={2}>
            <Text bold>
              Enter {handlerType === 'command' ? 'command' : 'prompt'}:
            </Text>
          </Box>
          <Box paddingLeft={4}>
            <Text color="white" bold>
              {value}<Text color="cyan" inverse> </Text>
            </Text>
          </Box>
        </Box>
      )}

      {step === 'confirm' && (
        <Box flexDirection="column">
          <Box paddingLeft={2}>
            <Text bold color="green">Ready to create hook. Press Enter or y to confirm.</Text>
          </Box>
        </Box>
      )}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor> Step {stepIdx + 1}/{steps.length}</Text>
        <Text dimColor>
          {editingText
            ? 'Type to edit  Enter:next  Esc:cancel'
            : step === 'confirm'
            ? 'y/Enter:create  n:back  Esc:back'
            : 'j/k:move  Enter:select  Esc:back'}
        </Text>
      </Box>
    </Box>
  );
}

// ─── Value renderer (shared) ──────────────────────────────

function renderFieldValue(
  field: EditorField,
  isSelected: boolean,
  isEditing: boolean,
  editBuffer: string,
  maxWidth: number,
): React.ReactNode {
  if (isEditing) {
    const display = editBuffer.length > maxWidth - 2
      ? '...' + editBuffer.slice(-(maxWidth - 5))
      : editBuffer;
    return (
      <Text color="white" bold>
        {display}<Text color="cyan" inverse> </Text>
      </Text>
    );
  }

  if (field.fieldType === 'boolean') {
    return (
      <Text color={field.value ? 'green' : 'red'} bold={isSelected}>
        {field.value ? '● true' : '○ false'}
      </Text>
    );
  }

  if (field.fieldType === 'enum' && field.enumOptions) {
    const idx = field.enumOptions.indexOf(String(field.value));
    return (
      <Box>
        {isSelected && <Text dimColor>{'< '}</Text>}
        <Text color="magenta" bold={isSelected}>{String(field.value)}</Text>
        {isSelected && <Text dimColor>{' >'}</Text>}
        {isSelected && <Text dimColor> ({idx + 1}/{field.enumOptions.length})</Text>}
      </Box>
    );
  }

  if (field.fieldType === 'number') {
    const display = field.value === '' || field.value === undefined ? '(default)' : String(field.value);
    return (
      <Text color="yellow" bold={isSelected}>{display}</Text>
    );
  }

  // String
  const str = String(field.value ?? '');
  const display = str.length > maxWidth ? str.slice(0, maxWidth - 1) + '...' : str;
  return (
    <Text color={isSelected ? 'white' : undefined} bold={isSelected}>{display || '(empty)'}</Text>
  );
}

// ─── Helper ───────────────────────────────────────────────

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

// ─── Main Export ──────────────────────────────────────────

interface HookExplorerProps {
  projectDir: string;
  appName?: string;
  onExit?: () => void;
}

export function HookExplorer({ projectDir, appName = 'hook-editor', onExit }: HookExplorerProps) {
  const rootPanel: PanelConfig = {
    id: 'hook-dashboard',
    title: 'Hooks',
    component: HookDashboardPanel as any,
    data: { projectDir },
    state: { view: 'dashboard' },
  };

  return <PanelStack initialPanel={rootPanel} appName={appName} onExit={onExit} />;
}
