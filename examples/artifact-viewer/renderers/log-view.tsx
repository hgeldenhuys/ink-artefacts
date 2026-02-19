import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import SyntaxHighlight from 'ink-syntax-highlight';
import type { PanelProps } from '../../../src/types.js';

interface LogViewData {
  title?: string;
  content: string;
  color?: string;
}

// ─── Line segment types ──────────────────────────────────
// Pre-process content into segments so code blocks get syntax highlighted.

interface TextSegment {
  type: 'text';
  line: string;
}

interface CodeSegment {
  type: 'code';
  language: string;
  code: string;  // The full code block (for SyntaxHighlight)
  line: string;  // Individual line within the block (for display)
}

type LineSegment = TextSegment | CodeSegment;

function parseContent(content: string): LineSegment[] {
  const rawLines = content.split('\n');
  const segments: LineSegment[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];

  for (const rawLine of rawLines) {
    const fenceMatch = rawLine.match(/^```(\w*)$/);

    if (fenceMatch && !inCodeBlock) {
      // Opening fence
      inCodeBlock = true;
      codeLang = fenceMatch[1] || '';
      codeLines = [];
    } else if (rawLine.trim() === '```' && inCodeBlock) {
      // Closing fence — emit all collected code lines as CodeSegments
      const fullCode = codeLines.join('\n');
      for (const cl of codeLines) {
        segments.push({ type: 'code', language: codeLang, code: cl, line: cl });
      }
      inCodeBlock = false;
      codeLang = '';
      codeLines = [];
    } else if (inCodeBlock) {
      codeLines.push(rawLine);
    } else {
      segments.push({ type: 'text', line: rawLine });
    }
  }

  // If we ended inside an unclosed code block, emit remaining lines as code
  if (inCodeBlock) {
    for (const cl of codeLines) {
      segments.push({ type: 'code', language: codeLang, code: cl, line: cl });
    }
  }

  return segments;
}

// ─── Line renderer ───────────────────────────────────────

function LogLine({ segment, color, width }: { segment: LineSegment; color?: string; width: number }) {
  if (segment.type === 'code') {
    return (
      <Box>
        <Text dimColor>  </Text>
        <SyntaxHighlight code={segment.line.slice(0, width - 4)} language={segment.language || undefined} />
      </Box>
    );
  }

  const { line } = segment;

  // Support ~text~ for strikethrough+dim styling
  const strikeMatch = line.match(/^(.*?)~(.+)~(.*)$/);
  if (strikeMatch) {
    return (
      <Box>
        <Text color={color as any}>{strikeMatch[1]}</Text>
        <Text strikethrough dimColor>{strikeMatch[2]}</Text>
        <Text color={color as any}>{strikeMatch[3]}</Text>
      </Box>
    );
  }

  // Support **text** for bold
  const boldMatch = line.match(/^(.*?)\*\*(.+?)\*\*(.*)$/);
  if (boldMatch) {
    return (
      <Box>
        <Text color={color as any}>{boldMatch[1]}</Text>
        <Text bold color={color as any}>{boldMatch[2]}</Text>
        <Text color={color as any}>{boldMatch[3]}</Text>
      </Box>
    );
  }

  // Lines starting with # are rendered as headers
  const headerMatch = line.match(/^(#{1,3})\s+(.+)$/);
  if (headerMatch) {
    const level = headerMatch[1].length;
    const headerColors = ['cyan', 'green', 'yellow'];
    return (
      <Box>
        <Text bold color={headerColors[level - 1] as any}>{headerMatch[2]}</Text>
      </Box>
    );
  }

  // Lines starting with - are rendered as list items
  if (line.match(/^\s*[-*]\s/)) {
    return (
      <Box>
        <Text color={color as any}>{line.replace(/^(\s*)[-*]/, '$1\u2022')}</Text>
      </Box>
    );
  }

  // Lines starting with > are rendered as blockquotes
  if (line.startsWith('>')) {
    return (
      <Box>
        <Text dimColor color="gray">{'\u2502 '}{line.slice(1).trim()}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text color={color as any}>{line}</Text>
    </Box>
  );
}

// ─── Main component ──────────────────────────────────────

export function LogViewPanel(props: PanelProps<LogViewData>) {
  const { data, width, height, updateState } = props;
  const { title, content, color } = data;

  const segments = useMemo(() => parseContent(content), [content]);

  const [scrollOffset, setScrollOffset] = useState(0);
  const headerLines = title ? 2 : 0;
  const footerLines = 1;
  const visibleLines = Math.max(1, height - headerLines - footerLines);

  useEffect(() => {
    updateState({ title: title ?? 'Log', lines: segments.length, scrollOffset });
  }, [scrollOffset]);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setScrollOffset(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setScrollOffset(prev => Math.min(Math.max(0, segments.length - visibleLines), prev + 1));
    } else if (input === 'g') {
      setScrollOffset(0);
    } else if (input === 'G') {
      setScrollOffset(Math.max(0, segments.length - visibleLines));
    } else if (key.pageUp) {
      setScrollOffset(prev => Math.max(0, prev - visibleLines));
    } else if (key.pageDown) {
      setScrollOffset(prev => Math.min(Math.max(0, segments.length - visibleLines), prev + visibleLines));
    }
  });

  const windowSegments = segments.slice(scrollOffset, scrollOffset + visibleLines);

  return (
    <Box flexDirection="column" width={width} height={height}>
      {title && (
        <>
          <Box>
            <Text bold color="cyan">{title}</Text>
            <Text dimColor> ({segments.length} lines)</Text>
          </Box>
          <Box>
            <Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text>
          </Box>
        </>
      )}

      {windowSegments.map((segment, i) => (
        <LogLine key={scrollOffset + i} segment={segment} color={color} width={width} />
      ))}

      <Box flexGrow={1} />

      <Box justifyContent="space-between" width={width}>
        <Text dimColor>
          {segments.length > visibleLines
            ? `${scrollOffset + 1}-${Math.min(scrollOffset + visibleLines, segments.length)}/${segments.length}`
            : `${segments.length} lines`}
        </Text>
        <Text dimColor>j/k:scroll  g/G:top/bottom</Text>
      </Box>
    </Box>
  );
}
