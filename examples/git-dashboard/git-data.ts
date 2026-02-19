/**
 * Git data collectors — runs git commands and parses output.
 * No external dependencies, uses child_process.execSync.
 */

import { execSync } from 'child_process';
import { basename } from 'path';

function git(cmd: string, cwd: string): string {
  try {
    return execSync(`git ${cmd}`, { cwd, encoding: 'utf-8', timeout: 5000 }).trim();
  } catch {
    return '';
  }
}

// ─── Types ───────────────────────────────────────────────

export interface GitCommit {
  hash: string;
  hashShort: string;
  author: string;
  date: string;
  relDate: string;
  message: string;
  refs: string;
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
  upstream: string;
  behind: number;
  ahead: number;
  lastCommit: string;
}

export interface GitFileChange {
  status: string;  // M, A, D, R, ??
  path: string;
  staged: boolean;
}

export interface GitStats {
  totalCommits: number;
  contributors: number;
  firstCommitDate: string;
  branches: number;
  tags: number;
}

export interface GitData {
  repoName: string;
  repoPath: string;
  currentBranch: string;
  isClean: boolean;
  head: string;
  remoteUrl: string;
  commits: GitCommit[];
  branches: GitBranch[];
  changes: GitFileChange[];
  stats: GitStats;
  stashCount: number;
}

// ─── Collectors ──────────────────────────────────────────

export function getRepoName(cwd: string): string {
  const topLevel = git('rev-parse --show-toplevel', cwd);
  return topLevel ? basename(topLevel) : basename(cwd);
}

export function getCurrentBranch(cwd: string): string {
  return git('branch --show-current', cwd) || git('rev-parse --short HEAD', cwd) || 'detached';
}

export function getHead(cwd: string): string {
  return git('rev-parse --short HEAD', cwd) || 'none';
}

export function getRemoteUrl(cwd: string): string {
  return git('remote get-url origin', cwd) || 'none';
}

export function getRecentCommits(cwd: string, count = 15): GitCommit[] {
  const format = '%H|%h|%an|%ad|%ar|%s|%D';
  const raw = git(`log --pretty=format:"${format}" --date=short -${count}`, cwd);
  if (!raw) return [];

  const commits: GitCommit[] = [];
  const lines = raw.split('\n');
  for (const line of lines) {
    const parts = line.split('|');
    if (parts.length < 7) continue;
    commits.push({
      hash: parts[0],
      hashShort: parts[1],
      author: parts[2],
      date: parts[3],
      relDate: parts[4],
      message: parts[5],
      refs: parts.slice(6).join('|'),
    });
  }
  return commits;
}

export function getBranches(cwd: string): GitBranch[] {
  const raw = git('branch -vv --no-color', cwd);
  if (!raw) return [];

  const branches: GitBranch[] = [];
  const lines = raw.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const isCurrent = line.startsWith('*');
    const cleaned = line.replace(/^\*?\s+/, '');
    const match = cleaned.match(/^(\S+)\s+(\S+)\s+(?:\[([^\]]+)\]\s+)?(.*)$/);
    if (!match) continue;

    const name = match[1];
    const upstreamInfo = match[3] || '';
    let upstream = '';
    let ahead = 0;
    let behind = 0;

    if (upstreamInfo) {
      const upMatch = upstreamInfo.match(/^([^:]+)(?::\s*(?:ahead (\d+))?(?:,?\s*behind (\d+))?)?$/);
      if (upMatch) {
        upstream = upMatch[1];
        ahead = parseInt(upMatch[2] || '0', 10);
        behind = parseInt(upMatch[3] || '0', 10);
      }
    }

    branches.push({
      name,
      isCurrent,
      upstream,
      behind,
      ahead,
      lastCommit: match[4] || '',
    });
  }
  return branches;
}

export function getFileChanges(cwd: string): GitFileChange[] {
  const raw = git('status --porcelain', cwd);
  if (!raw) return [];

  const changes: GitFileChange[] = [];
  const lines = raw.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const indexStatus = line[0];
    const workTreeStatus = line[1];
    const path = line.slice(3);

    // Staged changes
    if (indexStatus !== ' ' && indexStatus !== '?') {
      changes.push({ status: indexStatus, path, staged: true });
    }
    // Unstaged changes
    if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
      changes.push({ status: workTreeStatus, path, staged: false });
    }
    // Untracked
    if (indexStatus === '?' && workTreeStatus === '?') {
      changes.push({ status: '??', path, staged: false });
    }
  }
  return changes;
}

export function getStats(cwd: string): GitStats {
  const totalCommits = parseInt(git('rev-list --count HEAD', cwd) || '0', 10);
  const contributorsRaw = git('shortlog -sn --no-merges HEAD', cwd);
  const contributors = contributorsRaw ? contributorsRaw.split('\n').length : 0;
  const firstCommitDate = git('log --reverse --pretty=format:"%ad" --date=short', cwd).split('\n')[0] || 'unknown';
  const branchCount = parseInt(git('branch --list | wc -l', cwd).trim() || '0', 10);
  const tagCount = parseInt(git('tag | wc -l', cwd).trim() || '0', 10);

  return { totalCommits, contributors, firstCommitDate, branches: branchCount, tags: tagCount };
}

export function getStashCount(cwd: string): number {
  const raw = git('stash list', cwd);
  return raw ? raw.split('\n').length : 0;
}

export function collectGitData(cwd: string): GitData {
  return {
    repoName: getRepoName(cwd),
    repoPath: cwd,
    currentBranch: getCurrentBranch(cwd),
    isClean: getFileChanges(cwd).length === 0,
    head: getHead(cwd),
    remoteUrl: getRemoteUrl(cwd),
    commits: getRecentCommits(cwd),
    branches: getBranches(cwd),
    changes: getFileChanges(cwd),
    stats: getStats(cwd),
    stashCount: getStashCount(cwd),
  };
}
