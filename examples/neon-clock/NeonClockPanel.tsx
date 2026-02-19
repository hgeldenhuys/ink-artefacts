import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import type { PanelProps } from '../../src/types.js';

// ─── Neon color themes that cycle ─────────────────────────

interface NeonTheme {
  name: string;
  gradient: string[];
  accent: string;
  dim: string;
}

const THEMES: NeonTheme[] = [
  { name: 'Cyberpunk', gradient: ['#ff00ff', '#00ffff'], accent: '#ff00ff', dim: '#660066' },
  { name: 'Synthwave', gradient: ['#ff6ec7', '#7b68ee'], accent: '#ff6ec7', dim: '#4a0040' },
  { name: 'Neon Blue', gradient: ['#00d4ff', '#0040ff'], accent: '#00d4ff', dim: '#002266' },
  { name: 'Toxic', gradient: ['#39ff14', '#00ff87'], accent: '#39ff14', dim: '#004d00' },
  { name: 'Sunset', gradient: ['#ff4500', '#ff8c00', '#ffd700'], accent: '#ff8c00', dim: '#4d2600' },
  { name: 'Vaporwave', gradient: ['#ff71ce', '#01cdfe', '#05ffa1'], accent: '#01cdfe', dim: '#003344' },
];

// ─── ASCII art frames ─────────────────────────────────────

function neonBorder(width: number, ch: string = '═'): string {
  return ch.repeat(Math.min(width, 200));
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

// ─── Component ────────────────────────────────────────────

export interface NeonClockData {
  title?: string;
}

export function NeonClockPanel(props: PanelProps<NeonClockData>) {
  const { width, height, updateState } = props;

  const [now, setNow] = useState(new Date());
  const [themeIndex, setThemeIndex] = useState(0);
  // Tick every second
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Cycle theme every 30 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setThemeIndex(prev => (prev + 1) % THEMES.length);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Update Claude state
  useEffect(() => {
    updateState({
      time: now.toLocaleTimeString(),
      theme: THEMES[themeIndex].name,
    });
  }, [now, themeIndex]);

  const theme = THEMES[themeIndex];
  const hours = pad2(now.getHours());
  const minutes = pad2(now.getMinutes());
  const seconds = pad2(now.getSeconds());
  const timeStr = `${hours}:${minutes}:${seconds}`;

  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const borderWidth = Math.min(width - 4, 60);

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width={width}
      height={height}
    >
      <Box flexGrow={1} />

      {/* Top neon border */}
      <Box justifyContent="center">
        <Gradient name="rainbow">
          <Text>{neonBorder(borderWidth)}</Text>
        </Gradient>
      </Box>

      <Box height={1} />

      {/* Theme name */}
      <Box justifyContent="center">
        <Text color={theme.accent} dimColor>
          {'~ '}{theme.name.toUpperCase()}{' ~'}
        </Text>
      </Box>

      <Box height={1} />

      {/* Big gradient time */}
      <Box justifyContent="center">
        <Gradient colors={theme.gradient}>
          <BigText text={timeStr} font="chrome" />
        </Gradient>
      </Box>

      {/* Date */}
      <Box justifyContent="center">
        <Gradient colors={theme.gradient}>
          <Text bold>{dateStr}</Text>
        </Gradient>
      </Box>

      <Box height={1} />

      {/* Seconds bar */}
      <Box justifyContent="center">
        <NeonSecondsBar seconds={now.getSeconds()} width={borderWidth} theme={theme} />
      </Box>

      <Box height={1} />

      {/* Bottom neon border */}
      <Box justifyContent="center">
        <Gradient name="rainbow">
          <Text>{neonBorder(borderWidth)}</Text>
        </Gradient>
      </Box>

      <Box flexGrow={1} />

      {/* Status */}
      <Box justifyContent="center" gap={3}>
        <Text dimColor>Theme: {theme.name} (cycles every 30s)</Text>
        <Text dimColor>q: quit</Text>
      </Box>
    </Box>
  );
}

// ─── Neon seconds progress bar ────────────────────────────

function NeonSecondsBar({ seconds, width, theme }: { seconds: number; width: number; theme: NeonTheme }) {
  const filled = Math.round((seconds / 59) * width);
  const empty = width - filled;

  return (
    <Box>
      <Gradient colors={theme.gradient}>
        <Text>{'█'.repeat(filled)}</Text>
      </Gradient>
      <Text color={theme.dim}>{'░'.repeat(empty)}</Text>
    </Box>
  );
}
