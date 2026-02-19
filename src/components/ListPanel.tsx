import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import type { PanelProps } from '../types.js';
import { logCanvasEvent } from '../hooks/useCanvasEvents.js';

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
  canvasName?: string;
  panelId?: string;
  onSelect?: (item: ListItem, index: number, panelProps: PanelProps<ListPanelData>) => void;
}

/** Path to the bookmarks JSON file. */
const BOOKMARKS_PATH = join(homedir(), '.claude', 'canvas-bookmarks.json');

/**
 * Read all bookmarks from disk. Returns an empty object if the file
 * does not exist or is not valid JSON.
 */
function readBookmarks(): Record<string, boolean> {
  try {
    const raw = readFileSync(BOOKMARKS_PATH, 'utf-8');
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

/**
 * Write the full bookmarks object back to disk, creating the parent
 * directory if it does not already exist.
 */
function writeBookmarks(bookmarks: Record<string, boolean>): void {
  try {
    mkdirSync(dirname(BOOKMARKS_PATH), { recursive: true });
    writeFileSync(BOOKMARKS_PATH, JSON.stringify(bookmarks, null, 2) + '\n');
  } catch {
    // Silently fail -- bookmark persistence must never break the TUI
  }
}

/**
 * Build a flat bookmark key from the canvas name, panel ID, and item ID.
 * Format: `{canvasName}:{panelId}:{itemId}`
 */
function bmKey(canvasName: string, panelId: string, itemId: string): string {
  return `${canvasName}:${panelId}:${itemId}`;
}

export function ListPanel(props: PanelProps<ListPanelData>) {
  const { data, width, height, updateState } = props;
  const { title, items, onSelect, canvasName, panelId } = data;

  const [selectedIndex, setSelectedIndex] = useState((props.state?.selectedIndex as number) ?? 0);
  const [scrollOffset, setScrollOffset] = useState((props.state?.scrollOffset as number) ?? 0);

  // Bookmark state: a Set of item IDs that are bookmarked for this panel
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(() => {
    if (!canvasName || !panelId) return new Set();

    const allBookmarks = readBookmarks();
    const ids = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const key = bmKey(canvasName, panelId, item.id);
      if (allBookmarks[key]) {
        ids.add(item.id);
      }
    }
    return ids;
  });

  const bookmarksEnabled = Boolean(canvasName && panelId);

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
        selectedIndex,
        scrollOffset,
        totalItems: items.length,
      });
    }
  }, [selectedIndex, scrollOffset, items]);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(items.length - 1, prev + 1));
    } else if (key.return) {
      if (onSelect && items[selectedIndex]) {
        logCanvasEvent(
          canvasName ?? 'unknown',
          'select',
          panelId ?? title ?? 'list',
          { index: selectedIndex, label: items[selectedIndex]!.label, id: items[selectedIndex]!.id },
        );
        onSelect(items[selectedIndex]!, selectedIndex, props);
      }
    } else if (input === 'g') {
      setSelectedIndex(0);
    } else if (input === 'G') {
      setSelectedIndex(items.length - 1);
    } else if (input === 'b' && bookmarksEnabled) {
      const item = items[selectedIndex];
      if (!item) return;

      const key = bmKey(canvasName!, panelId!, item.id);
      const wasBookmarked = bookmarkedIds.has(item.id);
      const newState = !wasBookmarked;

      // Update local state
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        if (newState) {
          next.add(item.id);
        } else {
          next.delete(item.id);
        }
        return next;
      });

      // Persist to disk
      const allBookmarks = readBookmarks();
      if (newState) {
        allBookmarks[key] = true;
      } else {
        delete allBookmarks[key];
      }
      writeBookmarks(allBookmarks);

      // Log bookmark event
      logCanvasEvent(canvasName!, 'bookmark', panelId!, {
        itemId: item.id,
        label: item.label,
        bookmarked: newState,
      });
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
        const isBookmarked = bookmarkedIds.has(item.id);

        return (
          <Box key={item.id}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? ' > ' : '   '}
            </Text>
            {isBookmarked && (
              <Text color="yellow">* </Text>
            )}
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
        <Text dimColor>
          {bookmarksEnabled
            ? 'j/k:move  Enter:select  b:bookmark'
            : 'j/k:move  Enter:select'}
        </Text>
      </Box>
    </Box>
  );
}
