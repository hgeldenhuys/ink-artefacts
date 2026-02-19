import React from 'react';
import { render } from 'ink';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import { homedir } from 'os';
import { PanelStack, ListPanel, DetailPanel, TablePanel } from '../../src/index.js';
import type { PanelConfig, PanelProps } from '../../src/index.js';
import { Box, Text, useInput } from 'ink';

// ─── File Preview Panel ──────────────────────────────────
function FilePreviewPanel(props: PanelProps<{ path: string }>) {
  const { data, width, height } = props;
  const [scrollOffset, setScrollOffset] = React.useState(0);

  let lines: string[] = [];
  let error = '';
  try {
    const content = readFileSync(data.path, 'utf-8');
    lines = content.split('\n');
  } catch (e: any) {
    error = e.message;
  }

  React.useEffect(() => {
    props.updateState({ path: data.path, lines: lines.length });
  }, [data.path]);

  const visibleLines = height - 3;

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setScrollOffset(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setScrollOffset(prev => Math.min(Math.max(0, lines.length - visibleLines), prev + 1));
    } else if (key.pageUp) {
      setScrollOffset(prev => Math.max(0, prev - visibleLines));
    } else if (key.pageDown) {
      setScrollOffset(prev => Math.min(Math.max(0, lines.length - visibleLines), prev + visibleLines));
    }
  });

  if (error) {
    return (
      <Box flexDirection="column">
        <Text bold color="red">Cannot read file</Text>
        <Text dimColor>{error}</Text>
      </Box>
    );
  }

  const window = lines.slice(scrollOffset, scrollOffset + visibleLines);
  const gutterWidth = String(scrollOffset + visibleLines).length;

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="cyan">{basename(data.path)}</Text>
        <Text dimColor> ({lines.length} lines)</Text>
      </Box>
      <Box>
        <Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text>
      </Box>
      {window.map((line, i) => {
        const lineNum = scrollOffset + i + 1;
        return (
          <Box key={i}>
            <Text dimColor>{String(lineNum).padStart(gutterWidth)} │ </Text>
            <Text>{line.slice(0, width - gutterWidth - 4)}</Text>
          </Box>
        );
      })}
      <Box flexGrow={1} />
      <Text dimColor>
        Line {scrollOffset + 1}-{Math.min(scrollOffset + visibleLines, lines.length)} of {lines.length}  j/k:scroll  PgUp/PgDn
      </Text>
    </Box>
  );
}

// ─── Directory listing via ListPanel ──────────────────────
function makeDirPanel(dirPath: string): PanelConfig {
  let entries: Array<{ name: string; isDir: boolean; size: number; path: string }> = [];
  try {
    const names = readdirSync(dirPath);
    for (const name of names) {
      if (name.startsWith('.')) continue; // skip hidden
      try {
        const fullPath = join(dirPath, name);
        const stat = statSync(fullPath);
        entries.push({
          name,
          isDir: stat.isDirectory(),
          size: stat.size,
          path: fullPath,
        });
      } catch {
        // skip unreadable entries
      }
    }
  } catch {
    // empty
  }

  // Sort: directories first, then files
  entries.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });

  const items = entries.map(entry => ({
    id: entry.path,
    label: entry.name,
    description: entry.isDir ? '' : formatSize(entry.size),
    badge: entry.isDir ? 'DIR' : extLabel(entry.name),
    badgeColor: entry.isDir ? 'blue' : 'gray',
  }));

  return {
    id: `dir-${dirPath}`,
    title: basename(dirPath) || dirPath,
    component: ListPanel as any,
    data: {
      title: dirPath,
      items,
      onSelect: (item: any, _index: number, panelProps: any) => {
        const entry = entries.find(e => e.path === item.id);
        if (!entry) return;

        if (entry.isDir) {
          panelProps.push(makeDirPanel(entry.path));
        } else {
          // Show file detail then preview
          const stat = statSync(entry.path);
          panelProps.push({
            id: `detail-${entry.path}`,
            title: entry.name,
            component: DetailPanel,
            data: {
              title: entry.name,
              fields: [
                { label: 'Path', value: entry.path },
                { label: 'Size', value: formatSize(stat.size) },
                { label: 'Modified', value: stat.mtime.toLocaleString() },
                { label: 'Created', value: stat.birthtime.toLocaleString() },
                { label: 'Permissions', value: '0' + (stat.mode & 0o777).toString(8) },
                { label: 'Type', value: extLabel(entry.name) || 'unknown' },
              ],
              actions: [
                {
                  key: 'v',
                  label: 'View contents',
                  handler: (p: any) => {
                    p.push({
                      id: `preview-${entry.path}`,
                      title: 'Preview',
                      component: FilePreviewPanel,
                      data: { path: entry.path },
                    });
                  },
                },
              ],
            },
          } satisfies PanelConfig);
        }
      },
    },
  };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function extLabel(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: 'TS', tsx: 'TSX', js: 'JS', jsx: 'JSX', json: 'JSON',
    md: 'MD', txt: 'TXT', yml: 'YAML', yaml: 'YAML',
    sh: 'SH', css: 'CSS', html: 'HTML', py: 'PY', rs: 'RS',
    go: 'GO', toml: 'TOML', lock: 'LOCK', png: 'IMG', jpg: 'IMG',
  };
  return map[ext ?? ''] ?? (ext?.toUpperCase() ?? '');
}

// ─── Launch ──────────────────────────────────────────────
const startDir = process.argv[2] || process.cwd();

const { unmount } = render(
  <PanelStack
    appName="file-browser"
    initialPanel={makeDirPanel(startDir)}
    onExit={() => {
      unmount();
      process.exit(0);
    }}
  />,
);
