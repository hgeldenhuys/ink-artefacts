/**
 * Syntax-highlighted code viewer panel using ink-syntax-highlight.
 * Scrollable with vim keys, line numbers, language detection.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import SyntaxHighlight from 'ink-syntax-highlight';
import type { PanelProps } from '../../src/types.js';

interface CodePanelData {
  title: string;
  code: string;
  language?: string;
  filePath?: string;
}

export function CodePanel(props: PanelProps<CodePanelData>) {
  const { data, width, height, updateState } = props;
  const { title, code, language, filePath } = data;

  const [scrollOffset, setScrollOffset] = useState(0);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const headerLines = 2;
  const footerLines = 1;
  const visibleLines = Math.max(1, height - headerLines - footerLines);

  const allLines = useMemo(() => code.split('\n'), [code]);
  const gutterWidth = showLineNumbers ? String(allLines.length).length + 2 : 0;

  useEffect(() => {
    updateState({ title, lines: allLines.length, scrollOffset, language, filePath });
  }, [scrollOffset]);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setScrollOffset(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setScrollOffset(prev => Math.min(Math.max(0, allLines.length - visibleLines), prev + 1));
    } else if (input === 'g') {
      setScrollOffset(0);
    } else if (input === 'G') {
      setScrollOffset(Math.max(0, allLines.length - visibleLines));
    } else if (key.pageUp) {
      setScrollOffset(prev => Math.max(0, prev - visibleLines));
    } else if (key.pageDown) {
      setScrollOffset(prev => Math.min(Math.max(0, allLines.length - visibleLines), prev + visibleLines));
    } else if (input === 'n') {
      setShowLineNumbers(prev => !prev);
    }
  });

  // Window the code for display
  const windowedLines = allLines.slice(scrollOffset, scrollOffset + visibleLines);
  const windowedCode = windowedLines.join('\n');

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Header */}
      <Box>
        <Text bold color="yellow">{title}</Text>
        <Text dimColor> ({allLines.length} lines</Text>
        {language && <Text dimColor>, {language}</Text>}
        <Text dimColor>)</Text>
      </Box>
      <Box>
        <Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text>
      </Box>

      {/* Code with optional line numbers */}
      {windowedLines.map((line, i) => {
        const lineNum = scrollOffset + i + 1;
        const codePart = line.slice(0, width - gutterWidth - 1);
        return (
          <Box key={scrollOffset + i}>
            {showLineNumbers && (
              <Text dimColor>{String(lineNum).padStart(gutterWidth - 1)} </Text>
            )}
            <SyntaxHighlight code={codePart} language={language} />
          </Box>
        );
      })}

      <Box flexGrow={1} />

      {/* Footer */}
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>
          {allLines.length > visibleLines
            ? `${scrollOffset + 1}-${Math.min(scrollOffset + visibleLines, allLines.length)}/${allLines.length}`
            : `${allLines.length} lines`}
        </Text>
        <Text dimColor>j/k:scroll  g/G:top/bottom  n:line numbers</Text>
      </Box>
    </Box>
  );
}
