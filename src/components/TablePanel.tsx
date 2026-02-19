import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PanelProps, TableColumn } from '../types.js';

interface TablePanelData<TRow = Record<string, unknown>> {
  columns: TableColumn<TRow>[];
  rows: TRow[];
  /** Called when user presses Enter on a row */
  onSelect?: (row: TRow, index: number, panelProps: PanelProps<TablePanelData<TRow>>) => void;
  /** Key extractor for unique row identification */
  getRowKey?: (row: TRow, index: number) => string;
  /** Title shown at the top of the table */
  title?: string;
  /** Enable search/filter with '/' key */
  searchable?: boolean;
}

export function TablePanel<TRow extends Record<string, unknown> = Record<string, unknown>>(
  props: PanelProps<TablePanelData<TRow>>,
) {
  const { data, width, height, push, pop, replace, updateState } = props;
  const { columns, rows, onSelect, getRowKey, title, searchable = true } = data;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;
    const query = searchQuery.toLowerCase();
    return rows.filter(row => {
      for (const col of columns) {
        const val = typeof col.accessor === 'function'
          ? col.accessor(row)
          : String(row[col.accessor] ?? '');
        if (val.toLowerCase().includes(query)) return true;
      }
      return false;
    });
  }, [rows, searchQuery, columns]);

  // Calculate column widths
  const colWidths = useMemo(() => {
    const widths: number[] = [];
    const availableWidth = width - 3 - (columns.length - 1); // 3 for selection marker + gaps

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]!;
      if (col.width) {
        widths.push(col.width);
      } else {
        // Auto-size: measure header and first 50 rows
        let maxLen = col.header.length;
        const sampleSize = Math.min(filteredRows.length, 50);
        for (let j = 0; j < sampleSize; j++) {
          const val = typeof col.accessor === 'function'
            ? col.accessor(filteredRows[j]!)
            : String(filteredRows[j]![col.accessor] ?? '');
          maxLen = Math.max(maxLen, val.length);
        }
        widths.push(Math.min(maxLen, col.maxWidth ?? 40));
      }
    }

    // Distribute remaining space proportionally
    const totalFixed = widths.reduce((a, b) => a + b, 0);
    if (totalFixed < availableWidth) {
      const extra = availableWidth - totalFixed;
      // Give extra space to last column
      widths[widths.length - 1] = (widths[widths.length - 1] ?? 0) + extra;
    }

    // Apply min widths
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]!;
      if (col.minWidth && widths[i]! < col.minWidth) {
        widths[i] = col.minWidth;
      }
    }

    return widths;
  }, [columns, filteredRows, width]);

  // Reserve lines: title(1) + header(1) + separator(1) + search(1 if active) + status(1)
  const headerLines = (title ? 1 : 0) + 2; // header row + separator
  const footerLines = 1; // status bar
  const searchLines = isSearching ? 1 : 0;
  const visibleRows = Math.max(1, height - headerLines - footerLines - searchLines);

  // Keep selected row in view
  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + visibleRows) {
      setScrollOffset(selectedIndex - visibleRows + 1);
    }
  }, [selectedIndex, scrollOffset, visibleRows]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
    setScrollOffset(0);
  }, [searchQuery]);

  // Update Claude state file with selection
  useEffect(() => {
    if (filteredRows.length > 0 && filteredRows[selectedIndex]) {
      updateState({
        selectedIndex,
        selectedRow: filteredRows[selectedIndex],
        totalRows: filteredRows.length,
        searchQuery: searchQuery || undefined,
      });
    }
  }, [selectedIndex, filteredRows, searchQuery]);

  useInput((input, key) => {
    if (isSearching) {
      if (key.escape) {
        setIsSearching(false);
        setSearchQuery('');
        return;
      }
      if (key.return) {
        setIsSearching(false);
        return;
      }
      if (key.backspace || key.delete) {
        setSearchQuery(prev => prev.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setSearchQuery(prev => prev + input);
        return;
      }
      return;
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(filteredRows.length - 1, prev + 1));
    } else if (key.pageUp) {
      setSelectedIndex(prev => Math.max(0, prev - visibleRows));
    } else if (key.pageDown) {
      setSelectedIndex(prev => Math.min(filteredRows.length - 1, prev + visibleRows));
    } else if (input === 'g') {
      setSelectedIndex(0);
    } else if (input === 'G') {
      setSelectedIndex(filteredRows.length - 1);
    } else if (key.return) {
      if (onSelect && filteredRows[selectedIndex]) {
        onSelect(filteredRows[selectedIndex]!, selectedIndex, props);
      }
    } else if (input === '/' && searchable) {
      setIsSearching(true);
      setSearchQuery('');
    }
  });

  const formatCell = (row: TRow, col: TableColumn<TRow>, colWidth: number): string => {
    const raw = typeof col.accessor === 'function'
      ? col.accessor(row)
      : String(row[col.accessor] ?? '');
    if (raw.length > colWidth) {
      return raw.slice(0, colWidth - 1) + '\u2026';
    }
    if (col.align === 'right') {
      return raw.padStart(colWidth);
    }
    if (col.align === 'center') {
      const pad = colWidth - raw.length;
      const left = Math.floor(pad / 2);
      return ' '.repeat(left) + raw + ' '.repeat(pad - left);
    }
    return raw.padEnd(colWidth);
  };

  const windowRows = filteredRows.slice(scrollOffset, scrollOffset + visibleRows);

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Title */}
      {title && (
        <Box>
          <Text bold color="cyan">{title}</Text>
          <Text dimColor> ({filteredRows.length} rows)</Text>
        </Box>
      )}

      {/* Header */}
      <Box>
        <Text dimColor>   </Text>
        {columns.map((col, i) => (
          <React.Fragment key={col.header}>
            {i > 0 && <Text dimColor> </Text>}
            <Text bold underline>
              {col.header.padEnd(colWidths[i] ?? 10).slice(0, colWidths[i] ?? 10)}
            </Text>
          </React.Fragment>
        ))}
      </Box>

      {/* Separator */}
      <Box>
        <Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text>
      </Box>

      {/* Rows */}
      {windowRows.map((row, windowIdx) => {
        const actualIdx = scrollOffset + windowIdx;
        const isSelected = actualIdx === selectedIndex;
        return (
          <Box key={getRowKey ? getRowKey(row, actualIdx) : actualIdx}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? ' > ' : '   '}
            </Text>
            {columns.map((col, colIdx) => (
              <React.Fragment key={col.header}>
                {colIdx > 0 && <Text> </Text>}
                <Text
                  color={isSelected ? 'cyan' : undefined}
                  bold={isSelected}
                >
                  {formatCell(row, col, colWidths[colIdx] ?? 10)}
                </Text>
              </React.Fragment>
            ))}
          </Box>
        );
      })}

      {/* Fill empty space */}
      {windowRows.length < visibleRows && (
        <Box flexGrow={1} />
      )}

      {/* Search bar */}
      {isSearching && (
        <Box>
          <Text color="yellow">/ </Text>
          <Text>{searchQuery}</Text>
          <Text dimColor>_</Text>
        </Box>
      )}

      {/* Status bar */}
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>
          {filteredRows.length > 0
            ? `${selectedIndex + 1}/${filteredRows.length}`
            : 'No rows'}
          {searchQuery && !isSearching ? ` (filter: "${searchQuery}")` : ''}
        </Text>
        <Text dimColor>
          j/k:move  Enter:select  /:search  g/G:top/bottom
        </Text>
      </Box>
    </Box>
  );
}
