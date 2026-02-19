import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PanelProps } from '../../../src/index.js';

interface JsonTreeData {
  json: unknown;
  title?: string;
}

interface TreeLine {
  depth: number;
  key: string;
  value: string;
  isExpandable: boolean;
  isExpanded: boolean;
  path: string;
  valueColor?: string;
}

function flattenJson(
  obj: unknown,
  expandedPaths: Set<string>,
  prefix = '',
  depth = 0,
): TreeLine[] {
  const lines: TreeLine[] = [];

  if (obj === null || obj === undefined) {
    return [{ depth, key: prefix || 'null', value: String(obj), isExpandable: false, isExpanded: false, path: prefix, valueColor: 'gray' }];
  }

  if (typeof obj !== 'object') {
    const color = typeof obj === 'string' ? 'green'
      : typeof obj === 'number' ? 'yellow'
      : typeof obj === 'boolean' ? 'cyan'
      : undefined;
    return [{ depth, key: prefix, value: JSON.stringify(obj), isExpandable: false, isExpanded: false, path: prefix, valueColor: color }];
  }

  if (Array.isArray(obj)) {
    const path = prefix || '[]';
    const isExpanded = expandedPaths.has(path);
    lines.push({
      depth,
      key: prefix || '(root)',
      value: isExpanded ? `[` : `[ ... ] (${obj.length} items)`,
      isExpandable: true,
      isExpanded,
      path,
      valueColor: 'magenta',
    });

    if (isExpanded) {
      for (let i = 0; i < obj.length; i++) {
        const childPath = `${path}[${i}]`;
        const child = obj[i];
        if (child !== null && typeof child === 'object') {
          lines.push(...flattenJson(child, expandedPaths, `[${i}]`, depth + 1));
        } else {
          const color = typeof child === 'string' ? 'green'
            : typeof child === 'number' ? 'yellow'
            : typeof child === 'boolean' ? 'cyan'
            : 'gray';
          lines.push({ depth: depth + 1, key: `[${i}]`, value: JSON.stringify(child), isExpandable: false, isExpanded: false, path: childPath, valueColor: color });
        }
      }
      lines.push({ depth, key: '', value: ']', isExpandable: false, isExpanded: false, path: path + '_close', valueColor: 'magenta' });
    }
  } else {
    const entries = Object.entries(obj as Record<string, unknown>);
    const path = prefix || '{}';
    const isExpanded = expandedPaths.has(path);

    lines.push({
      depth,
      key: prefix || '(root)',
      value: isExpanded ? `{` : `{ ... } (${entries.length} keys)`,
      isExpandable: true,
      isExpanded,
      path,
      valueColor: 'magenta',
    });

    if (isExpanded) {
      for (const [key, val] of entries) {
        const childPath = `${path}.${key}`;
        if (val !== null && typeof val === 'object') {
          lines.push(...flattenJson(val, expandedPaths, key, depth + 1));
        } else {
          const color = typeof val === 'string' ? 'green'
            : typeof val === 'number' ? 'yellow'
            : typeof val === 'boolean' ? 'cyan'
            : 'gray';
          lines.push({ depth: depth + 1, key, value: JSON.stringify(val), isExpandable: false, isExpanded: false, path: childPath, valueColor: color });
        }
      }
      lines.push({ depth, key: '', value: '}', isExpandable: false, isExpanded: false, path: path + '_close', valueColor: 'magenta' });
    }
  }

  return lines;
}

export function JsonTreePanel(props: PanelProps<JsonTreeData>) {
  const { data, width, height, updateState } = props;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['{}', '[]']));

  const lines = flattenJson(data.json, expandedPaths);
  const visibleLines = height - 3; // title + separator + status

  React.useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + visibleLines) {
      setScrollOffset(selectedIndex - visibleLines + 1);
    }
  }, [selectedIndex, scrollOffset, visibleLines]);

  React.useEffect(() => {
    const line = lines[selectedIndex];
    if (line) {
      updateState({ selectedPath: line.path, selectedKey: line.key });
    }
  }, [selectedIndex, lines.length]);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(lines.length - 1, prev + 1));
    } else if (key.return || key.rightArrow) {
      const line = lines[selectedIndex];
      if (line?.isExpandable) {
        setExpandedPaths(prev => {
          const next = new Set(prev);
          if (next.has(line.path)) {
            next.delete(line.path);
          } else {
            next.add(line.path);
          }
          return next;
        });
      }
    } else if (key.leftArrow) {
      const line = lines[selectedIndex];
      if (line?.isExpandable && expandedPaths.has(line.path)) {
        setExpandedPaths(prev => {
          const next = new Set(prev);
          next.delete(line.path);
          return next;
        });
      }
    } else if (input === 'e') {
      // Expand all
      const allPaths = new Set<string>();
      const collectPaths = (obj: unknown, prefix = '') => {
        if (obj === null || typeof obj !== 'object') return;
        const path = prefix || (Array.isArray(obj) ? '[]' : '{}');
        allPaths.add(path);
        if (Array.isArray(obj)) {
          for (let i = 0; i < obj.length; i++) {
            collectPaths(obj[i], `${path}[${i}]`);
          }
        } else {
          for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
            collectPaths(val, `${path}.${key}`);
          }
        }
      };
      collectPaths(data.json);
      setExpandedPaths(allPaths);
    } else if (input === 'c') {
      // Collapse all
      setExpandedPaths(new Set());
    }
  });

  const windowLines = lines.slice(scrollOffset, scrollOffset + visibleLines);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="cyan">{data.title ?? 'JSON Tree'}</Text>
        <Text dimColor> ({lines.length} lines)</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {windowLines.map((line, windowIdx) => {
        const actualIdx = scrollOffset + windowIdx;
        const isSelected = actualIdx === selectedIndex;
        const indent = '  '.repeat(line.depth);
        const marker = line.isExpandable ? (line.isExpanded ? '▼ ' : '▶ ') : '  ';

        return (
          <Box key={`${line.path}-${windowIdx}`}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? '>' : ' '} {indent}{marker}
            </Text>
            {line.key && (
              <Text bold={isSelected} color={isSelected ? 'white' : undefined}>
                {line.key}
              </Text>
            )}
            {line.key && line.value && <Text dimColor>: </Text>}
            <Text color={line.valueColor as any}>{line.value}</Text>
          </Box>
        );
      })}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>{selectedIndex + 1}/{lines.length}</Text>
        <Text dimColor>j/k:move  Enter/→:expand  ←:collapse  e:expand-all  c:collapse-all</Text>
      </Box>
    </Box>
  );
}
