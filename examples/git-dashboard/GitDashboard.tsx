/**
 * Git Dashboard — Rich terminal overview of any git repository.
 *
 * Uses ink-big-text for repo name, ink-gradient for styling,
 * ink-spinner for loading states, and custom table rendering.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import Spinner from 'ink-spinner';
import type { PanelProps } from '../../src/types.js';
import { execSync } from 'child_process';
import type { GitData, GitCommit, GitBranch, GitFileChange } from './git-data.js';
import { collectGitData } from './git-data.js';

// ─── Status icon helpers ─────────────────────────────────

function statusIcon(status: string): string {
  switch (status) {
    case 'M': return '\u270E'; // ✎
    case 'A': return '+';
    case 'D': return '\u2716'; // ✖
    case 'R': return '\u2192'; // →
    case '??': return '?';
    default: return status;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'M': return 'yellow';
    case 'A': return 'green';
    case 'D': return 'red';
    case 'R': return 'cyan';
    case '??': return 'gray';
    default: return 'white';
  }
}

// ─── Mini progress bar ───────────────────────────────────

function miniBar(value: number, max: number, width: number): string {
  if (max === 0) return '\u2591'.repeat(width);
  const filled = Math.round((value / max) * width);
  return '\u2588'.repeat(filled) + '\u2591'.repeat(width - filled);
}

// ─── Dashboard Panel (root view) ─────────────────────────

interface DashboardData {
  repoPath: string;
}

export function GitDashboardPanel(props: PanelProps<DashboardData>) {
  const { data, width, height, push, updateState } = props;
  const [gitData, setGitData] = useState<GitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(0);

  const sections = [
    { key: 'c', label: 'Commits', icon: '\u25CF' },
    { key: 'b', label: 'Branches', icon: '\u2387' },
    { key: 'f', label: 'Changes', icon: '\u2206' },
    { key: 's', label: 'Stats', icon: '\u2261' },
  ];

  useEffect(() => {
    try {
      const d = collectGitData(data.repoPath);
      setGitData(d);
    } catch { /* ignore */ }
    setLoading(false);
  }, [data.repoPath]);

  useEffect(() => {
    if (gitData) {
      updateState({
        repo: gitData.repoName,
        branch: gitData.currentBranch,
        clean: gitData.isClean,
        section: sections[activeSection].label,
      });
    }
  }, [gitData, activeSection]);

  useInput((input, key) => {
    if (!gitData) return;

    // Section switching with tab or number keys
    if (key.tab || key.rightArrow) {
      setActiveSection(prev => (prev + 1) % sections.length);
    } else if (key.leftArrow) {
      setActiveSection(prev => (prev - 1 + sections.length) % sections.length);
    }

    // Hotkeys for sections
    for (let i = 0; i < sections.length; i++) {
      if (input === sections[i].key) {
        setActiveSection(i);
        break;
      }
    }

    // Enter to drill into section
    if (key.return) {
      const section = sections[activeSection];
      if (section.key === 'c') {
        push({
          id: 'commit-list',
          title: 'Commits',
          component: CommitListPanel as any,
          data: { commits: gitData.commits, repoPath: gitData.repoPath },
        });
      } else if (section.key === 'b') {
        push({
          id: 'branch-list',
          title: 'Branches',
          component: BranchListPanel as any,
          data: { branches: gitData.branches },
        });
      } else if (section.key === 'f') {
        push({
          id: 'changes-list',
          title: 'Changes',
          component: ChangesPanel as any,
          data: { changes: gitData.changes },
        });
      } else if (section.key === 's') {
        push({
          id: 'stats-detail',
          title: 'Stats',
          component: StatsPanel as any,
          data: { gitData },
        });
      }
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" justifyContent="center" alignItems="center" width={width} height={height}>
        <Text color="green">
          <Spinner type="dots" />
        </Text>
        <Text> Loading repository data...</Text>
      </Box>
    );
  }

  if (!gitData) {
    return (
      <Box flexDirection="column" justifyContent="center" alignItems="center" width={width} height={height}>
        <Text color="red">Not a git repository: {data.repoPath}</Text>
      </Box>
    );
  }

  // Layout calculations
  const headerHeight = 4; // big text + gap
  const sectionTabHeight = 1;
  const dividerHeight = 1;
  const infoBarHeight = 3;
  const footerHeight = 1;
  const contentHeight = Math.max(1, height - headerHeight - sectionTabHeight - dividerHeight - infoBarHeight - dividerHeight - footerHeight - 1);

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Big gradient repo name */}
      <Box justifyContent="center" width={width}>
        <Gradient name="pastel">
          <BigText text={gitData.repoName} font="chrome" />
        </Gradient>
      </Box>

      {/* Info bar */}
      <Box width={width} gap={2}>
        <Box>
          <Text dimColor>Branch: </Text>
          <Text bold color="green">{gitData.currentBranch}</Text>
        </Box>
        <Box>
          <Text dimColor>HEAD: </Text>
          <Text color="yellow">{gitData.head}</Text>
        </Box>
        <Box>
          <Text dimColor>Status: </Text>
          <Text color={gitData.isClean ? 'green' : 'yellow'}>
            {gitData.isClean ? '\u2714 clean' : `${gitData.changes.length} changes`}
          </Text>
        </Box>
        {gitData.stashCount > 0 && (
          <Box>
            <Text dimColor>Stash: </Text>
            <Text color="cyan">{gitData.stashCount}</Text>
          </Box>
        )}
      </Box>

      <Box>
        <Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text>
      </Box>

      {/* Section tabs */}
      <Box width={width} gap={1}>
        {sections.map((sec, i) => (
          <Box key={sec.key}>
            <Text
              bold={i === activeSection}
              color={i === activeSection ? 'cyan' : undefined}
              dimColor={i !== activeSection}
              inverse={i === activeSection}
            >
              {` ${sec.icon} ${sec.label} (${sec.key}) `}
            </Text>
          </Box>
        ))}
        <Box flexGrow={1} />
        <Text dimColor>Tab/arrows to switch, Enter to expand</Text>
      </Box>

      <Box>
        <Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text>
      </Box>

      {/* Section content preview */}
      <Box flexDirection="column" width={width} height={contentHeight}>
        {activeSection === 0 && <CommitPreview commits={gitData.commits} width={width} height={contentHeight} />}
        {activeSection === 1 && <BranchPreview branches={gitData.branches} width={width} height={contentHeight} />}
        {activeSection === 2 && <ChangesPreview changes={gitData.changes} width={width} height={contentHeight} />}
        {activeSection === 3 && <StatsPreview gitData={gitData} width={width} height={contentHeight} />}
      </Box>

      <Box flexGrow={1} />

      {/* Footer */}
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>{gitData.remoteUrl}</Text>
        <Text dimColor>q:quit  c/b/f/s:sections  Enter:expand</Text>
      </Box>
    </Box>
  );
}

// ─── Preview components (inline in dashboard) ────────────

function CommitPreview({ commits, width, height }: { commits: GitCommit[]; width: number; height: number }) {
  const visible = commits.slice(0, height);
  const hashW = 8;
  const dateW = 11;
  const authorW = 15;
  const msgW = Math.max(10, width - hashW - dateW - authorW - 6);

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold color="cyan">{'Hash'.padEnd(hashW)}</Text>
        <Text bold color="cyan">{' '}</Text>
        <Text bold color="cyan">{'Date'.padEnd(dateW)}</Text>
        <Text bold color="cyan">{' '}</Text>
        <Text bold color="cyan">{'Author'.padEnd(authorW)}</Text>
        <Text bold color="cyan">{' '}</Text>
        <Text bold color="cyan">Message</Text>
      </Box>
      {visible.map((c, i) => (
        <Box key={i}>
          <Text color="yellow">{c.hashShort.padEnd(hashW)}</Text>
          <Text> </Text>
          <Text dimColor>{c.date.padEnd(dateW)}</Text>
          <Text> </Text>
          <Text color="green">{c.author.slice(0, authorW).padEnd(authorW)}</Text>
          <Text> </Text>
          <Text>{c.message.slice(0, msgW)}</Text>
          {c.refs && <Text color="red"> ({c.refs})</Text>}
        </Box>
      ))}
      {commits.length > height && (
        <Text dimColor>  ...and {commits.length - height} more</Text>
      )}
    </Box>
  );
}

function BranchPreview({ branches, width, height }: { branches: GitBranch[]; width: number; height: number }) {
  const visible = branches.slice(0, height);
  return (
    <Box flexDirection="column">
      {visible.map((b, i) => (
        <Box key={i} gap={1}>
          <Text color={b.isCurrent ? 'green' : 'white'} bold={b.isCurrent}>
            {b.isCurrent ? '\u25B6 ' : '  '}{b.name}
          </Text>
          {b.upstream && (
            <Text dimColor>\u2192 {b.upstream}</Text>
          )}
          {b.ahead > 0 && <Text color="green">\u2191{b.ahead}</Text>}
          {b.behind > 0 && <Text color="red">\u2193{b.behind}</Text>}
          <Text dimColor>{b.lastCommit.slice(0, Math.max(10, width - 50))}</Text>
        </Box>
      ))}
    </Box>
  );
}

function ChangesPreview({ changes, width, height }: { changes: GitFileChange[]; width: number; height: number }) {
  if (changes.length === 0) {
    return (
      <Box justifyContent="center" alignItems="center" height={height}>
        <Text color="green">\u2714 Working tree clean</Text>
      </Box>
    );
  }

  const staged = changes.filter(c => c.staged);
  const unstaged = changes.filter(c => !c.staged);
  const visible = Math.max(1, height - 2);

  return (
    <Box flexDirection="column">
      {staged.length > 0 && (
        <>
          <Text bold color="green">Staged ({staged.length})</Text>
          {staged.slice(0, Math.floor(visible / 2)).map((c, i) => (
            <Box key={`s-${i}`} gap={1}>
              <Text color={statusColor(c.status) as any}>{statusIcon(c.status)}</Text>
              <Text color="green">{c.path}</Text>
            </Box>
          ))}
        </>
      )}
      {unstaged.length > 0 && (
        <>
          <Text bold color="red">Unstaged ({unstaged.length})</Text>
          {unstaged.slice(0, visible - staged.slice(0, Math.floor(visible / 2)).length).map((c, i) => (
            <Box key={`u-${i}`} gap={1}>
              <Text color={statusColor(c.status) as any}>{statusIcon(c.status)}</Text>
              <Text color="red">{c.path}</Text>
            </Box>
          ))}
        </>
      )}
    </Box>
  );
}

function StatsPreview({ gitData, width, height }: { gitData: GitData; width: number; height: number }) {
  const barWidth = Math.min(30, width - 30);
  const maxCommits = gitData.stats.totalCommits;

  // Get commit frequency by author (top 5)
  const authorCounts = new Map<string, number>();
  for (const c of gitData.commits) {
    authorCounts.set(c.author, (authorCounts.get(c.author) || 0) + 1);
  }
  const topAuthors = [...authorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxAuthorCommits = topAuthors[0]?.[1] || 1;

  return (
    <Box flexDirection="column" gap={1}>
      <Box gap={2}>
        <Box flexDirection="column">
          <Text bold color="cyan">Repository Stats</Text>
          <Box gap={1}>
            <Text dimColor>Total commits:</Text>
            <Text bold>{gitData.stats.totalCommits}</Text>
          </Box>
          <Box gap={1}>
            <Text dimColor>Contributors:</Text>
            <Text bold>{gitData.stats.contributors}</Text>
          </Box>
          <Box gap={1}>
            <Text dimColor>First commit:</Text>
            <Text>{gitData.stats.firstCommitDate}</Text>
          </Box>
          <Box gap={1}>
            <Text dimColor>Branches:</Text>
            <Text bold>{gitData.stats.branches}</Text>
          </Box>
          <Box gap={1}>
            <Text dimColor>Tags:</Text>
            <Text bold>{gitData.stats.tags}</Text>
          </Box>
        </Box>

        <Box flexDirection="column">
          <Text bold color="cyan">Top Contributors (recent)</Text>
          {topAuthors.map(([author, count], i) => (
            <Box key={i} gap={1}>
              <Text color="green">{author.slice(0, 15).padEnd(15)}</Text>
              <Text color="cyan">{miniBar(count, maxAuthorCommits, barWidth)}</Text>
              <Text dimColor> {count}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Drill-down panels ───────────────────────────────────

function CommitListPanel(props: PanelProps<{ commits: GitCommit[]; repoPath: string }>) {
  const { data, width, height, push, updateState } = props;
  const { commits, repoPath } = data;
  const [selected, setSelected] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const headerH = 2;
  const footerH = 1;
  const visibleH = Math.max(1, height - headerH - footerH);

  useEffect(() => {
    if (commits[selected]) {
      updateState({ commit: commits[selected].hashShort, message: commits[selected].message });
    }
  }, [selected]);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelected(prev => {
        const next = Math.max(0, prev - 1);
        if (next < scrollOffset) setScrollOffset(next);
        return next;
      });
    } else if (key.downArrow || input === 'j') {
      setSelected(prev => {
        const next = Math.min(commits.length - 1, prev + 1);
        if (next >= scrollOffset + visibleH) setScrollOffset(next - visibleH + 1);
        return next;
      });
    } else if (key.return && commits[selected]) {
      push({
        id: `commit-${commits[selected].hashShort}`,
        title: commits[selected].hashShort,
        component: CommitDetailPanel as any,
        data: { commit: commits[selected], repoPath },
      });
    }
  });

  const visible = commits.slice(scrollOffset, scrollOffset + visibleH);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="cyan">Commits</Text>
        <Text dimColor> ({commits.length})</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {visible.map((c, i) => {
        const idx = scrollOffset + i;
        const isSelected = idx === selected;
        return (
          <Box key={idx}>
            <Text color={isSelected ? 'cyan' : undefined} bold={isSelected} inverse={isSelected}>
              {isSelected ? ' > ' : '   '}
            </Text>
            <Text color="yellow">{c.hashShort} </Text>
            <Text dimColor>{c.date} </Text>
            <Text color="green">{c.author.slice(0, 12).padEnd(12)} </Text>
            <Text color={isSelected ? 'cyan' : undefined}>{c.message.slice(0, width - 40)}</Text>
          </Box>
        );
      })}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>{selected + 1}/{commits.length}</Text>
        <Text dimColor>j/k:navigate  Enter:detail</Text>
      </Box>
    </Box>
  );
}

function CommitDetailPanel(props: PanelProps<{ commit: GitCommit; repoPath: string }>) {
  const { data, width, height, updateState } = props;
  const { commit, repoPath } = data;
  const [diffLines, setDiffLines] = useState<string[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    updateState({ hash: commit.hashShort, message: commit.message });
    try {
      const diff = execSync(`git show --stat ${commit.hash}`, { cwd: repoPath, encoding: 'utf-8', timeout: 5000 });
      setDiffLines(diff.split('\n'));
    } catch { /* ignore */ }
  }, [commit.hash]);

  const headerH = 8;
  const footerH = 1;
  const visibleH = Math.max(1, height - headerH - footerH);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setScrollOffset(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setScrollOffset(prev => Math.min(Math.max(0, diffLines.length - visibleH), prev + 1));
    } else if (key.pageUp) {
      setScrollOffset(prev => Math.max(0, prev - visibleH));
    } else if (key.pageDown) {
      setScrollOffset(prev => Math.min(Math.max(0, diffLines.length - visibleH), prev + visibleH));
    }
  });

  const visible = diffLines.slice(scrollOffset, scrollOffset + visibleH);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box><Text bold color="cyan">Commit Detail</Text></Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>
      <Box gap={1}><Text dimColor>Hash:</Text><Text color="yellow">{commit.hash}</Text></Box>
      <Box gap={1}><Text dimColor>Author:</Text><Text color="green">{commit.author}</Text></Box>
      <Box gap={1}><Text dimColor>Date:</Text><Text>{commit.date}</Text><Text dimColor> ({commit.relDate})</Text></Box>
      <Box gap={1}><Text dimColor>Message:</Text><Text bold>{commit.message}</Text></Box>
      {commit.refs && <Box gap={1}><Text dimColor>Refs:</Text><Text color="red">{commit.refs}</Text></Box>}
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {visible.map((line, i) => {
        let color: string | undefined;
        if (line.startsWith('+') && !line.startsWith('+++')) color = 'green';
        if (line.startsWith('-') && !line.startsWith('---')) color = 'red';
        return (
          <Box key={scrollOffset + i}>
            <Text color={color as any}>{line.slice(0, width)}</Text>
          </Box>
        );
      })}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>{diffLines.length} lines</Text>
        <Text dimColor>j/k:scroll  PgUp/PgDn</Text>
      </Box>
    </Box>
  );
}

function BranchListPanel(props: PanelProps<{ branches: GitBranch[] }>) {
  const { data, width, height, updateState } = props;
  const { branches } = data;
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (branches[selected]) {
      updateState({ branch: branches[selected].name });
    }
  }, [selected]);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelected(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelected(prev => Math.min(branches.length - 1, prev + 1));
    }
  });

  const headerH = 2;
  const footerH = 1;
  const visibleH = Math.max(1, height - headerH - footerH);
  const visible = branches.slice(0, visibleH);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box><Text bold color="cyan">Branches</Text><Text dimColor> ({branches.length})</Text></Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {visible.map((b, i) => {
        const isSelected = i === selected;
        return (
          <Box key={i} gap={1}>
            <Text color={isSelected ? 'cyan' : b.isCurrent ? 'green' : undefined} bold={isSelected || b.isCurrent} inverse={isSelected}>
              {isSelected ? ' > ' : b.isCurrent ? ' \u25B6 ' : '   '}
              {b.name}
            </Text>
            {b.upstream && <Text dimColor>\u2192 {b.upstream}</Text>}
            {b.ahead > 0 && <Text color="green"> \u2191{b.ahead}</Text>}
            {b.behind > 0 && <Text color="red"> \u2193{b.behind}</Text>}
          </Box>
        );
      })}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>{selected + 1}/{branches.length}</Text>
        <Text dimColor>j/k:navigate</Text>
      </Box>
    </Box>
  );
}

function ChangesPanel(props: PanelProps<{ changes: GitFileChange[] }>) {
  const { data, width, height, updateState } = props;
  const { changes } = data;
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (changes[selected]) {
      updateState({ file: changes[selected].path, status: changes[selected].status });
    }
  }, [selected]);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelected(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelected(prev => Math.min(changes.length - 1, prev + 1));
    }
  });

  if (changes.length === 0) {
    return (
      <Box flexDirection="column" justifyContent="center" alignItems="center" width={width} height={height}>
        <Text color="green">\u2714 Working tree clean — nothing to show</Text>
      </Box>
    );
  }

  const headerH = 2;
  const footerH = 1;
  const visibleH = Math.max(1, height - headerH - footerH);

  const staged = changes.filter(c => c.staged);
  const unstaged = changes.filter(c => !c.staged);
  const allSorted = [...staged, ...unstaged];
  const visible = allSorted.slice(0, visibleH);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="cyan">Changes</Text>
        <Text dimColor> (staged: {staged.length}, unstaged: {unstaged.length})</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {visible.map((c, i) => {
        const isSelected = i === selected;
        return (
          <Box key={i} gap={1}>
            <Text inverse={isSelected} color={isSelected ? 'cyan' : undefined}>
              {isSelected ? ' > ' : '   '}
            </Text>
            <Text color={c.staged ? 'green' : 'red'}>{c.staged ? 'S' : 'U'}</Text>
            <Text color={statusColor(c.status) as any}>{statusIcon(c.status)}</Text>
            <Text color={isSelected ? 'cyan' : undefined}>{c.path}</Text>
          </Box>
        );
      })}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>{selected + 1}/{allSorted.length}</Text>
        <Text dimColor>j/k:navigate</Text>
      </Box>
    </Box>
  );
}

function StatsPanel(props: PanelProps<{ gitData: GitData }>) {
  const { data, width, height } = props;
  const { gitData } = data;
  const barWidth = Math.min(40, width - 25);

  // Compute author stats
  const authorCounts = new Map<string, number>();
  for (const c of gitData.commits) {
    authorCounts.set(c.author, (authorCounts.get(c.author) || 0) + 1);
  }
  const topAuthors = [...authorCounts.entries()]
    .sort((a, b) => b[1] - a[1]);
  const maxCount = topAuthors[0]?.[1] || 1;

  // Commits per day (from recent commits)
  const dayCounts = new Map<string, number>();
  for (const c of gitData.commits) {
    dayCounts.set(c.date, (dayCounts.get(c.date) || 0) + 1);
  }
  const days = [...dayCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box><Text bold color="cyan">Repository Statistics</Text></Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      <Box flexDirection="column" gap={1}>
        <Box gap={2}>
          <Box flexDirection="column">
            <Box gap={1}><Text dimColor>{'Total Commits:'.padEnd(18)}</Text><Text bold color="green">{gitData.stats.totalCommits}</Text></Box>
            <Box gap={1}><Text dimColor>{'Contributors:'.padEnd(18)}</Text><Text bold color="cyan">{gitData.stats.contributors}</Text></Box>
            <Box gap={1}><Text dimColor>{'First Commit:'.padEnd(18)}</Text><Text>{gitData.stats.firstCommitDate}</Text></Box>
            <Box gap={1}><Text dimColor>{'Branches:'.padEnd(18)}</Text><Text bold>{gitData.stats.branches}</Text></Box>
            <Box gap={1}><Text dimColor>{'Tags:'.padEnd(18)}</Text><Text bold>{gitData.stats.tags}</Text></Box>
            <Box gap={1}><Text dimColor>{'Stashes:'.padEnd(18)}</Text><Text bold>{gitData.stashCount}</Text></Box>
            <Box gap={1}><Text dimColor>{'Remote:'.padEnd(18)}</Text><Text>{gitData.remoteUrl}</Text></Box>
          </Box>
        </Box>

        <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

        <Box flexDirection="column">
          <Text bold color="cyan">Contributors (recent {gitData.commits.length} commits)</Text>
          {topAuthors.map(([author, count], i) => (
            <Box key={i} gap={1}>
              <Text color="green">{author.slice(0, 18).padEnd(18)}</Text>
              <Text color="cyan">{miniBar(count, maxCount, barWidth)}</Text>
              <Text dimColor> {count}</Text>
            </Box>
          ))}
        </Box>

        {days.length > 1 && (
          <>
            <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>
            <Box flexDirection="column">
              <Text bold color="cyan">Commits per Day</Text>
              {days.map(([day, count], i) => (
                <Box key={i} gap={1}>
                  <Text dimColor>{day.padEnd(12)}</Text>
                  <Text color="yellow">{miniBar(count, Math.max(...days.map(d => d[1])), barWidth)}</Text>
                  <Text dimColor> {count}</Text>
                </Box>
              ))}
            </Box>
          </>
        )}
      </Box>

      <Box flexGrow={1} />
      <Box><Text dimColor>Esc:back</Text></Box>
    </Box>
  );
}
