import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PanelProps } from '../../../src/types.js';

interface DiffEntry {
  old: string;
  new: string;
  timestamp: string;
}

interface DiffViewData {
  title: string;
  filePath: string;
  diffs: DiffEntry[];
}

export function DiffViewPanel(props: PanelProps<DiffViewData>) {
  const { data, width, height, updateState } = props;
  const { title, filePath, diffs } = data;

  // Build display lines with color info
  const displayLines: Array<{ text: string; color: 'red' | 'green' | 'gray' | undefined }> = [];

  for (let i = 0; i < diffs.length; i++) {
    const diff = diffs[i]!;
    if (i > 0) {
      displayLines.push({ text: '', color: undefined });
    }
    displayLines.push({ text: `── Edit at ${diff.timestamp} ${'─'.repeat(Math.max(0, width - 20 - diff.timestamp.length))}`, color: 'gray' });

    const oldLines = diff.old.split('\n');
    for (const line of oldLines) {
      displayLines.push({ text: `- ${line}`, color: 'red' });
    }

    const newLines = diff.new.split('\n');
    for (const line of newLines) {
      displayLines.push({ text: `+ ${line}`, color: 'green' });
    }
  }

  if (diffs.length === 0) {
    displayLines.push({ text: 'File written (no inline diff available)', color: 'gray' });
  }

  const [scrollOffset, setScrollOffset] = useState(0);
  const headerLines = 3; // title + path + separator
  const footerLines = 1;
  const visibleLines = Math.max(1, height - headerLines - footerLines);

  useEffect(() => {
    updateState({ title, totalDiffs: diffs.length, scrollOffset });
  }, [scrollOffset]);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setScrollOffset(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setScrollOffset(prev => Math.min(Math.max(0, displayLines.length - visibleLines), prev + 1));
    } else if (input === 'g') {
      setScrollOffset(0);
    } else if (input === 'G') {
      setScrollOffset(Math.max(0, displayLines.length - visibleLines));
    } else if (key.pageUp) {
      setScrollOffset(prev => Math.max(0, prev - visibleLines));
    } else if (key.pageDown) {
      setScrollOffset(prev => Math.min(Math.max(0, displayLines.length - visibleLines), prev + visibleLines));
    }
  });

  const windowLines = displayLines.slice(scrollOffset, scrollOffset + visibleLines);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="cyan">{title}</Text>
        <Text dimColor> ({diffs.length} edit{diffs.length !== 1 ? 's' : ''})</Text>
      </Box>
      <Box>
        <Text dimColor>{filePath}</Text>
      </Box>
      <Box>
        <Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text>
      </Box>

      {windowLines.map((line, i) => (
        <Box key={scrollOffset + i}>
          <Text color={line.color === 'gray' ? undefined : line.color} dimColor={line.color === 'gray'}>
            {line.text}
          </Text>
        </Box>
      ))}

      <Box flexGrow={1} />

      <Box justifyContent="space-between" width={width}>
        <Text dimColor>
          {displayLines.length > visibleLines
            ? `${scrollOffset + 1}-${Math.min(scrollOffset + visibleLines, displayLines.length)}/${displayLines.length}`
            : `${displayLines.length} lines`}
        </Text>
        <Text dimColor>j/k:scroll  Esc:back  g/G:top/bottom</Text>
      </Box>
    </Box>
  );
}
