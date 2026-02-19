/**
 * System Monitor — Real-time dashboard showing CPU, memory, disk, and processes.
 *
 * Features:
 * - Live CPU usage with sparkline history
 * - Memory usage with progress bar
 * - Disk usage overview
 * - Top processes by CPU
 * - Auto-refreshes every second
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import {
  getCpuUsage, getMemoryMetrics, getDiskMetrics,
  getTopProcesses, getSystemInfo, formatBytes,
  sparkline, progressBar,
  type CpuMetrics, type MemoryMetrics, type DiskMetrics,
  type ProcessInfo, type SystemInfo,
} from './metrics.js';
import { cpus, loadavg } from 'os';

interface MonitorState {
  cpu: { usage: number; history: number[] };
  memory: MemoryMetrics;
  disks: DiskMetrics[];
  processes: ProcessInfo[];
  system: SystemInfo;
  tick: number;
}

export function SystemMonitor() {
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState({
    width: stdout.columns || 80,
    height: stdout.rows || 24,
  });

  const memHistoryRef = useRef<number[]>([]);
  const cpuHistoryRef = useRef<number[]>([]);

  // Initialize CPU baseline
  useEffect(() => { getCpuUsage(); }, []);

  const [state, setState] = useState<MonitorState>(() => {
    const memMetrics = getMemoryMetrics(memHistoryRef.current);
    return {
      cpu: { usage: 0, history: [] },
      memory: memMetrics,
      disks: getDiskMetrics(),
      processes: getTopProcesses(8),
      system: getSystemInfo(),
      tick: 0,
    };
  });

  useEffect(() => {
    const onResize = () => {
      setDimensions({ width: stdout.columns || 80, height: stdout.rows || 24 });
    };
    stdout.on('resize', onResize);
    return () => { stdout.off('resize', onResize); };
  }, [stdout]);

  // Refresh every 1.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const cpuUsage = getCpuUsage();
      cpuHistoryRef.current.push(cpuUsage);
      if (cpuHistoryRef.current.length > 60) cpuHistoryRef.current.shift();

      const memMetrics = getMemoryMetrics(memHistoryRef.current);

      setState({
        cpu: { usage: cpuUsage, history: [...cpuHistoryRef.current] },
        memory: memMetrics,
        disks: getDiskMetrics(),
        processes: getTopProcesses(8),
        system: getSystemInfo(),
        tick: Date.now(),
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  useInput((input, key) => {
    if (input === 'q' && key.ctrl) {
      process.exit(0);
    }
  });

  const { width, height } = dimensions;
  const coreInfo = cpus();
  const loads = loadavg();
  const barWidth = Math.min(30, Math.max(10, Math.floor(width / 3)));
  const sparkWidth = Math.min(40, Math.max(10, width - 45));

  // Color based on usage level
  const usageColor = (pct: number): string => {
    if (pct >= 90) return 'red';
    if (pct >= 70) return 'yellow';
    if (pct >= 40) return 'cyan';
    return 'green';
  };

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Header */}
      <Box justifyContent="space-between" width={width}>
        <Box>
          <Text bold color="cyan"> System Monitor</Text>
          <Text dimColor> — {state.system.hostname}</Text>
        </Box>
        <Box>
          <Text dimColor>up {state.system.uptime} | {state.system.platform} | {coreInfo.length} cores</Text>
        </Box>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {/* CPU Section */}
      <Box flexDirection="column" paddingLeft={1} marginTop={0}>
        <Box>
          <Text bold>CPU </Text>
          <Text color={usageColor(state.cpu.usage) as any}>{String(state.cpu.usage).padStart(3)}%</Text>
          <Text> </Text>
          <Text color={usageColor(state.cpu.usage) as any}>{progressBar(state.cpu.usage, barWidth)}</Text>
          <Text dimColor> load: {loads.map(l => l.toFixed(2)).join(' ')}</Text>
        </Box>
        <Box paddingLeft={5}>
          <Text dimColor>60s: </Text>
          <Text color="cyan">{sparkline(state.cpu.history.slice(-sparkWidth), 100)}</Text>
        </Box>
      </Box>

      {/* Memory Section */}
      <Box flexDirection="column" paddingLeft={1} marginTop={1}>
        <Box>
          <Text bold>MEM </Text>
          <Text color={usageColor(state.memory.usagePercent) as any}>
            {String(state.memory.usagePercent).padStart(3)}%
          </Text>
          <Text> </Text>
          <Text color={usageColor(state.memory.usagePercent) as any}>
            {progressBar(state.memory.usagePercent, barWidth)}
          </Text>
          <Text dimColor> {formatBytes(state.memory.used)} / {formatBytes(state.memory.total)}</Text>
        </Box>
        <Box paddingLeft={5}>
          <Text dimColor>60s: </Text>
          <Text color="magenta">{sparkline(state.memory.history.slice(-sparkWidth), 100)}</Text>
        </Box>
      </Box>

      {/* Disk Section */}
      <Box flexDirection="column" paddingLeft={1} marginTop={1}>
        <Text bold>DISK</Text>
        {state.disks.slice(0, 3).map((disk, i) => (
          <Box key={i}>
            <Text> </Text>
            <Text color={usageColor(disk.usagePercent) as any}>
              {String(disk.usagePercent).padStart(3)}%
            </Text>
            <Text> </Text>
            <Text color={usageColor(disk.usagePercent) as any}>
              {progressBar(disk.usagePercent, Math.min(20, barWidth))}
            </Text>
            <Text dimColor> {disk.used}/{disk.size} {disk.mount}</Text>
          </Box>
        ))}
      </Box>

      {/* Top Processes */}
      <Box flexDirection="column" paddingLeft={1} marginTop={1}>
        <Box>
          <Text bold>TOP PROCESSES</Text>
          <Text dimColor> (by CPU)</Text>
        </Box>
        <Box>
          <Text dimColor>  {'PID'.padEnd(8)}{'NAME'.padEnd(22)}{'CPU%'.padStart(6)}{'MEM%'.padStart(6)}</Text>
        </Box>
        {state.processes.map((proc, i) => (
          <Box key={i}>
            <Text>  </Text>
            <Text dimColor>{String(proc.pid).padEnd(8)}</Text>
            <Text color={proc.cpu > 50 ? 'yellow' : undefined}>{proc.name.padEnd(22)}</Text>
            <Text color={usageColor(proc.cpu) as any}>{proc.cpu.toFixed(1).padStart(6)}</Text>
            <Text dimColor>{proc.mem.toFixed(1).padStart(6)}</Text>
          </Box>
        ))}
      </Box>

      <Box flexGrow={1} />

      {/* Footer */}
      <Box justifyContent="space-between" width={width}>
        <Text dimColor> Refreshing every 1.5s</Text>
        <Text dimColor>Ctrl+Q:quit</Text>
      </Box>
    </Box>
  );
}
