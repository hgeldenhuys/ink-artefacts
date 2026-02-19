import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PanelProps } from '../types.js';

interface ListItem {
  id: string;
  label: string;
  description?: string;
  badge?: string;
  badgeColor?: string;
}

interface ListPanelData {
  title?: string;
  items: ListItem[];
  onSelect?: (item: ListItem, index: number, panelProps: PanelProps<ListPanelData>) => void;
}

export function ListPanel(props: PanelProps<ListPanelData>) {
  const { data, width, height, updateState } = props;
  const { title, items, onSelect } = data;

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const headerLines = title ? 2 : 0; // title + separator
  const footerLines = 1;
  const visibleItems = Math.max(1, height - headerLines - footerLines);

  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + visibleItems) {
      setScrollOffset(selectedIndex - visibleItems + 1);
    }
  }, [selectedIndex, scrollOffset, visibleItems]);

  useEffect(() => {
    if (items[selectedIndex]) {
      updateState({
        selectedId: items[selectedIndex]!.id,
        selectedLabel: items[selectedIndex]!.label,
        totalItems: items.length,
      });
    }
  }, [selectedIndex, items]);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(items.length - 1, prev + 1));
    } else if (key.return) {
      if (onSelect && items[selectedIndex]) {
        onSelect(items[selectedIndex]!, selectedIndex, props);
      }
    } else if (input === 'g') {
      setSelectedIndex(0);
    } else if (input === 'G') {
      setSelectedIndex(items.length - 1);
    }
  });

  const windowItems = items.slice(scrollOffset, scrollOffset + visibleItems);

  return (
    <Box flexDirection="column" width={width} height={height}>
      {title && (
        <>
          <Box>
            <Text bold color="cyan">{title}</Text>
            <Text dimColor> ({items.length} items)</Text>
          </Box>
          <Box>
            <Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text>
          </Box>
        </>
      )}

      {windowItems.map((item, windowIdx) => {
        const actualIdx = scrollOffset + windowIdx;
        const isSelected = actualIdx === selectedIndex;

        return (
          <Box key={item.id}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? ' > ' : '   '}
            </Text>
            {item.badge && (
              <Text color={item.badgeColor as any ?? 'yellow'}>
                [{item.badge}]{' '}
              </Text>
            )}
            <Text bold={isSelected} color={isSelected ? 'cyan' : undefined}>
              {item.label}
            </Text>
            {item.description && (
              <Text dimColor> - {item.description}</Text>
            )}
          </Box>
        );
      })}

      <Box flexGrow={1} />

      <Box justifyContent="space-between" width={width}>
        <Text dimColor>
          {items.length > 0 ? `${selectedIndex + 1}/${items.length}` : 'Empty'}
        </Text>
        <Text dimColor>j/k:move  Enter:select</Text>
      </Box>
    </Box>
  );
}
