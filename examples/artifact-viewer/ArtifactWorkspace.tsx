import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { watch, readdirSync, readFileSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { Breadcrumb } from '../../src/components/Breadcrumb.js';
import { usePanelNavigation } from '../../src/hooks/usePanelNavigation.js';
import { useStateFile } from '../../src/hooks/useStateFile.js';
import { homedir } from 'os';
import { JsonTreePanel } from './renderers/json-tree.js';
import { DiskUsagePanel } from './renderers/disk-usage.js';
import { TableViewPanel } from './renderers/table-view.js';
import { LogViewPanel } from './renderers/log-view.js';
import { ListPanel, DetailPanel } from '../../src/index.js';
import type { PanelConfig } from '../../src/index.js';
import type { ArtifactDescriptor, ArtifactEntry } from './types.js';

// ─── Artifact -> Panel resolver ──────────────────────────

function artifactToPanel(descriptor: ArtifactDescriptor): PanelConfig {
  switch (descriptor.type) {
    case 'json-tree':
      return {
        id: descriptor.id,
        title: descriptor.title,
        component: JsonTreePanel as any,
        data: {
          json: descriptor.data,
          title: descriptor.title,
        },
        state: { artifactType: 'json-tree', artifactId: descriptor.id },
      };

    case 'disk-usage':
      return {
        id: descriptor.id,
        title: descriptor.title,
        component: DiskUsagePanel as any,
        data: descriptor.data,
        state: { artifactType: 'disk-usage', artifactId: descriptor.id },
      };

    case 'table':
      return {
        id: descriptor.id,
        title: descriptor.title,
        component: TableViewPanel as any,
        data: descriptor.data,
        state: { artifactType: 'table', artifactId: descriptor.id },
      };

    case 'key-value':
      return {
        id: descriptor.id,
        title: descriptor.title,
        component: DetailPanel as any,
        data: {
          title: descriptor.title,
          fields: Object.entries(descriptor.data as Record<string, unknown>).map(([key, val]) => ({
            label: key,
            value: val == null ? 'null' : String(val),
          })),
          actions: [],
        },
        state: { artifactType: 'key-value', artifactId: descriptor.id },
      };

    case 'file-list':
      return {
        id: descriptor.id,
        title: descriptor.title,
        component: ListPanel as any,
        data: {
          title: descriptor.title,
          items: (descriptor.data as any[]).map((item: any, i: number) => ({
            id: String(i),
            label: item.name ?? item.label ?? String(item),
            description: item.description ?? item.size ?? '',
            badge: item.badge,
            badgeColor: item.badgeColor,
          })),
        },
        state: { artifactType: 'file-list', artifactId: descriptor.id },
      };

    case 'log':
    default: {
      const rawData = descriptor.data;
      const content = typeof rawData === 'string'
        ? rawData
        : (rawData as any)?.content ?? JSON.stringify(rawData, null, 2);
      const color = typeof rawData === 'object' && rawData !== null
        ? (rawData as any).color
        : undefined;
      return {
        id: descriptor.id,
        title: descriptor.title,
        component: LogViewPanel as any,
        data: {
          title: (typeof rawData === 'object' && rawData !== null ? (rawData as any).title : undefined) ?? descriptor.title,
          content,
          color,
        },
        state: { artifactType: descriptor.type, artifactId: descriptor.id },
      };
    }
  }
}

// ─── Artifact Stack Manager ──────────────────────────────
// Each artifact gets its own panel navigation stack.

interface ArtifactStack {
  entry: ArtifactEntry;
  nav: ReturnType<typeof usePanelNavigation>;
}

// Since hooks can't be called dynamically, we manage stacks with a single component per artifact.
function ArtifactPanel({
  descriptor,
  isActive,
  width,
  height,
  appName,
}: {
  descriptor: ArtifactDescriptor;
  isActive: boolean;
  width: number;
  height: number;
  appName: string;
}) {
  const rootPanel = artifactToPanel(descriptor);
  const { stack, activePanel, breadcrumbs, push, pop, replace, updateState } = usePanelNavigation(rootPanel);

  const resolvedPath = join(homedir(), '.claude', 'tui-state.json');
  useStateFile(appName, stack, resolvedPath, isActive, 300);

  // Only handle input when this artifact tab is active
  useInput((input, key) => {
    if (!isActive) return;
    if (key.escape) {
      pop();
    }
  }, { isActive });

  if (!isActive) return null;

  const Component = activePanel.component;
  const panelHeight = height - 2; // reserve for breadcrumb

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box flexDirection="column" flexGrow={1} width={width} height={panelHeight}>
        <Component
          data={activePanel.data}
          push={push}
          pop={pop}
          replace={replace}
          updateState={updateState}
          width={width}
          height={panelHeight}
        />
      </Box>
      <Breadcrumb entries={breadcrumbs} width={width} />
    </Box>
  );
}

// ─── Main Workspace ──────────────────────────────────────

interface WorkspaceProps {
  artifactsDir: string;
  appName?: string;
  onExit?: () => void;
}

export function ArtifactWorkspace({ artifactsDir, appName = 'artifact-viewer', onExit }: WorkspaceProps) {
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState({
    width: stdout.columns || 80,
    height: stdout.rows || 24,
  });
  const [artifacts, setArtifacts] = useState<ArtifactDescriptor[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  // Track terminal resize
  useEffect(() => {
    const onResize = () => {
      setDimensions({ width: stdout.columns || 80, height: stdout.rows || 24 });
    };
    stdout.on('resize', onResize);
    return () => { stdout.off('resize', onResize); };
  }, [stdout]);

  // Ensure artifacts directory exists
  useEffect(() => {
    mkdirSync(artifactsDir, { recursive: true });
  }, [artifactsDir]);

  // Load existing artifacts and watch for new ones
  useEffect(() => {
    const loadArtifact = (filePath: string): ArtifactDescriptor | null => {
      try {
        const content = readFileSync(filePath, 'utf-8');
        return JSON.parse(content) as ArtifactDescriptor;
      } catch {
        return null;
      }
    };

    const loadAll = () => {
      try {
        const files = readdirSync(artifactsDir).filter(f => f.endsWith('.json')).sort();
        const loaded: ArtifactDescriptor[] = [];
        for (const file of files) {
          const desc = loadArtifact(join(artifactsDir, file));
          if (desc) loaded.push(desc);
        }
        setArtifacts(loaded);
      } catch {
        // dir might not exist yet
      }
    };

    loadAll();

    // Watch for new artifacts
    let watcher: ReturnType<typeof watch> | null = null;
    try {
      watcher = watch(artifactsDir, (eventType, filename) => {
        if (filename && filename.endsWith('.json')) {
          // Reload all to keep ordering consistent
          loadAll();
        }
      });
    } catch {
      // watch not supported or dir doesn't exist
    }

    return () => { watcher?.close(); };
  }, [artifactsDir]);

  // Keep activeTab in bounds
  useEffect(() => {
    if (artifacts.length > 0 && activeTab >= artifacts.length) {
      setActiveTab(artifacts.length - 1);
    }
  }, [artifacts.length, activeTab]);

  // Jump to newest artifact ONLY when one is added at runtime (not on initial load)
  const initialLoadDone = useRef(false);
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (!initialLoadDone.current) {
      if (artifacts.length > 0) {
        // First non-empty load — stay on first tab
        initialLoadDone.current = true;
        prevCountRef.current = artifacts.length;
        setActiveTab(0);
      }
    } else if (artifacts.length > prevCountRef.current) {
      // New artifact added at runtime — jump to it
      setActiveTab(artifacts.length - 1);
      prevCountRef.current = artifacts.length;
    } else {
      prevCountRef.current = artifacts.length;
    }
  }, [artifacts.length]);

  // Global keys: left/right to switch tabs, q to quit
  useInput((input, key) => {
    if (key.leftArrow && key.shift) {
      setActiveTab(prev => (prev - 1 + artifacts.length) % artifacts.length);
    } else if (key.rightArrow && key.shift) {
      setActiveTab(prev => (prev + 1) % artifacts.length);
    } else if (input === '[') {
      setActiveTab(prev => (prev - 1 + artifacts.length) % artifacts.length);
    } else if (input === ']') {
      setActiveTab(prev => (prev + 1) % artifacts.length);
    } else if (input === 'q' && key.ctrl) {
      if (onExit) onExit();
    }
  });

  const { width, height: totalHeight } = dimensions;
  // Reserve: 2 lines for tab bar + 1 separator
  const tabBarHeight = 1;
  const separatorHeight = 1;
  const contentHeight = totalHeight - tabBarHeight - separatorHeight;

  if (artifacts.length === 0) {
    return (
      <Box flexDirection="column" width={width} height={totalHeight}>
        <Box justifyContent="center" alignItems="center" flexGrow={1} flexDirection="column">
          <Text bold color="cyan">Artifact Viewer</Text>
          <Text dimColor>Watching: {artifactsDir}</Text>
          <Text dimColor>No artifacts yet. Drop JSON files to see them here.</Text>
          <Text> </Text>
          <Text dimColor>Ctrl+Q to quit</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width={width} height={totalHeight}>
      {/* Tab bar */}
      <Box width={width} height={tabBarHeight}>
        <Text dimColor>[/] </Text>
        {artifacts.map((art, i) => {
          const isActive = i === activeTab;
          return (
            <React.Fragment key={art.id}>
              {i > 0 && <Text dimColor> │ </Text>}
              <Text
                bold={isActive}
                color={isActive ? 'cyan' : undefined}
                dimColor={!isActive}
                inverse={isActive}
              >
                {` ${art.title} `}
              </Text>
            </React.Fragment>
          );
        })}
        <Box flexGrow={1} />
        <Text dimColor>{activeTab + 1}/{artifacts.length}</Text>
      </Box>

      {/* Separator */}
      <Box width={width} height={separatorHeight}>
        <Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text>
      </Box>

      {/* Active artifact panel */}
      {artifacts.map((art, i) => (
        <ArtifactPanel
          key={art.id}
          descriptor={art}
          isActive={i === activeTab}
          width={width}
          height={contentHeight}
          appName={appName}
        />
      ))}
    </Box>
  );
}
