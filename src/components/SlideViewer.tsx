/**
 * SlideViewer — Full-screen terminal slide presentation viewer.
 *
 * Renders an array of Slide objects as a navigable presentation.
 * Each slide's `body` is markdown, rendered via marked + marked-terminal.
 *
 * Navigation:
 *   left/h  — previous slide
 *   right/l — next slide
 *   g       — first slide
 *   G       — last slide
 *   j/k     — scroll within slide
 *   PgUp/Dn — page scroll
 *   q       — quit (at root)
 *   Q       — quit (from anywhere)
 *
 * Usage:
 *   import { SlideViewer } from 'ink-panels';
 *   import type { Slide } from 'ink-panels';
 *
 *   const slides: Slide[] = [
 *     { title: 'Intro', body: '# Hello\n\nWelcome.' },
 *     { title: 'Details', body: '# Details\n\n- Point 1\n- Point 2' },
 *   ];
 *
 *   render(<SlideViewer slides={slides} onExit={() => process.exit(0)} />);
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { PanelStack } from './PanelStack.js';
import type { PanelConfig, PanelProps, Slide } from '../types.js';

// ─── Slide Panel ──────────────────────────────────────────

interface SlidePanelData {
  slides: Slide[];
  startIndex?: number;
}

function SlidePanel(props: PanelProps<SlidePanelData>) {
  const { data, width, height, updateState } = props;
  const { slides, startIndex } = data;

  const [currentIndex, setCurrentIndex] = useState(startIndex ?? 0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const slide = slides[currentIndex]!;
  const total = slides.length;

  // Configure marked for current terminal width
  const renderer = useMemo(() => {
    marked.use(markedTerminal({
      width: Math.min(width - 6, 100),
      reflowText: true,
      showSectionPrefix: false,
    }));
    return marked;
  }, [width]);

  // Render current slide's markdown
  const renderedLines = useMemo(() => {
    try {
      const result = renderer.parse(slide.body);
      const str = typeof result === 'string' ? result : '';
      return str.trimEnd().split('\n');
    } catch {
      return slide.body.split('\n');
    }
  }, [slide.body, renderer]);

  // Reset scroll when slide changes
  useEffect(() => {
    setScrollOffset(0);
  }, [currentIndex]);

  // Update state for Claude integration
  useEffect(() => {
    updateState({
      slide: currentIndex + 1,
      total,
      title: slide.title,
    });
  }, [currentIndex]);

  const headerLines = 0;
  const footerLines = 3;
  const visibleLines = Math.max(1, height - headerLines - footerLines);

  useInput((input: string, key: any) => {
    // Slide navigation
    if (key.rightArrow || input === 'l') {
      if (currentIndex < total - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    } else if (key.leftArrow || input === 'h') {
      if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    } else if (input === 'g') {
      setCurrentIndex(0);
    } else if (input === 'G') {
      setCurrentIndex(total - 1);
    }
    // Scroll within slide
    else if (key.downArrow || input === 'j') {
      setScrollOffset(prev =>
        Math.min(Math.max(0, renderedLines.length - visibleLines), prev + 1)
      );
    } else if (key.upArrow || input === 'k') {
      setScrollOffset(prev => Math.max(0, prev - 1));
    } else if (key.pageDown) {
      setScrollOffset(prev =>
        Math.min(Math.max(0, renderedLines.length - visibleLines), prev + visibleLines)
      );
    } else if (key.pageUp) {
      setScrollOffset(prev => Math.max(0, prev - visibleLines));
    }
  });

  // Build progress bar
  const barWidth = Math.min(width - 4, 60);
  const progress = total > 1 ? currentIndex / (total - 1) : 1;
  const filled = Math.round(progress * barWidth);
  const progressBar = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);

  // Content area with padding
  const windowedLines = renderedLines.slice(scrollOffset, scrollOffset + visibleLines);
  const needsScroll = renderedLines.length > visibleLines;

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Slide content */}
      <Box flexDirection="column" paddingLeft={2} paddingRight={2} flexGrow={1}>
        {windowedLines.map((line, i) => (
          <Box key={scrollOffset + i}>
            <Text>{line}</Text>
          </Box>
        ))}
      </Box>

      {/* Scroll indicator */}
      {needsScroll && (
        <Box justifyContent="flex-end" paddingRight={2}>
          <Text dimColor>
            {scrollOffset > 0 ? '...' : '   '}
            {' '}
            {scrollOffset + visibleLines < renderedLines.length ? 'j:more' : '     '}
          </Text>
        </Box>
      )}

      {/* Progress bar */}
      <Box paddingLeft={2}>
        <Text dimColor>{progressBar}</Text>
        <Text bold> {currentIndex + 1}/{total}</Text>
      </Box>

      {/* Navigation hint */}
      <Box justifyContent="space-between" width={width} paddingLeft={2} paddingRight={2}>
        <Text dimColor>{slide.title}</Text>
        <Text dimColor>
          {currentIndex > 0 ? '<' : ' '}
          {' h/l:slide  j/k:scroll  '}
          {currentIndex < total - 1 ? '>' : ' '}
        </Text>
      </Box>
    </Box>
  );
}

// ─── Main Export ──────────────────────────────────────────

export interface SlideViewerProps {
  /** Array of slides to present */
  slides: Slide[];
  /** App name for state file integration */
  appName?: string;
  /** 0-indexed starting slide */
  startSlide?: number;
  /** Called when user quits (q at root or Q anywhere) */
  onExit?: () => void;
}

export function SlideViewer({ slides, appName = 'slide-deck', startSlide = 0, onExit }: SlideViewerProps) {
  const rootPanel: PanelConfig = {
    id: 'slides',
    title: 'Slides',
    component: SlidePanel as any,
    data: { slides, startIndex: startSlide },
    state: { slide: 1, total: slides.length },
  };

  return <PanelStack initialPanel={rootPanel} appName={appName} onExit={onExit} />;
}
