/**
 * Project Dashboard — Beautiful terminal overview of any Node.js project.
 *
 * Uses ink-big-text + ink-gradient for the project name header,
 * ink-spinner for loading, and custom Unicode bar charts.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import Spinner from 'ink-spinner';
import SyntaxHighlight from 'ink-syntax-highlight';
import type { PanelProps } from '../../src/types.js';
import type { ProjectData, FileTypeCount, DirSummary } from './project-data.js';
import { collectProjectData, formatSize, formatNumber } from './project-data.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// ─── Unicode helpers ─────────────────────────────────────

function progressBar(value: number, max: number, width: number): string {
  if (max === 0) return '\u2591'.repeat(width);
  const ratio = Math.min(1, value / max);
  const filled = Math.round(ratio * width);
  return '\u2588'.repeat(filled) + '\u2591'.repeat(width - filled);
}

const SPARKLINE_CHARS = '\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588';
function sparkline(values: number[]): string {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  let result = '';
  for (const v of values) {
    const idx = Math.min(7, Math.floor((v / max) * 7));
    result += SPARKLINE_CHARS[idx];
  }
  return result;
}

// ─── Health indicator ────────────────────────────────────

function HealthCheck({ label, ok }: { label: string; ok: boolean }) {
  return (
    <Box gap={1}>
      <Text color={ok ? 'green' : 'red'}>{ok ? '\u2714' : '\u2718'}</Text>
      <Text color={ok ? 'green' : 'gray'}>{label}</Text>
    </Box>
  );
}

// ─── Dashboard Panel ─────────────────────────────────────

interface DashboardData {
  projectPath: string;
}

export function ProjectDashboardPanel(props: PanelProps<DashboardData>) {
  const { data, width, height, push, updateState } = props;
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'overview' | 'deps' | 'scripts' | 'files'>('overview');

  useEffect(() => {
    try {
      const d = collectProjectData(data.projectPath);
      setProjectData(d);
    } catch { /* ignore */ }
    setLoading(false);
  }, [data.projectPath]);

  useEffect(() => {
    if (projectData) {
      updateState({
        project: projectData.packageInfo?.name || 'unknown',
        view,
        files: projectData.totalFiles,
        lines: projectData.lineCount,
      });
    }
  }, [projectData, view]);

  useInput((input, key) => {
    if (!projectData) return;
    if (input === '1') setView('overview');
    else if (input === '2') setView('deps');
    else if (input === '3') setView('scripts');
    else if (input === '4') setView('files');
    else if (key.tab) {
      const views: typeof view[] = ['overview', 'deps', 'scripts', 'files'];
      const idx = views.indexOf(view);
      setView(views[(idx + 1) % views.length]);
    }

    // Drill-down on Enter
    if (key.return) {
      if (view === 'scripts' && projectData.packageInfo) {
        push({
          id: 'scripts-list',
          title: 'Scripts',
          component: ScriptsPanel as any,
          data: { scripts: projectData.packageInfo.scripts, projectPath: data.projectPath },
        });
      } else if (view === 'deps' && projectData.packageInfo) {
        push({
          id: 'deps-list',
          title: 'Dependencies',
          component: DepsPanel as any,
          data: {
            deps: projectData.packageInfo.dependencies,
            devDeps: projectData.packageInfo.devDependencies,
          },
        });
      } else if (view === 'files') {
        push({
          id: 'file-types',
          title: 'File Types',
          component: FileTypesPanel as any,
          data: { fileTypes: projectData.fileTypes, totalFiles: projectData.totalFiles },
        });
      }
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column" justifyContent="center" alignItems="center" width={width} height={height}>
        <Text color="green"><Spinner type="dots" /></Text>
        <Text> Scanning project...</Text>
      </Box>
    );
  }

  if (!projectData) {
    return (
      <Box flexDirection="column" justifyContent="center" alignItems="center" width={width} height={height}>
        <Text color="red">Could not read project at: {data.projectPath}</Text>
      </Box>
    );
  }

  const pkg = projectData.packageInfo;
  const barWidth = Math.min(30, Math.floor(width / 3));

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Gradient header */}
      <Box justifyContent="center" width={width}>
        <Gradient name="vice">
          <BigText text={pkg?.name || 'project'} font="chrome" />
        </Gradient>
      </Box>

      {/* Info line */}
      {pkg && (
        <Box gap={2}>
          <Box><Text dimColor>v</Text><Text bold color="green">{pkg.version}</Text></Box>
          <Box><Text dimColor>{pkg.description.slice(0, width - 40)}</Text></Box>
        </Box>
      )}

      {/* Quick stats */}
      <Box gap={3}>
        <Box><Text dimColor>Files: </Text><Text bold>{formatNumber(projectData.totalFiles)}</Text></Box>
        <Box><Text dimColor>Lines: </Text><Text bold>{formatNumber(projectData.lineCount)}</Text></Box>
        <Box><Text dimColor>Size: </Text><Text bold>{formatSize(projectData.totalSize)}</Text></Box>
        <Box><Text dimColor>TODOs: </Text><Text bold color={projectData.todoCount > 0 ? 'yellow' : 'green'}>{projectData.todoCount}</Text></Box>
        {pkg && <Box><Text dimColor>Deps: </Text><Text bold>{Object.keys(pkg.dependencies).length + Object.keys(pkg.devDependencies).length}</Text></Box>}
      </Box>

      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {/* View tabs */}
      <Box gap={1}>
        {(['overview', 'deps', 'scripts', 'files'] as const).map((v, i) => (
          <Box key={v}>
            <Text
              bold={view === v}
              color={view === v ? 'cyan' : undefined}
              dimColor={view !== v}
              inverse={view === v}
            >
              {` ${i + 1}:${v.charAt(0).toUpperCase() + v.slice(1)} `}
            </Text>
          </Box>
        ))}
        <Box flexGrow={1} />
        <Text dimColor>Tab/1-4 to switch, Enter to expand</Text>
      </Box>

      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {/* View content */}
      <Box flexDirection="column" flexGrow={1}>
        {view === 'overview' && (
          <OverviewContent data={projectData} width={width} barWidth={barWidth} />
        )}
        {view === 'deps' && pkg && (
          <DepsPreview deps={pkg.dependencies} devDeps={pkg.devDependencies} width={width} />
        )}
        {view === 'scripts' && pkg && (
          <ScriptsPreview scripts={pkg.scripts} width={width} />
        )}
        {view === 'files' && (
          <FilesPreview data={projectData} width={width} barWidth={barWidth} />
        )}
      </Box>

      <Box flexGrow={1} />

      {/* Footer */}
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>{data.projectPath}</Text>
        <Text dimColor>q:quit  1-4:views  Enter:expand</Text>
      </Box>
    </Box>
  );
}

// ─── Inline view components ──────────────────────────────

function OverviewContent({ data, width, barWidth }: { data: ProjectData; width: number; barWidth: number }) {
  const h = data.health;

  return (
    <Box gap={3}>
      {/* Left: Health checks */}
      <Box flexDirection="column">
        <Text bold color="cyan">Project Health</Text>
        <HealthCheck label="README" ok={h.hasReadme} />
        <HealthCheck label="LICENSE" ok={h.hasLicense} />
        <HealthCheck label="Tests" ok={h.hasTests} />
        <HealthCheck label="CI/CD" ok={h.hasCI} />
        <HealthCheck label="TypeScript" ok={h.hasTypeScript} />
        <HealthCheck label="Linter" ok={h.hasLinter} />
        <HealthCheck label=".gitignore" ok={h.hasGitignore} />
        <HealthCheck label="Lock file" ok={h.hasLockFile} />
        <HealthCheck label="CLAUDE.md" ok={h.hasClaude} />
      </Box>

      {/* Middle: Top file types */}
      <Box flexDirection="column">
        <Text bold color="cyan">File Types</Text>
        {data.fileTypes.slice(0, 8).map((ft, i) => (
          <Box key={i} gap={1}>
            <Text color={ft.color as any}>{ft.label.padEnd(12)}</Text>
            <Text color="cyan">{progressBar(ft.count, data.fileTypes[0]?.count || 1, barWidth)}</Text>
            <Text dimColor> {ft.count}</Text>
          </Box>
        ))}
      </Box>

      {/* Right: Directory sizes */}
      <Box flexDirection="column">
        <Text bold color="cyan">Directories</Text>
        {data.dirs.slice(0, 8).map((dir, i) => (
          <Box key={i} gap={1}>
            <Text color="yellow">{dir.name.padEnd(14)}</Text>
            <Text color="green">{progressBar(dir.fileCount, data.dirs[0]?.fileCount || 1, Math.min(20, barWidth))}</Text>
            <Text dimColor> {dir.fileCount} files</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function DepsPreview({ deps, devDeps, width }: { deps: Record<string, string>; devDeps: Record<string, string>; width: number }) {
  const depEntries = Object.entries(deps);
  const devDepEntries = Object.entries(devDeps);
  const colWidth = Math.floor((width - 4) / 2);

  return (
    <Box gap={2}>
      <Box flexDirection="column" width={colWidth}>
        <Text bold color="green">Dependencies ({depEntries.length})</Text>
        {depEntries.slice(0, 12).map(([name, ver], i) => (
          <Box key={i} gap={1}>
            <Text>{name.slice(0, colWidth - 15)}</Text>
            <Text dimColor>{ver}</Text>
          </Box>
        ))}
        {depEntries.length > 12 && <Text dimColor>...and {depEntries.length - 12} more</Text>}
      </Box>
      <Box flexDirection="column" width={colWidth}>
        <Text bold color="yellow">Dev Dependencies ({devDepEntries.length})</Text>
        {devDepEntries.slice(0, 12).map(([name, ver], i) => (
          <Box key={i} gap={1}>
            <Text>{name.slice(0, colWidth - 15)}</Text>
            <Text dimColor>{ver}</Text>
          </Box>
        ))}
        {devDepEntries.length > 12 && <Text dimColor>...and {devDepEntries.length - 12} more</Text>}
      </Box>
    </Box>
  );
}

function ScriptsPreview({ scripts, width }: { scripts: Record<string, string>; width: number }) {
  const entries = Object.entries(scripts);
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Scripts ({entries.length})</Text>
      {entries.slice(0, 12).map(([name, cmd], i) => (
        <Box key={i}>
          <Text bold color="green">{name.padEnd(20)}</Text>
          <Text dimColor>{cmd.slice(0, width - 25)}</Text>
        </Box>
      ))}
      {entries.length > 12 && <Text dimColor>...and {entries.length - 12} more</Text>}
    </Box>
  );
}

function FilesPreview({ data, width, barWidth }: { data: ProjectData; width: number; barWidth: number }) {
  const maxCount = data.fileTypes[0]?.count || 1;

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">All File Types ({data.fileTypes.length} types, {formatNumber(data.totalFiles)} files)</Text>
      <Box>
        <Text bold dimColor>{'Type'.padEnd(12)}</Text>
        <Text bold dimColor>{'Count'.padEnd(8)}</Text>
        <Text bold dimColor>{'Size'.padEnd(10)}</Text>
        <Text bold dimColor>Distribution</Text>
      </Box>
      {data.fileTypes.map((ft, i) => (
        <Box key={i} gap={1}>
          <Text color={ft.color as any}>{ft.label.padEnd(12)}</Text>
          <Text>{String(ft.count).padEnd(8)}</Text>
          <Text dimColor>{formatSize(ft.totalSize).padEnd(10)}</Text>
          <Text color="cyan">{progressBar(ft.count, maxCount, barWidth)}</Text>
        </Box>
      ))}
    </Box>
  );
}

// ─── Drill-down panels ───────────────────────────────────

function ScriptsPanel(props: PanelProps<{ scripts: Record<string, string>; projectPath: string }>) {
  const { data, width, height, push, updateState } = props;
  const entries = Object.entries(data.scripts);
  const [selected, setSelected] = useState(0);

  const headerH = 2;
  const footerH = 1;
  const visibleH = Math.max(1, height - headerH - footerH);

  useEffect(() => {
    if (entries[selected]) {
      updateState({ script: entries[selected][0] });
    }
  }, [selected]);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelected(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelected(prev => Math.min(entries.length - 1, prev + 1));
    } else if (key.return && entries[selected]) {
      const [name, cmd] = entries[selected];
      push({
        id: `script-${name}`,
        title: name,
        component: ScriptDetailPanel as any,
        data: { name, command: cmd, projectPath: data.projectPath },
      });
    }
  });

  const visible = entries.slice(0, visibleH);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box><Text bold color="cyan">Scripts</Text><Text dimColor> ({entries.length})</Text></Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {visible.map(([name, cmd], i) => {
        const isSelected = i === selected;
        return (
          <Box key={i}>
            <Text bold={isSelected} color={isSelected ? 'cyan' : 'green'} inverse={isSelected}>
              {isSelected ? ' > ' : '   '}{name.padEnd(20)}
            </Text>
            <Text dimColor>{cmd.slice(0, width - 28)}</Text>
          </Box>
        );
      })}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>{selected + 1}/{entries.length}</Text>
        <Text dimColor>j/k:navigate  Enter:detail</Text>
      </Box>
    </Box>
  );
}

function ScriptDetailPanel(props: PanelProps<{ name: string; command: string; projectPath: string }>) {
  const { data, width, height } = props;

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box><Text bold color="cyan">Script: {data.name}</Text></Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>
      <Box><Text dimColor>Command:</Text></Box>
      <Box>
        <SyntaxHighlight code={data.command} language="bash" />
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>
      <Box><Text dimColor>Run with: </Text><Text color="green">bun run {data.name}</Text></Box>
      <Box flexGrow={1} />
      <Box><Text dimColor>Esc:back</Text></Box>
    </Box>
  );
}

function DepsPanel(props: PanelProps<{ deps: Record<string, string>; devDeps: Record<string, string> }>) {
  const { data, width, height, updateState } = props;
  const allDeps = [
    ...Object.entries(data.deps).map(([name, ver]) => ({ name, version: ver, dev: false })),
    ...Object.entries(data.devDeps).map(([name, ver]) => ({ name, version: ver, dev: true })),
  ];
  const [selected, setSelected] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const headerH = 3;
  const footerH = 1;
  const visibleH = Math.max(1, height - headerH - footerH);

  useEffect(() => {
    if (allDeps[selected]) {
      updateState({ dep: allDeps[selected].name });
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
        const next = Math.min(allDeps.length - 1, prev + 1);
        if (next >= scrollOffset + visibleH) setScrollOffset(next - visibleH + 1);
        return next;
      });
    }
  });

  const visible = allDeps.slice(scrollOffset, scrollOffset + visibleH);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box><Text bold color="cyan">Dependencies</Text><Text dimColor> ({allDeps.length})</Text></Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>
      <Box>
        <Text bold dimColor>{'Package'.padEnd(35)}</Text>
        <Text bold dimColor>{'Version'.padEnd(15)}</Text>
        <Text bold dimColor>Type</Text>
      </Box>

      {visible.map((dep, i) => {
        const idx = scrollOffset + i;
        const isSelected = idx === selected;
        return (
          <Box key={idx}>
            <Text bold={isSelected} color={isSelected ? 'cyan' : undefined} inverse={isSelected}>
              {isSelected ? ' > ' : '   '}{dep.name.padEnd(32)}
            </Text>
            <Text color="green">{dep.version.padEnd(15)}</Text>
            <Text color={dep.dev ? 'yellow' : 'green'}>{dep.dev ? 'dev' : 'prod'}</Text>
          </Box>
        );
      })}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>{selected + 1}/{allDeps.length}</Text>
        <Text dimColor>j/k:navigate</Text>
      </Box>
    </Box>
  );
}

function FileTypesPanel(props: PanelProps<{ fileTypes: FileTypeCount[]; totalFiles: number }>) {
  const { data, width, height } = props;
  const { fileTypes, totalFiles } = data;
  const barWidth = Math.min(40, width - 35);
  const maxCount = fileTypes[0]?.count || 1;

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box><Text bold color="cyan">File Type Distribution</Text><Text dimColor> ({formatNumber(totalFiles)} files)</Text></Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>
      <Box>
        <Text bold dimColor>{'Type'.padEnd(14)}</Text>
        <Text bold dimColor>{'Count'.padEnd(8)}</Text>
        <Text bold dimColor>{'Size'.padEnd(10)}</Text>
        <Text bold dimColor>{'%'.padEnd(6)}</Text>
        <Text bold dimColor>Distribution</Text>
      </Box>

      {fileTypes.map((ft, i) => {
        const pct = totalFiles > 0 ? ((ft.count / totalFiles) * 100).toFixed(1) : '0.0';
        return (
          <Box key={i}>
            <Text color={ft.color as any}>{ft.label.padEnd(14)}</Text>
            <Text>{String(ft.count).padEnd(8)}</Text>
            <Text dimColor>{formatSize(ft.totalSize).padEnd(10)}</Text>
            <Text dimColor>{(pct + '%').padEnd(6)}</Text>
            <Text color="cyan">{progressBar(ft.count, maxCount, barWidth)}</Text>
          </Box>
        );
      })}

      <Box flexGrow={1} />
      <Box><Text dimColor>Esc:back</Text></Box>
    </Box>
  );
}
