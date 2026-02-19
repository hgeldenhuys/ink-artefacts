import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PanelProps } from '../../../src/index.js';

interface DiskUsageEntry {
  name: string;
  size: number;
  children?: DiskUsageEntry[];
}

interface DiskUsageData {
  title?: string;
  entries: DiskUsageEntry[];
}

const BAR_COLORS = ['green', 'cyan', 'blue', 'yellow', 'magenta', 'red'] as const;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function DiskUsagePanel(props: PanelProps<DiskUsageData>) {
  const { data, width, height, push, updateState } = props;
  const { entries, title } = data;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Sort by size descending
  const sorted = [...entries].sort((a, b) => b.size - a.size);
  const totalSize = sorted.reduce((sum, e) => sum + e.size, 0);

  const headerLines = 3; // title + total + separator
  const footerLines = 1;
  const visibleRows = Math.max(1, height - headerLines - footerLines);

  React.useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + visibleRows) {
      setScrollOffset(selectedIndex - visibleRows + 1);
    }
  }, [selectedIndex, scrollOffset, visibleRows]);

  React.useEffect(() => {
    const entry = sorted[selectedIndex];
    if (entry) {
      updateState({
        selectedName: entry.name,
        selectedSize: entry.size,
        selectedPercent: ((entry.size / totalSize) * 100).toFixed(1),
      });
    }
  }, [selectedIndex, sorted.length]);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(sorted.length - 1, prev + 1));
    } else if (key.return) {
      const entry = sorted[selectedIndex];
      if (entry?.children && entry.children.length > 0) {
        push({
          id: `disk-${entry.name}-${Date.now()}`,
          title: entry.name,
          component: DiskUsagePanel as any,
          data: { title: entry.name, entries: entry.children },
        });
      }
    }
  });

  // Calculate widths
  const maxNameLen = Math.min(30, Math.max(...sorted.map(e => e.name.length)));
  const sizeColWidth = 10;
  const percentColWidth = 7;
  const barWidth = Math.max(10, width - maxNameLen - sizeColWidth - percentColWidth - 8);

  const windowEntries = sorted.slice(scrollOffset, scrollOffset + visibleRows);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="cyan">{title ?? 'Disk Usage'}</Text>
      </Box>
      <Box>
        <Text dimColor>Total: </Text>
        <Text bold>{formatSize(totalSize)}</Text>
        <Text dimColor> across {sorted.length} items</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {windowEntries.map((entry, windowIdx) => {
        const actualIdx = scrollOffset + windowIdx;
        const isSelected = actualIdx === selectedIndex;
        const pct = totalSize > 0 ? entry.size / totalSize : 0;
        const filledChars = Math.round(pct * barWidth);
        const colorIdx = actualIdx % BAR_COLORS.length;
        const barColor = BAR_COLORS[colorIdx]!;
        const hasChildren = entry.children && entry.children.length > 0;
        const pctStr = `${(pct * 100).toFixed(1)}%`.padStart(percentColWidth);

        return (
          <Box key={entry.name}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? '>' : ' '}
            </Text>
            <Text bold={isSelected} color={isSelected ? 'white' : undefined}>
              {entry.name.padEnd(maxNameLen).slice(0, maxNameLen)}
            </Text>
            <Text> </Text>
            <Text dimColor>{formatSize(entry.size).padStart(sizeColWidth)}</Text>
            <Text dimColor>{pctStr}</Text>
            <Text> </Text>
            <Text color={barColor as any}>
              {'█'.repeat(filledChars)}
            </Text>
            <Text dimColor>
              {'░'.repeat(Math.max(0, barWidth - filledChars))}
            </Text>
            {hasChildren && <Text dimColor> →</Text>}
          </Box>
        );
      })}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>{selectedIndex + 1}/{sorted.length}</Text>
        <Text dimColor>j/k:move  Enter:drill-down</Text>
      </Box>
    </Box>
  );
}
