import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import { useInputLock } from '../../src/hooks/useInputLock.js';
import type { PanelProps } from '../../src/types.js';

// ─── Big ASCII Digits (5 lines tall, 5 chars wide) ───────

const DIGITS: Record<string, string[]> = {
  '0': [
    ' ███ ',
    '█   █',
    '█   █',
    '█   █',
    ' ███ ',
  ],
  '1': [
    '  █  ',
    ' ██  ',
    '  █  ',
    '  █  ',
    ' ███ ',
  ],
  '2': [
    ' ███ ',
    '█   █',
    '  ██ ',
    ' █   ',
    '█████',
  ],
  '3': [
    '█████',
    '   █ ',
    ' ███ ',
    '    █',
    '████ ',
  ],
  '4': [
    '█   █',
    '█   █',
    '█████',
    '    █',
    '    █',
  ],
  '5': [
    '█████',
    '█    ',
    '████ ',
    '    █',
    '████ ',
  ],
  '6': [
    ' ███ ',
    '█    ',
    '████ ',
    '█   █',
    ' ███ ',
  ],
  '7': [
    '█████',
    '    █',
    '   █ ',
    '  █  ',
    '  █  ',
  ],
  '8': [
    ' ███ ',
    '█   █',
    ' ███ ',
    '█   █',
    ' ███ ',
  ],
  '9': [
    ' ███ ',
    '█   █',
    ' ████',
    '    █',
    ' ███ ',
  ],
  ':': [
    '     ',
    '  █  ',
    '     ',
    '  █  ',
    '     ',
  ],
  ' ': [
    '     ',
    '     ',
    '     ',
    '     ',
    '     ',
  ],
};

function renderBigText(text: string): string[] {
  const lines: string[] = ['', '', '', '', ''];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const glyph = DIGITS[ch] || DIGITS[' '];
    for (let row = 0; row < 5; row++) {
      lines[row] += (i > 0 ? ' ' : '') + glyph[row];
    }
  }
  return lines;
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

// ─── Types ────────────────────────────────────────────────

type Mode = 'clock' | 'timer-set' | 'timer-run' | 'timer-paused' | 'timer-done';
type TimerField = 'h' | 'm' | 's';

export interface ClockData {
  title?: string;
}

// ─── Component ────────────────────────────────────────────

export function ClockPanel(props: PanelProps<ClockData>) {
  const { width, height, updateState } = props;
  const inputLock = useInputLock();

  const [mode, setMode] = useState<Mode>('clock');
  const [now, setNow] = useState(new Date());

  // Timer state
  const [timerH, setTimerH] = useState(0);
  const [timerM, setTimerM] = useState(0);
  const [timerS, setTimerS] = useState(0);
  const [selectedField, setSelectedField] = useState<TimerField>('m');
  const [remaining, setRemaining] = useState(0); // seconds remaining
  const [totalSet, setTotalSet] = useState(0);    // total seconds that were set
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Flash state
  const [flashCount, setFlashCount] = useState(0);
  const [flashOn, setFlashOn] = useState(false);
  const flashRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (mode === 'timer-run' && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [mode, remaining > 0]);

  // Detect timer reaching zero
  useEffect(() => {
    if (mode === 'timer-run' && remaining === 0 && totalSet > 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setMode('timer-done');
      // Start flashing
      setFlashCount(0);
      setFlashOn(true);
    }
  }, [remaining, mode, totalSet]);

  // Flash animation (3 flashes = 6 transitions over ~1.8s)
  useEffect(() => {
    if (mode === 'timer-done' && flashCount < 6) {
      flashRef.current = setTimeout(() => {
        setFlashOn(prev => !prev);
        setFlashCount(prev => prev + 1);
      }, 300);
      return () => {
        if (flashRef.current) clearTimeout(flashRef.current);
      };
    }
  }, [mode, flashCount]);

  // Update Claude state
  useEffect(() => {
    updateState({
      mode,
      ...(mode === 'clock'
        ? { time: now.toLocaleTimeString() }
        : { remaining, totalSet }),
    });
  }, [mode, now, remaining]);

  // Lock input during timer-set so PanelStack doesn't intercept keys
  useEffect(() => {
    if (mode === 'timer-set') {
      inputLock.lock();
    } else {
      inputLock.unlock();
    }
    return () => { inputLock.unlock(); };
  }, [mode]);

  // ─── Input Handling ───────────────────────────────────

  useInput((input, key) => {
    if (mode === 'clock') {
      if (input === 't') {
        setMode('timer-set');
        setTimerH(0);
        setTimerM(5);
        setTimerS(0);
        setSelectedField('m');
      }
      return;
    }

    if (mode === 'timer-set') {
      // Field selection
      if (key.leftArrow || input === 'h') {
        setSelectedField(prev => prev === 's' ? 'm' : prev === 'm' ? 'h' : 'h');
        return;
      }
      if (key.rightArrow || input === 'l') {
        setSelectedField(prev => prev === 'h' ? 'm' : prev === 'm' ? 's' : 's');
        return;
      }

      // Increment/decrement
      const inc = key.upArrow || input === 'k' ? 1 : key.downArrow || input === 'j' ? -1 : 0;
      if (inc !== 0) {
        if (selectedField === 'h') setTimerH(prev => Math.max(0, Math.min(99, prev + inc)));
        if (selectedField === 'm') setTimerM(prev => Math.max(0, Math.min(59, prev + inc)));
        if (selectedField === 's') setTimerS(prev => Math.max(0, Math.min(59, prev + inc)));
        return;
      }

      // Start
      if (key.return || input === ' ') {
        const total = timerH * 3600 + timerM * 60 + timerS;
        if (total > 0) {
          setRemaining(total);
          setTotalSet(total);
          setMode('timer-run');
        }
        return;
      }

      // Back to clock
      if (key.escape) {
        setMode('clock');
        return;
      }
      return;
    }

    if (mode === 'timer-run') {
      if (input === ' ' || key.return) {
        setMode('timer-paused');
        return;
      }
      if (input === 'r') {
        setRemaining(0);
        setTotalSet(0);
        setMode('timer-set');
        return;
      }
      if (input === 'c') {
        setRemaining(0);
        setTotalSet(0);
        setMode('clock');
        return;
      }
      return;
    }

    if (mode === 'timer-paused') {
      if (input === ' ' || key.return) {
        setMode('timer-run');
        return;
      }
      if (input === 'r') {
        setRemaining(totalSet);
        setMode('timer-run');
        return;
      }
      if (input === 'c') {
        setRemaining(0);
        setTotalSet(0);
        setMode('clock');
        return;
      }
      return;
    }

    if (mode === 'timer-done') {
      // Any key goes back
      setMode('timer-set');
      setFlashOn(false);
      setFlashCount(6);
      return;
    }
  });

  // ─── Rendering ────────────────────────────────────────

  const isFlashing = mode === 'timer-done' && flashOn;

  // Build the time string to render
  let displayTime: string;
  let label: string;

  if (mode === 'clock') {
    const h = pad2(now.getHours());
    const m = pad2(now.getMinutes());
    const s = pad2(now.getSeconds());
    displayTime = `${h}:${m}:${s}`;
    label = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } else if (mode === 'timer-set') {
    displayTime = `${pad2(timerH)}:${pad2(timerM)}:${pad2(timerS)}`;
    label = 'Set Timer';
  } else {
    // timer-run, timer-paused, timer-done
    const rh = Math.floor(remaining / 3600);
    const rm = Math.floor((remaining % 3600) / 60);
    const rs = remaining % 60;
    displayTime = `${pad2(rh)}:${pad2(rm)}:${pad2(rs)}`;
    label = mode === 'timer-run' ? 'Timer Running'
          : mode === 'timer-paused' ? 'Timer Paused'
          : 'Time\'s Up!';
  }

  const bigLines = renderBigText(displayTime);
  const digitColor = isFlashing ? 'red'
    : mode === 'timer-done' ? 'red'
    : mode === 'timer-paused' ? 'yellow'
    : mode === 'timer-run' ? 'green'
    : mode === 'timer-set' ? 'cyan'
    : 'white';

  // Field labels for timer-set mode

  // Progress bar for running timer
  let progressBar = '';
  if ((mode === 'timer-run' || mode === 'timer-paused') && totalSet > 0) {
    const barWidth = Math.min(width - 4, 50);
    const filled = Math.round((1 - remaining / totalSet) * barWidth);
    progressBar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
  }

  // Status bar
  let statusText: string;
  if (mode === 'clock') {
    statusText = 't:timer  q:quit';
  } else if (mode === 'timer-set') {
    statusText = '←/→:field  ↑/↓:adjust  Enter:start  Esc:back';
  } else if (mode === 'timer-run') {
    statusText = 'Space:pause  r:reset  c:clock';
  } else if (mode === 'timer-paused') {
    statusText = 'Space:resume  r:restart  c:clock';
  } else {
    statusText = 'Press any key...';
  }

  return (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      width={width}
      height={height}
      borderStyle={isFlashing ? 'bold' : undefined}
      borderColor={isFlashing ? 'red' : undefined}
    >
      {/* Top spacer */}
      <Box flexGrow={1} />

      {/* Label */}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color={isFlashing ? 'red' : 'gray'}>
          {label}
        </Text>
      </Box>

      {/* Big digits */}
      <Box flexDirection="column" alignItems="center">
        {bigLines.map((line, i) => (
          <Box key={`digit-line-${i}`} justifyContent="center">
            <Text color={digitColor} bold={isFlashing}>
              {line}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Field selector for timer-set */}
      {mode === 'timer-set' && (
        <Box justifyContent="center" marginTop={1} gap={4}>
          <Text color={selectedField === 'h' ? 'cyan' : 'gray'} bold={selectedField === 'h'}>
            {selectedField === 'h' ? '[ Hours ]' : '  Hours  '}
          </Text>
          <Text color={selectedField === 'm' ? 'cyan' : 'gray'} bold={selectedField === 'm'}>
            {selectedField === 'm' ? '[ Minutes ]' : '  Minutes  '}
          </Text>
          <Text color={selectedField === 's' ? 'cyan' : 'gray'} bold={selectedField === 's'}>
            {selectedField === 's' ? '[ Seconds ]' : '  Seconds  '}
          </Text>
        </Box>
      )}

      {/* Progress bar */}
      {progressBar && (
        <Box justifyContent="center" marginTop={1}>
          <Text color={mode === 'timer-paused' ? 'yellow' : 'green'}>
            {progressBar}
          </Text>
        </Box>
      )}

      {/* Bottom spacer */}
      <Box flexGrow={1} />

      {/* Status bar */}
      <Box justifyContent="center">
        <Text dimColor>{statusText}</Text>
      </Box>
    </Box>
  );
}
