import React from 'react';
import { Box, Text } from 'ink';
import type { BreadcrumbEntry } from '../types.js';

interface BreadcrumbProps {
  entries: BreadcrumbEntry[];
  forwardEntries?: BreadcrumbEntry[];
  width: number;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

export function Breadcrumb({
  entries,
  forwardEntries = [],
  width,
  canGoBack = false,
  canGoForward = false,
}: BreadcrumbProps) {
  // Build hint text
  const hints: string[] = [];
  if (canGoBack || canGoForward) {
    hints.push('[/]:nav');
  }
  if (entries.length > 1) {
    hints.push('ESC:back');
  } else {
    hints.push('q:quit');
  }
  const hintText = ' ' + hints.join('  ');
  const hintLen = hintText.length;

  // Combine active + forward into one trail
  const allEntries = [...entries, ...forwardEntries];
  const activeIndex = entries.length - 1; // current position in the trail

  // Calculate available space
  const availableWidth = width - hintLen - 1;

  // Truncate from the left if too long
  let visibleEntries = [...allEntries];
  let visibleActiveIndex = activeIndex;
  let totalLen = 0;
  for (let i = 0; i < visibleEntries.length; i++) {
    totalLen += visibleEntries[i]!.title.length + (i > 0 ? 3 : 0); // " › " separator
  }

  while (totalLen > availableWidth && visibleEntries.length > 1 && visibleActiveIndex > 0) {
    const removed = visibleEntries.shift()!;
    visibleActiveIndex--;
    totalLen -= (removed.title.length + 3);
    if (visibleEntries.length > 0 && visibleEntries[0]!.id !== 'ellipsis') {
      visibleEntries.unshift({ id: 'ellipsis', title: '\u2026' });
      visibleActiveIndex++;
      totalLen += 4;
    }
  }

  return (
    <Box width={width} height={1}>
      {visibleEntries.map((entry, i) => {
        const isActive = i === visibleActiveIndex;
        const isForward = i > visibleActiveIndex;
        const isEllipsis = entry.id === 'ellipsis';

        return (
          <React.Fragment key={`${entry.id}-${i}`}>
            {i > 0 && (
              <Text dimColor={!isActive} color={isActive ? 'cyan' : 'gray'}> › </Text>
            )}
            <Text
              bold={isActive}
              color={isActive ? 'cyan' : undefined}
              dimColor={!isActive}
              italic={isForward && !isEllipsis}
            >
              {entry.title}
            </Text>
          </React.Fragment>
        );
      })}

      <Box flexGrow={1} />
      <Text dimColor color="yellow">{hintText}</Text>
    </Box>
  );
}
