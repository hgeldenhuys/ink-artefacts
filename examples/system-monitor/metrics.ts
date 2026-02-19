/**
 * System metrics collector — reads OS-level CPU, memory, disk, and process data.
 * macOS-focused but falls back gracefully.
 */

import { execSync } from 'child_process';
import { cpus, totalmem, freemem, loadavg, hostname, uptime } from 'os';

export interface CpuMetrics {
  model: string;
  cores: number;
  usage: number;        // 0-100
  loadAvg: number[];    // 1, 5, 15 min
  history: number[];    // last N usage samples
}

export interface MemoryMetrics {
  total: number;        // bytes
  used: number;
  free: number;
  usagePercent: number;
  history: number[];    // last N usage samples
}

export interface DiskMetrics {
  filesystem: string;
  size: string;
  used: string;
  available: string;
  usagePercent: number;
  mount: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
}

export interface SystemInfo {
  hostname: string;
  uptime: string;
  platform: string;
}

// ─── Collectors ──────────────────────────────────────────

let prevIdleTime = 0;
let prevTotalTime = 0;

export function getCpuUsage(): number {
  const cores = cpus();
  let totalIdle = 0, totalTick = 0;

  for (const core of cores) {
    const { user, nice, sys, idle, irq } = core.times;
    totalTick += user + nice + sys + idle + irq;
    totalIdle += idle;
  }

  const idleDiff = totalIdle - prevIdleTime;
  const totalDiff = totalTick - prevTotalTime;

  prevIdleTime = totalIdle;
  prevTotalTime = totalTick;

  if (totalDiff === 0) return 0;
  return Math.round((1 - idleDiff / totalDiff) * 100);
}

export function getMemoryMetrics(history: number[]): MemoryMetrics {
  const total = totalmem();
  const free = freemem();
  const used = total - free;
  const usagePercent = Math.round((used / total) * 100);
  history.push(usagePercent);
  if (history.length > 60) history.shift();

  return { total, used, free, usagePercent, history: [...history] };
}

export function getDiskMetrics(): DiskMetrics[] {
  try {
    const output = execSync('df -h / /System/Volumes/Data 2>/dev/null || df -h /', {
      encoding: 'utf-8',
      timeout: 2000,
    });
    const lines = output.trim().split('\n').slice(1);
    const disks: DiskMetrics[] = [];

    for (const line of lines) {
      const parts = line.split(/\s+/);
      if (parts.length >= 6) {
        const usageStr = parts[4]!.replace('%', '');
        disks.push({
          filesystem: parts[0]!,
          size: parts[1]!,
          used: parts[2]!,
          available: parts[3]!,
          usagePercent: parseInt(usageStr, 10) || 0,
          mount: parts.slice(5).join(' '),
        });
      }
    }
    return disks;
  } catch {
    return [];
  }
}

export function getTopProcesses(count: number = 8): ProcessInfo[] {
  try {
    const output = execSync(`ps -eo pid,pcpu,pmem,comm -r | head -${count + 1}`, {
      encoding: 'utf-8',
      timeout: 2000,
    });
    const lines = output.trim().split('\n').slice(1);
    const procs: ProcessInfo[] = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 4) {
        const name = parts.slice(3).join(' ').split('/').pop() || parts[3]!;
        procs.push({
          pid: parseInt(parts[0]!, 10) || 0,
          cpu: parseFloat(parts[1]!) || 0,
          mem: parseFloat(parts[2]!) || 0,
          name: name.length > 20 ? name.slice(0, 20) : name,
        });
      }
    }
    return procs;
  } catch {
    return [];
  }
}

export function getSystemInfo(): SystemInfo {
  const up = uptime();
  const days = Math.floor(up / 86400);
  const hours = Math.floor((up % 86400) / 3600);
  const minutes = Math.floor((up % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return {
    hostname: hostname(),
    uptime: parts.join(' '),
    platform: process.platform,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

// ─── Unicode rendering helpers ───────────────────────────

const SPARKLINE_CHARS = '▁▂▃▄▅▆▇█';

export function sparkline(values: number[], maxVal: number = 100): string {
  if (values.length === 0) return '';
  return values.map(v => {
    const idx = Math.min(Math.round((v / maxVal) * 7), 7);
    return SPARKLINE_CHARS[idx];
  }).join('');
}

export function progressBar(percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}
