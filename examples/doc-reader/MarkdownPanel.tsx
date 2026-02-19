/**
 * Markdown rendering panel using marked + marked-terminal.
 * Renders headers, bold, italic, code blocks, lists, links etc. with ANSI styling.
 * Scrollable with vim keys.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import type { PanelProps } from '../../src/types.js';

// Configure marked with terminal renderer
marked.use(markedTerminal({
  width: 120,
  reflowText: true,
  showSectionPrefix: false,
}));

interface MarkdownPanelData {
  title: string;
  content: string;
  filePath?: string;
}

export function MarkdownPanel(props: PanelProps<MarkdownPanelData>) {
  const { data, width, height, updateState } = props;
  const { title, content, filePath } = data;

  const [scrollOffset, setScrollOffset] = useState(0);
  const headerLines = 2;
  const footerLines = 1;
  const visibleLines = Math.max(1, height - headerLines - footerLines);

  // Render markdown to ANSI string, then split into lines
  const rendered = useMemo(() => {
    try {
      const result = marked.parse(content);
      const str = typeof result === 'string' ? result : '';
      return str.trimEnd().split('\n');
    } catch {
      return content.split('\n');
    }
  }, [content]);

  useEffect(() => {
    updateState({ title, lines: rendered.length, scrollOffset, filePath });
  }, [scrollOffset]);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setScrollOffset(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setScrollOffset(prev => Math.min(Math.max(0, rendered.length - visibleLines), prev + 1));
    } else if (input === 'g') {
      setScrollOffset(0);
    } else if (input === 'G') {
      setScrollOffset(Math.max(0, rendered.length - visibleLines));
    } else if (key.pageUp) {
      setScrollOffset(prev => Math.max(0, prev - visibleLines));
    } else if (key.pageDown) {
      setScrollOffset(prev => Math.min(Math.max(0, rendered.length - visibleLines), prev + visibleLines));
    }
  });

  const windowedLines = rendered.slice(scrollOffset, scrollOffset + visibleLines);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="green">{title}</Text>
        <Text dimColor> ({rendered.length} lines)</Text>
      </Box>
      <Box>
        <Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text>
      </Box>

      {windowedLines.map((line, i) => (
        <Box key={scrollOffset + i}>
          <Text>{line}</Text>
        </Box>
      ))}

      <Box flexGrow={1} />

      <Box justifyContent="space-between" width={width}>
        <Text dimColor>
          {rendered.length > visibleLines
            ? `${scrollOffset + 1}-${Math.min(scrollOffset + visibleLines, rendered.length)}/${rendered.length}`
            : `${rendered.length} lines`}
        </Text>
        <Text dimColor>j/k:scroll  g/G:top/bottom  PgUp/PgDn</Text>
      </Box>
    </Box>
  );
}
