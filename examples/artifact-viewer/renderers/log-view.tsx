import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PanelProps } from '../../../src/types.js';

interface LogViewData {
  title?: string;
  content: string;
  color?: string;
}

export function LogViewPanel(props: PanelProps<LogViewData>) {
  const { data, width, height, updateState } = props;
  const { title, content, color } = data;
  const lines = content.split('\n');

  const [scrollOffset, setScrollOffset] = useState(0);
  const headerLines = title ? 2 : 0;
  const footerLines = 1;
  const visibleLines = Math.max(1, height - headerLines - footerLines);

  useEffect(() => {
    updateState({ title: title ?? 'Log', lines: lines.length, scrollOffset });
  }, [scrollOffset]);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setScrollOffset(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setScrollOffset(prev => Math.min(Math.max(0, lines.length - visibleLines), prev + 1));
    } else if (input === 'g') {
      setScrollOffset(0);
    } else if (input === 'G') {
      setScrollOffset(Math.max(0, lines.length - visibleLines));
    } else if (key.pageUp) {
      setScrollOffset(prev => Math.max(0, prev - visibleLines));
    } else if (key.pageDown) {
      setScrollOffset(prev => Math.min(Math.max(0, lines.length - visibleLines), prev + visibleLines));
    }
  });

  const windowLines = lines.slice(scrollOffset, scrollOffset + visibleLines);

  return (
    <Box flexDirection="column" width={width} height={height}>
      {title && (
        <>
          <Box>
            <Text bold color="cyan">{title}</Text>
            <Text dimColor> ({lines.length} lines)</Text>
          </Box>
          <Box>
            <Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text>
          </Box>
        </>
      )}

      {windowLines.map((line, i) => {
        // Support ~text~ for strikethrough+dim styling
        const strikeMatch = line.match(/^(.*?)~(.+)~(.*)$/);
        if (strikeMatch) {
          return (
            <Box key={scrollOffset + i}>
              <Text color={color as any}>{strikeMatch[1]}</Text>
              <Text strikethrough dimColor>{strikeMatch[2]}</Text>
              <Text color={color as any}>{strikeMatch[3]}</Text>
            </Box>
          );
        }
        return (
          <Box key={scrollOffset + i}>
            <Text color={color as any}>{line}</Text>
          </Box>
        );
      })}

      <Box flexGrow={1} />

      <Box justifyContent="space-between" width={width}>
        <Text dimColor>
          {lines.length > visibleLines
            ? `${scrollOffset + 1}-${Math.min(scrollOffset + visibleLines, lines.length)}/${lines.length}`
            : `${lines.length} lines`}
        </Text>
        <Text dimColor>j/k:scroll  g/G:top/bottom</Text>
      </Box>
    </Box>
  );
}
