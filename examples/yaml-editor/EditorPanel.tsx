import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useInputLock } from '../../src/hooks/useInputLock.js';
import type { PanelProps } from '../../src/types.js';

// --- Types ---

interface SchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  properties?: Record<string, SchemaProperty>;
}

interface Schema {
  type: string;
  properties: Record<string, SchemaProperty>;
}

interface EditorRow {
  kind: 'field' | 'section';
  // Section
  sectionName?: string;
  sectionDescription?: string;
  // Field
  path?: string;
  key?: string;
  fieldType?: 'string' | 'number' | 'boolean' | 'enum';
  value?: unknown;
  originalValue?: unknown;
  enumOptions?: string[];
  description?: string;
  min?: number;
  max?: number;
  indent?: number;
}

export interface EditorPanelData {
  title: string;
  filePath: string;
  yaml: Record<string, unknown>;
  schema: Schema;
  onSave: (yaml: Record<string, unknown>) => void;
}

// --- Flatten YAML into rows using schema ---

function flattenYaml(
  yaml: Record<string, unknown>,
  schema: Schema,
  prefix: string = '',
  indent: number = 0,
): EditorRow[] {
  const rows: EditorRow[] = [];
  const props = schema.properties || {};

  for (const key of Object.keys(props)) {
    const schemaProp = props[key]!;
    const value = yaml[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (schemaProp.type === 'object' && schemaProp.properties) {
      rows.push({
        kind: 'section',
        sectionName: key,
        sectionDescription: schemaProp.description,
        indent,
      });
      const nested = flattenYaml(
        (value as Record<string, unknown>) || {},
        schemaProp as Schema,
        path,
        indent + 1,
      );
      for (const row of nested) rows.push(row);
    } else {
      let fieldType: EditorRow['fieldType'] = 'string';
      if (schemaProp.enum) {
        fieldType = 'enum';
      } else if (schemaProp.type === 'boolean') {
        fieldType = 'boolean';
      } else if (schemaProp.type === 'number' || schemaProp.type === 'integer') {
        fieldType = 'number';
      }

      rows.push({
        kind: 'field',
        path,
        key,
        fieldType,
        value,
        originalValue: value,
        enumOptions: schemaProp.enum,
        description: schemaProp.description,
        min: schemaProp.minimum,
        max: schemaProp.maximum,
        indent,
      });
    }
  }

  return rows;
}

// --- Set a nested value by dot-path ---

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(obj));
  const parts = path.split('.');
  let current = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]!]) current[parts[i]!] = {};
    current = current[parts[i]!] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]!] = value;
  return clone;
}

// --- Value renderer ---

function renderValue(
  row: EditorRow,
  isSelected: boolean,
  isEditing: boolean,
  editBuffer: string,
  maxWidth: number,
): React.ReactNode {
  if (isEditing) {
    const display = editBuffer.length > maxWidth - 2
      ? '…' + editBuffer.slice(-(maxWidth - 3))
      : editBuffer;
    return (
      <Text color="white" bold>
        {display}<Text color="cyan" inverse> </Text>
      </Text>
    );
  }

  if (row.fieldType === 'boolean') {
    return (
      <Text color={row.value ? 'green' : 'red'} bold={isSelected}>
        {row.value ? '● true' : '○ false'}
      </Text>
    );
  }

  if (row.fieldType === 'enum' && row.enumOptions) {
    const idx = row.enumOptions.indexOf(String(row.value));
    return (
      <Box>
        {isSelected && <Text dimColor>‹ </Text>}
        <Text color="magenta" bold={isSelected}>{String(row.value)}</Text>
        {isSelected && <Text dimColor> ›</Text>}
        {isSelected && (
          <Text dimColor> ({idx + 1}/{row.enumOptions.length})</Text>
        )}
      </Box>
    );
  }

  if (row.fieldType === 'number') {
    return (
      <Text color="yellow" bold={isSelected}>{String(row.value ?? 0)}</Text>
    );
  }

  // String
  const str = String(row.value ?? '');
  const display = str.length > maxWidth ? str.slice(0, maxWidth - 1) + '…' : str;
  return (
    <Text color={isSelected ? 'white' : undefined} bold={isSelected}>{display}</Text>
  );
}

// --- Editor Panel Component ---

export function EditorPanel(props: PanelProps<EditorPanelData>) {
  const { data, width, height, updateState } = props;
  const { title, filePath, yaml: initialYaml, schema, onSave } = data;
  const inputLock = useInputLock();

  const [yaml, setYaml] = useState(initialYaml);
  const [rows, setRows] = useState<EditorRow[]>(() => flattenYaml(initialYaml, schema));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editBuffer, setEditBuffer] = useState('');
  const [modified, setModified] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  // Build list of navigable field indices (skip sections)
  const fieldIndices: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]!.kind === 'field') fieldIndices.push(i);
  }

  const headerLines = 2; // title + separator
  const footerLines = 2; // description + status
  const visibleRows = Math.max(1, height - headerLines - footerLines);

  // Keep scroll in sync
  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + visibleRows) {
      setScrollOffset(selectedIndex - visibleRows + 1);
    }
  }, [selectedIndex, scrollOffset, visibleRows]);

  // Update Claude state
  useEffect(() => {
    const row = rows[selectedIndex];
    if (row?.kind === 'field') {
      updateState({
        type: 'yaml-editor',
        filePath,
        field: row.path,
        fieldType: row.fieldType,
        value: row.value,
        modified,
        editing: editMode,
      });
    }
  }, [selectedIndex, rows, editMode, modified]);

  // Clear saved message
  useEffect(() => {
    if (savedMessage) {
      const timer = setTimeout(() => setSavedMessage(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [savedMessage]);

  // Lock/unlock PanelStack's global keys when editing
  useEffect(() => {
    if (editMode) {
      inputLock.lock();
    } else {
      inputLock.unlock();
    }
    return () => { inputLock.unlock(); };
  }, [editMode]);

  // Navigate to next/prev field (skip sections)
  const moveToField = (direction: 1 | -1) => {
    let next = selectedIndex + direction;
    while (next >= 0 && next < rows.length) {
      if (rows[next]!.kind === 'field') {
        setSelectedIndex(next);
        return;
      }
      next += direction;
    }
  };

  // Apply a value change
  const applyChange = (rowIndex: number, newValue: unknown) => {
    const row = rows[rowIndex]!;
    if (!row.path) return;

    const newYaml = setNestedValue(yaml, row.path, newValue);
    setYaml(newYaml);

    const newRows = [...rows];
    newRows[rowIndex] = { ...row, value: newValue };
    setRows(newRows);
    setModified(true);
  };

  useInput((input, key) => {
    // --- Edit mode: capture all input ---
    if (editMode) {
      if (key.return) {
        const row = rows[selectedIndex]!;
        if (row.fieldType === 'number') {
          const num = parseFloat(editBuffer);
          if (!isNaN(num)) {
            const clamped = Math.max(
              row.min ?? -Infinity,
              Math.min(row.max ?? Infinity, num),
            );
            applyChange(selectedIndex, clamped);
          }
        } else {
          applyChange(selectedIndex, editBuffer);
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
        if (rows[selectedIndex]?.fieldType === 'number') {
          if (/[\d.\-]/.test(input)) {
            setEditBuffer(prev => prev + input);
          }
        } else {
          setEditBuffer(prev => prev + input);
        }
        return;
      }
      return;
    }

    // --- Normal mode ---
    if (key.upArrow || input === 'k') {
      moveToField(-1);
    } else if (key.downArrow || input === 'j') {
      moveToField(1);
    } else if (input === 'g') {
      for (let i = 0; i < rows.length; i++) {
        if (rows[i]!.kind === 'field') { setSelectedIndex(i); break; }
      }
    } else if (input === 'G') {
      for (let i = rows.length - 1; i >= 0; i--) {
        if (rows[i]!.kind === 'field') { setSelectedIndex(i); break; }
      }
    } else if (input === ' ' || key.return) {
      const row = rows[selectedIndex];
      if (!row || row.kind !== 'field') return;

      if (row.fieldType === 'boolean') {
        applyChange(selectedIndex, !row.value);
      } else if (row.fieldType === 'enum' && row.enumOptions) {
        const currentIdx = row.enumOptions.indexOf(String(row.value));
        const nextIdx = (currentIdx + 1) % row.enumOptions.length;
        applyChange(selectedIndex, row.enumOptions[nextIdx]);
      } else if (row.fieldType === 'string' || row.fieldType === 'number') {
        setEditBuffer(String(row.value ?? ''));
        setEditMode(true);
      }
    } else if (key.leftArrow || key.rightArrow) {
      const row = rows[selectedIndex];
      if (row?.fieldType === 'enum' && row.enumOptions) {
        const currentIdx = row.enumOptions.indexOf(String(row.value));
        const dir = key.leftArrow ? -1 : 1;
        const nextIdx = (currentIdx + dir + row.enumOptions.length) % row.enumOptions.length;
        applyChange(selectedIndex, row.enumOptions[nextIdx]);
      }
    } else if (input === 's') {
      onSave(yaml);
      setModified(false);
      setSavedMessage('Saved!');
      const newRows = rows.map(r =>
        r.kind === 'field' ? { ...r, originalValue: r.value } : r,
      );
      setRows(newRows);
    } else if (input === 'u') {
      setYaml(initialYaml);
      setRows(flattenYaml(initialYaml, schema));
      setModified(false);
    }
  });

  // Render
  const windowRows = rows.slice(scrollOffset, scrollOffset + visibleRows);

  // Max key width for alignment
  let maxKeyLen = 0;
  for (const row of rows) {
    if (row.kind === 'field' && row.key) {
      maxKeyLen = Math.max(maxKeyLen, row.key.length + (row.indent ?? 0) * 2);
    }
  }
  maxKeyLen = Math.min(maxKeyLen + 2, 24);

  // Current field's description
  const currentRow = rows[selectedIndex];
  const description = currentRow?.kind === 'field' ? currentRow.description : currentRow?.sectionDescription;

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Header */}
      <Box justifyContent="space-between" width={width}>
        <Box>
          <Text bold color="cyan">{title}</Text>
          {modified && <Text color="yellow"> [modified]</Text>}
          {savedMessage && <Text color="green"> {savedMessage}</Text>}
        </Box>
        <Box gap={1}>
          <Text color="green" dimColor>str</Text>
          <Text color="yellow" dimColor>num</Text>
          <Text color="blue" dimColor>bool</Text>
          <Text color="magenta" dimColor>enum</Text>
        </Box>
      </Box>
      <Box>
        <Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text>
      </Box>

      {/* Rows */}
      {windowRows.map((row, windowIdx) => {
        const actualIdx = scrollOffset + windowIdx;

        if (row.kind === 'section') {
          const indent = '  '.repeat(row.indent ?? 0);
          const name = row.sectionName ?? '';
          const lineLen = Math.max(0, width - name.length - indent.length - 5);
          return (
            <Box key={`section-${actualIdx}`}>
              <Text dimColor>{indent}{'── '}</Text>
              <Text bold color="magenta">{name}</Text>
              <Text dimColor>{' ' + '─'.repeat(lineLen)}</Text>
            </Box>
          );
        }

        // Field row
        const isSelected = actualIdx === selectedIndex;
        const isModified = row.value !== row.originalValue;
        const indent = '  '.repeat(row.indent ?? 0);
        const displayKey = indent + (row.key ?? '');

        return (
          <Box key={`field-${actualIdx}`}>
            {/* Cursor */}
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? (editMode ? '✎ ' : '› ') : '  '}
            </Text>
            {/* Modified marker */}
            <Text color="yellow">{isModified ? '● ' : '  '}</Text>
            {/* Key (colored by type) */}
            <Text
              bold={isSelected}
              dimColor={!isSelected}
              color={isSelected ? (
                row.fieldType === 'boolean' ? 'blue' :
                row.fieldType === 'enum' ? 'magenta' :
                row.fieldType === 'number' ? 'yellow' : 'green'
              ) : undefined}
            >
              {displayKey.padEnd(maxKeyLen)}
            </Text>
            {/* Value */}
            {renderValue(row, isSelected, editMode && isSelected, editBuffer, width - maxKeyLen - 6)}
          </Box>
        );
      })}

      <Box flexGrow={1} />

      {/* Description line */}
      <Box width={width}>
        <Text dimColor italic>
          {description ? `  ${description}` : ''}
        </Text>
      </Box>

      {/* Footer */}
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>
          {fieldIndices.length > 0
            ? `${fieldIndices.indexOf(selectedIndex) + 1}/${fieldIndices.length}`
            : 'Empty'}
          {modified ? '  ●' : ''}
        </Text>
        <Text dimColor>
          {editMode
            ? 'Type to edit  Enter:confirm  Esc:cancel'
            : 'j/k:move  Enter/Space:edit  ←/→:cycle  s:save  u:undo'}
        </Text>
      </Box>
    </Box>
  );
}
