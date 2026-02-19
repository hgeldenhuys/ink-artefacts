/**
 * SwarmExplorer — Root component for browsing SWARM project data.
 *
 * Navigation:
 *   Root (Dashboard) → Stories list → Story detail → ACs / Tasks
 *                    → Knowledge list → Knowledge detail
 *                    → Retrospectives list → Retro detail
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useStdout, useInput } from 'ink';
import { PanelStack } from '../../src/index.js';
import type { PanelConfig, PanelProps } from '../../src/index.js';
import {
  loadStories, loadKnowledge, loadRetros, loadConfig,
  STATUS_ORDER, STATUS_COLORS, PRIORITY_COLORS,
  DIMENSION_LABELS, DIMENSION_SHORT, DIMENSION_COLORS,
  type StoryMeta, type KnowledgeItem, type RetroMeta, type ConfigMeta,
  type ParsedFile, type AcceptanceCriterion, type SwarmTask,
} from './swarm-parser.js';

// ─── Dashboard Panel ─────────────────────────────────────

interface DashboardData {
  title: string;
  swarmDir: string;
}

function DashboardPanel(props: PanelProps<DashboardData>) {
  const { data, push, width, height } = props;

  // Load all data
  const stories = loadStories(data.swarmDir);
  const knowledge = loadKnowledge(data.swarmDir);
  const retros = loadRetros(data.swarmDir);
  const config = loadConfig(data.swarmDir);

  // Status counts
  const statusCounts: Record<string, number> = {};
  for (const s of stories) {
    const status = s.meta.status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }

  // Task counts across all stories
  let totalTasks = 0, doneTasks = 0, inProgressTasks = 0;
  for (const s of stories) {
    for (const t of (s.meta.tasks || [])) {
      totalTasks++;
      if (t.status === 'done') doneTasks++;
      else if (t.status === 'in_progress') inProgressTasks++;
    }
  }

  // AC counts
  let totalACs = 0, passingACs = 0;
  for (const s of stories) {
    for (const ac of (s.meta.acceptance_criteria || [])) {
      totalACs++;
      if (ac.status === 'passing') passingACs++;
    }
  }

  // Knowledge dimension counts
  const dimCounts: Record<string, number> = { epistemology: 0, qualia: 0, praxeology: 0 };
  for (const k of knowledge) {
    dimCounts[k.meta.dimension] = (dimCounts[k.meta.dimension] || 0) + 1;
  }

  const menuItems = [
    { key: 's', label: 'Stories', count: stories.length, color: 'cyan' },
    { key: 'k', label: 'Knowledge', count: knowledge.length, color: 'green' },
    { key: 'r', label: 'Retrospectives', count: retros.length, color: 'magenta' },
  ];

  useInput((input: string) => {
    if (input === 's') {
      push(makeStoriesPanel(data.swarmDir));
    } else if (input === 'k') {
      push(makeKnowledgePanel(data.swarmDir));
    } else if (input === 'r') {
      push(makeRetrosPanel(data.swarmDir));
    }
  });

  const projectName = config?.meta.project || 'SWARM Project';
  const prefix = config?.meta.prefix || '???';
  const barWidth = Math.min(width - 4, 40);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box justifyContent="center" width={width}>
        <Text bold color="cyan">SWARM Explorer</Text>
        <Text dimColor> — {projectName} [{prefix}]</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {/* Status overview */}
      <Box flexDirection="column" marginTop={1} paddingLeft={2}>
        <Text bold>Stories by Status</Text>
        {(['executing', 'verifying', 'planned', 'ideating', 'draft', 'done', 'archived'] as const).map(status => {
          const count = statusCounts[status] || 0;
          if (count === 0) return null;
          const filled = Math.round((count / stories.length) * barWidth);
          return (
            <Box key={status}>
              <Text color={STATUS_COLORS[status] as any}>
                {`  ${status.padEnd(15)} `}
              </Text>
              <Text color={STATUS_COLORS[status] as any}>{'█'.repeat(filled)}</Text>
              <Text dimColor>{'░'.repeat(barWidth - filled)}</Text>
              <Text> {count}</Text>
            </Box>
          );
        })}
      </Box>

      {/* Metrics */}
      <Box flexDirection="column" marginTop={1} paddingLeft={2}>
        <Text bold>Metrics</Text>
        <Text>  Tasks:      {doneTasks}/{totalTasks} done{inProgressTasks > 0 ? `, ${inProgressTasks} active` : ''}</Text>
        <Text>  ACs:        {passingACs}/{totalACs} passing</Text>
        <Text>  Knowledge:  <Text color="blue">E:{dimCounts.epistemology}</Text> <Text color="red">Q:{dimCounts.qualia}</Text> <Text color="green">P:{dimCounts.praxeology}</Text></Text>
        <Text>  Retros:     {retros.length}</Text>
      </Box>

      {/* Navigation */}
      <Box flexDirection="column" marginTop={1} paddingLeft={2}>
        <Text bold>Navigate</Text>
        {menuItems.map(item => (
          <Box key={item.key}>
            <Text color={item.color as any}> [{item.key}] {item.label}</Text>
            <Text dimColor> ({item.count})</Text>
          </Box>
        ))}
      </Box>

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor> {data.swarmDir}</Text>
        <Text dimColor>s/k/r:navigate  q:quit</Text>
      </Box>
    </Box>
  );
}

// ─── Stories List Panel ──────────────────────────────────

function makeStoriesPanel(swarmDir: string): PanelConfig {
  const stories = loadStories(swarmDir);
  stories.sort((a, b) => (STATUS_ORDER[a.meta.status] ?? 99) - (STATUS_ORDER[b.meta.status] ?? 99));

  return {
    id: 'stories',
    title: 'Stories',
    component: StoriesListPanel as any,
    data: { title: 'Stories', stories, swarmDir },
    state: { view: 'stories' },
  };
}

interface StoriesListData {
  title: string;
  stories: ParsedFile<StoryMeta>[];
  swarmDir: string;
}

function StoriesListPanel(props: PanelProps<StoriesListData>) {
  const { data, push, width, height, updateState } = props;
  const { stories } = data;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const headerLines = 2;
  const footerLines = 1;
  const visibleItems = Math.max(1, height - headerLines - footerLines);

  useEffect(() => {
    if (selectedIndex < scrollOffset) setScrollOffset(selectedIndex);
    else if (selectedIndex >= scrollOffset + visibleItems) setScrollOffset(selectedIndex - visibleItems + 1);
  }, [selectedIndex, scrollOffset, visibleItems]);

  useEffect(() => {
    if (stories[selectedIndex]) {
      updateState({ selectedId: stories[selectedIndex]!.meta.id });
    }
  }, [selectedIndex]);

  useInput((input: string, key: any) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(stories.length - 1, prev + 1));
    } else if (key.return) {
      const story = stories[selectedIndex];
      if (story) push(makeStoryDetailPanel(story, data.swarmDir));
    } else if (input === 'g') {
      setSelectedIndex(0);
    } else if (input === 'G') {
      setSelectedIndex(stories.length - 1);
    }
  });

  const windowItems = stories.slice(scrollOffset, scrollOffset + visibleItems);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="cyan">Stories</Text>
        <Text dimColor> ({stories.length})</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {windowItems.map((story, windowIdx) => {
        const actualIdx = scrollOffset + windowIdx;
        const isSelected = actualIdx === selectedIndex;
        const m = story.meta;
        const tasksDone = (m.tasks || []).filter(t => t.status === 'done').length;
        const tasksTotal = (m.tasks || []).length;
        const acsPassing = (m.acceptance_criteria || []).filter(a => a.status === 'passing').length;
        const acsTotal = (m.acceptance_criteria || []).length;

        return (
          <Box key={m.id}>
            <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? ' > ' : '   '}</Text>
            <Text color={STATUS_COLORS[m.status] as any}>[{m.status.slice(0, 4).toUpperCase()}]</Text>
            <Text> </Text>
            <Text color={PRIORITY_COLORS[m.priority] as any}>{m.priority[0]!.toUpperCase()}</Text>
            <Text> </Text>
            <Text bold={isSelected} color={isSelected ? 'cyan' : undefined}>{m.id}: {m.title}</Text>
            <Text dimColor> T:{tasksDone}/{tasksTotal} AC:{acsPassing}/{acsTotal}</Text>
          </Box>
        );
      })}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>{stories.length > 0 ? `${selectedIndex + 1}/${stories.length}` : 'Empty'}</Text>
        <Text dimColor>j/k:move  Enter:details  Esc:back</Text>
      </Box>
    </Box>
  );
}

// ─── Story Detail Panel ──────────────────────────────────

function makeStoryDetailPanel(story: ParsedFile<StoryMeta>, swarmDir: string): PanelConfig {
  return {
    id: `story-${story.meta.id}`,
    title: story.meta.id,
    component: StoryDetailPanel as any,
    data: { story, swarmDir },
    state: { storyId: story.meta.id },
  };
}

interface StoryDetailData {
  story: ParsedFile<StoryMeta>;
  swarmDir: string;
}

function StoryDetailPanel(props: PanelProps<StoryDetailData>) {
  const { data, push, width, height } = props;
  const m = data.story.meta;
  const [scrollOffset, setScrollOffset] = useState(0);

  useInput((input: string, key: any) => {
    if (input === 'a') {
      push(makeACsPanel(data.story));
    } else if (input === 't') {
      push(makeTasksPanel(data.story));
    } else if (key.upArrow || input === 'k') {
      setScrollOffset(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setScrollOffset(prev => prev + 1);
    }
  });

  const lines: Array<{ label: string; value: string; color?: string }> = [
    { label: 'ID', value: m.id },
    { label: 'Title', value: m.title },
    { label: 'Status', value: m.status, color: STATUS_COLORS[m.status] },
    { label: 'Priority', value: m.priority, color: PRIORITY_COLORS[m.priority] },
    { label: 'Complexity', value: m.complexity },
    { label: 'Author', value: m.author },
    { label: 'Created', value: m.created },
    { label: 'Updated', value: m.updated },
    { label: 'Tags', value: (m.tags || []).join(', ') },
    { label: '', value: '' },
    { label: 'Problem', value: m.why?.problem || 'N/A' },
    { label: 'Root Cause', value: m.why?.root_cause || 'N/A' },
    { label: 'Impact', value: m.why?.impact || 'N/A' },
    { label: '', value: '' },
    { label: 'ACs', value: `${(m.acceptance_criteria || []).filter(a => a.status === 'passing').length}/${(m.acceptance_criteria || []).length} passing` },
    { label: 'Tasks', value: `${(m.tasks || []).filter(t => t.status === 'done').length}/${(m.tasks || []).length} done` },
  ];

  if (m.execution?.started_at) {
    lines.push({ label: 'Started', value: m.execution.started_at });
  }
  if (m.execution?.completed_at) {
    lines.push({ label: 'Completed', value: m.execution.completed_at });
  }

  const headerLines = 2;
  const footerLines = 3;
  const visibleLines = Math.max(1, height - headerLines - footerLines);
  const windowLines = lines.slice(scrollOffset, scrollOffset + visibleLines);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="cyan">{m.id}</Text>
        <Text bold>: {m.title}</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {windowLines.map((line, i) => {
        if (!line.label) return <Box key={scrollOffset + i}><Text> </Text></Box>;
        return (
          <Box key={scrollOffset + i}>
            <Text dimColor>  {line.label.padEnd(12)} </Text>
            <Text color={line.color as any}>{line.value}</Text>
          </Box>
        );
      })}

      <Box flexGrow={1} />

      <Box paddingLeft={2}>
        <Text color="cyan">[a] Acceptance Criteria</Text>
        <Text>  </Text>
        <Text color="yellow">[t] Tasks</Text>
      </Box>
      <Box justifyContent="space-between" width={width}>
        <Text dimColor> j/k:scroll</Text>
        <Text dimColor>a:ACs  t:tasks  Esc:back</Text>
      </Box>
    </Box>
  );
}

// ─── Acceptance Criteria Panel ───────────────────────────

function makeACsPanel(story: ParsedFile<StoryMeta>): PanelConfig {
  return {
    id: `acs-${story.meta.id}`,
    title: 'ACs',
    component: ACsPanel as any,
    data: { story },
    state: { view: 'acs' },
  };
}

function ACsPanel(props: PanelProps<{ story: ParsedFile<StoryMeta> }>) {
  const { data, width, height } = props;
  const acs = data.story.meta.acceptance_criteria || [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const headerLines = 2;
  const footerLines = 1;
  const visibleItems = Math.max(1, height - headerLines - footerLines);

  useEffect(() => {
    if (selectedIndex < scrollOffset) setScrollOffset(selectedIndex);
    else if (selectedIndex >= scrollOffset + visibleItems) setScrollOffset(selectedIndex - visibleItems + 1);
  }, [selectedIndex, scrollOffset, visibleItems]);

  useInput((input: string, key: any) => {
    if (key.upArrow || input === 'k') setSelectedIndex(prev => Math.max(0, prev - 1));
    else if (key.downArrow || input === 'j') setSelectedIndex(prev => Math.min(acs.length - 1, prev + 1));
  });

  const statusIcon = (s: string) => {
    if (s === 'passing') return '\u2714';
    if (s === 'failing') return '\u2718';
    return '\u25CB';
  };
  const statusColor = (s: string) => {
    if (s === 'passing') return 'green';
    if (s === 'failing') return 'red';
    return 'gray';
  };

  const windowItems = acs.slice(scrollOffset, scrollOffset + visibleItems);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="cyan">Acceptance Criteria</Text>
        <Text dimColor> — {data.story.meta.id} ({acs.length})</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {windowItems.map((ac, windowIdx) => {
        const actualIdx = scrollOffset + windowIdx;
        const isSelected = actualIdx === selectedIndex;
        return (
          <Box key={ac.id} flexDirection="column">
            <Box>
              <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? ' > ' : '   '}</Text>
              <Text color={statusColor(ac.status) as any}>{statusIcon(ac.status)} </Text>
              <Text bold={isSelected} color={isSelected ? 'cyan' : undefined}>[{ac.id}] {ac.description}</Text>
            </Box>
            {ac.evidence && (
              <Box paddingLeft={6}>
                <Text dimColor italic>Evidence: {ac.evidence}</Text>
              </Box>
            )}
          </Box>
        );
      })}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>{acs.length > 0 ? `${selectedIndex + 1}/${acs.length}` : 'No ACs'}</Text>
        <Text dimColor>j/k:move  Esc:back</Text>
      </Box>
    </Box>
  );
}

// ─── Tasks Panel ─────────────────────────────────────────

function makeTasksPanel(story: ParsedFile<StoryMeta>): PanelConfig {
  return {
    id: `tasks-${story.meta.id}`,
    title: 'Tasks',
    component: TasksPanel as any,
    data: { story },
    state: { view: 'tasks' },
  };
}

function TasksPanel(props: PanelProps<{ story: ParsedFile<StoryMeta> }>) {
  const { data, push, width, height } = props;
  const tasks = data.story.meta.tasks || [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const headerLines = 2;
  const footerLines = 1;
  const visibleItems = Math.max(1, height - headerLines - footerLines);

  useEffect(() => {
    if (selectedIndex < scrollOffset) setScrollOffset(selectedIndex);
    else if (selectedIndex >= scrollOffset + visibleItems) setScrollOffset(selectedIndex - visibleItems + 1);
  }, [selectedIndex, scrollOffset, visibleItems]);

  useInput((input: string, key: any) => {
    if (key.upArrow || input === 'k') setSelectedIndex(prev => Math.max(0, prev - 1));
    else if (key.downArrow || input === 'j') setSelectedIndex(prev => Math.min(tasks.length - 1, prev + 1));
    else if (key.return) {
      const task = tasks[selectedIndex];
      if (task) push(makeTaskDetailPanel(task, data.story.meta.id));
    }
  });

  const taskIcon = (s: string) => {
    if (s === 'done') return '\u2714';
    if (s === 'in_progress') return '\u25FC';
    if (s === 'skipped') return '\u2013';
    return '\u25FB';
  };
  const taskColor = (s: string) => {
    if (s === 'done') return 'green';
    if (s === 'in_progress') return 'yellow';
    if (s === 'skipped') return 'gray';
    return undefined;
  };

  const windowItems = tasks.slice(scrollOffset, scrollOffset + visibleItems);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="cyan">Tasks</Text>
        <Text dimColor> — {data.story.meta.id} ({tasks.length})</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {windowItems.map((task, windowIdx) => {
        const actualIdx = scrollOffset + windowIdx;
        const isSelected = actualIdx === selectedIndex;
        return (
          <Box key={task.id}>
            <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? ' > ' : '   '}</Text>
            <Text color={taskColor(task.status) as any}>{taskIcon(task.status)} </Text>
            <Text bold={isSelected} color={isSelected ? 'cyan' : undefined}>
              [{task.id}] {task.title}
            </Text>
            <Text dimColor> @{task.agent} [{task.effort_estimate}]</Text>
          </Box>
        );
      })}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>{tasks.length > 0 ? `${selectedIndex + 1}/${tasks.length}` : 'No tasks'}</Text>
        <Text dimColor>j/k:move  Enter:detail  Esc:back</Text>
      </Box>
    </Box>
  );
}

// ─── Task Detail Panel ───────────────────────────────────

function makeTaskDetailPanel(task: SwarmTask, storyId: string): PanelConfig {
  return {
    id: `task-${task.id}`,
    title: task.id,
    component: TaskDetailPanel as any,
    data: { task, storyId },
    state: { taskId: task.id },
  };
}

function TaskDetailPanel(props: PanelProps<{ task: SwarmTask; storyId: string }>) {
  const { data, width, height } = props;
  const t = data.task;

  const fields = [
    { label: 'Task ID', value: t.id },
    { label: 'Title', value: t.title },
    { label: 'Status', value: t.status },
    { label: 'Agent', value: t.agent },
    { label: 'Effort', value: t.effort_estimate },
    { label: 'Depends On', value: (t.depends_on || []).join(', ') || 'None' },
    { label: 'AC Coverage', value: (t.ac_coverage || []).join(', ') || 'None' },
    { label: 'Story', value: data.storyId },
  ];

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="cyan">{t.id}</Text>
        <Text bold>: {t.title}</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {fields.map(f => (
        <Box key={f.label}>
          <Text dimColor>  {f.label.padEnd(12)} </Text>
          <Text>{f.value}</Text>
        </Box>
      ))}

      <Box flexGrow={1} />
      <Box justifyContent="flex-end" width={width}>
        <Text dimColor>Esc:back</Text>
      </Box>
    </Box>
  );
}

// ─── Knowledge List Panel ────────────────────────────────

function makeKnowledgePanel(swarmDir: string): PanelConfig {
  const knowledge = loadKnowledge(swarmDir);
  return {
    id: 'knowledge',
    title: 'Knowledge',
    component: KnowledgeListPanel as any,
    data: { title: 'Knowledge Base', knowledge, swarmDir },
    state: { view: 'knowledge' },
  };
}

interface KnowledgeListData {
  title: string;
  knowledge: ParsedFile<KnowledgeItem>[];
  swarmDir: string;
}

function KnowledgeListPanel(props: PanelProps<KnowledgeListData>) {
  const { data, push, width, height, updateState } = props;
  const { knowledge } = data;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const headerLines = 2;
  const footerLines = 1;
  const visibleItems = Math.max(1, height - headerLines - footerLines);

  useEffect(() => {
    if (selectedIndex < scrollOffset) setScrollOffset(selectedIndex);
    else if (selectedIndex >= scrollOffset + visibleItems) setScrollOffset(selectedIndex - visibleItems + 1);
  }, [selectedIndex, scrollOffset, visibleItems]);

  useEffect(() => {
    if (knowledge[selectedIndex]) {
      updateState({ selectedId: knowledge[selectedIndex]!.meta.id });
    }
  }, [selectedIndex]);

  useInput((input: string, key: any) => {
    if (key.upArrow || input === 'k') setSelectedIndex(prev => Math.max(0, prev - 1));
    else if (key.downArrow || input === 'j') setSelectedIndex(prev => Math.min(knowledge.length - 1, prev + 1));
    else if (key.return) {
      const item = knowledge[selectedIndex];
      if (item) push(makeKnowledgeDetailPanel(item));
    }
  });

  const windowItems = knowledge.slice(scrollOffset, scrollOffset + visibleItems);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="cyan">Knowledge Base</Text>
        <Text dimColor> ({knowledge.length} items)</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {windowItems.map((item, windowIdx) => {
        const actualIdx = scrollOffset + windowIdx;
        const isSelected = actualIdx === selectedIndex;
        const m = item.meta;
        return (
          <Box key={m.id}>
            <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? ' > ' : '   '}</Text>
            <Text color={DIMENSION_COLORS[m.dimension] as any}>[{DIMENSION_SHORT[m.dimension]}]</Text>
            <Text> </Text>
            <Text bold={isSelected} color={isSelected ? 'cyan' : undefined}>{m.title}</Text>
            <Text dimColor> @{m.domain} [{m.confidence}]</Text>
          </Box>
        );
      })}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>{knowledge.length > 0 ? `${selectedIndex + 1}/${knowledge.length}` : 'Empty'}</Text>
        <Text dimColor>j/k:move  Enter:detail  Esc:back</Text>
      </Box>
    </Box>
  );
}

// ─── Knowledge Detail Panel ──────────────────────────────

function makeKnowledgeDetailPanel(item: ParsedFile<KnowledgeItem>): PanelConfig {
  return {
    id: `knowledge-${item.meta.id}`,
    title: item.meta.id,
    component: KnowledgeDetailPanel as any,
    data: { item },
    state: { knowledgeId: item.meta.id },
  };
}

function KnowledgeDetailPanel(props: PanelProps<{ item: ParsedFile<KnowledgeItem> }>) {
  const { data, width, height } = props;
  const m = data.item.meta;
  const [scrollOffset, setScrollOffset] = useState(0);

  useInput((input: string, key: any) => {
    if (key.upArrow || input === 'k') setScrollOffset(prev => Math.max(0, prev - 1));
    else if (key.downArrow || input === 'j') setScrollOffset(prev => prev + 1);
  });

  const lines: Array<{ label: string; value: string; color?: string }> = [
    { label: 'ID', value: m.id },
    { label: 'Dimension', value: `${DIMENSION_LABELS[m.dimension]} (${DIMENSION_SHORT[m.dimension]})`, color: DIMENSION_COLORS[m.dimension] },
    { label: 'Domain', value: m.domain },
    { label: 'Confidence', value: m.confidence },
    { label: 'Scope', value: m.scope },
    { label: 'Source', value: `${m.source_story} (${m.source_repo})` },
    { label: 'Author', value: m.author },
    { label: 'Hoistable', value: m.hoistable ? 'Yes' : 'No' },
    { label: 'Tags', value: (m.tags || []).join(', ') },
    { label: '', value: '' },
    { label: 'Title', value: m.title },
    { label: '', value: '' },
  ];

  // Wrap long text fields
  const wrapWidth = Math.max(20, width - 18);
  const descLines = wrapText(m.description, wrapWidth);
  const contextLines = wrapText(m.context, wrapWidth);
  const recoLines = wrapText(m.recommendation, wrapWidth);

  const allLines: Array<{ text: string; dimColor?: boolean; color?: string }> = [];
  for (const l of lines) {
    if (!l.label) { allLines.push({ text: '' }); continue; }
    allLines.push({ text: `  ${l.label.padEnd(12)} ${l.value}`, color: l.color });
  }
  allLines.push({ text: '  Description', dimColor: true });
  for (const l of descLines) allLines.push({ text: `    ${l}` });
  allLines.push({ text: '' });
  allLines.push({ text: '  Context', dimColor: true });
  for (const l of contextLines) allLines.push({ text: `    ${l}` });
  allLines.push({ text: '' });
  allLines.push({ text: '  Recommendation', dimColor: true });
  for (const l of recoLines) allLines.push({ text: `    ${l}` });

  const headerLines2 = 2;
  const footerLines2 = 1;
  const visibleLines = Math.max(1, height - headerLines2 - footerLines2);
  const windowLines = allLines.slice(scrollOffset, scrollOffset + visibleLines);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color={DIMENSION_COLORS[m.dimension] as any}>[{DIMENSION_SHORT[m.dimension]}]</Text>
        <Text bold> {m.title}</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {windowLines.map((line, i) => (
        <Box key={scrollOffset + i}>
          <Text dimColor={line.dimColor} color={line.color as any}>{line.text}</Text>
        </Box>
      ))}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>
          {allLines.length > visibleLines
            ? `${scrollOffset + 1}-${Math.min(scrollOffset + visibleLines, allLines.length)}/${allLines.length}`
            : `${allLines.length} lines`}
        </Text>
        <Text dimColor>j/k:scroll  Esc:back</Text>
      </Box>
    </Box>
  );
}

// ─── Retrospectives List Panel ───────────────────────────

function makeRetrosPanel(swarmDir: string): PanelConfig {
  const retros = loadRetros(swarmDir);
  return {
    id: 'retros',
    title: 'Retrospectives',
    component: RetrosListPanel as any,
    data: { title: 'Retrospectives', retros, swarmDir },
    state: { view: 'retros' },
  };
}

interface RetrosListData {
  title: string;
  retros: ParsedFile<RetroMeta>[];
  swarmDir: string;
}

function RetrosListPanel(props: PanelProps<RetrosListData>) {
  const { data, push, width, height } = props;
  const { retros } = data;
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input: string, key: any) => {
    if (key.upArrow || input === 'k') setSelectedIndex(prev => Math.max(0, prev - 1));
    else if (key.downArrow || input === 'j') setSelectedIndex(prev => Math.min(retros.length - 1, prev + 1));
    else if (key.return) {
      const retro = retros[selectedIndex];
      if (retro) push(makeRetroDetailPanel(retro));
    }
  });

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="cyan">Retrospectives</Text>
        <Text dimColor> ({retros.length})</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {retros.map((retro, i) => {
        const isSelected = i === selectedIndex;
        const m = retro.meta;
        return (
          <Box key={m.story_id}>
            <Text color={isSelected ? 'cyan' : undefined}>{isSelected ? ' > ' : '   '}</Text>
            <Text bold={isSelected} color={isSelected ? 'cyan' : undefined}>
              {m.story_id}: {m.title}
            </Text>
            <Text dimColor> {m.duration} | {m.agents_involved.length} agents</Text>
          </Box>
        );
      })}

      {retros.length === 0 && (
        <Box paddingLeft={2}><Text dimColor>No retrospectives yet.</Text></Box>
      )}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>{retros.length > 0 ? `${selectedIndex + 1}/${retros.length}` : 'Empty'}</Text>
        <Text dimColor>j/k:move  Enter:detail  Esc:back</Text>
      </Box>
    </Box>
  );
}

// ─── Retro Detail Panel ──────────────────────────────────

function makeRetroDetailPanel(retro: ParsedFile<RetroMeta>): PanelConfig {
  return {
    id: `retro-${retro.meta.story_id}`,
    title: `Retro: ${retro.meta.story_id}`,
    component: RetroDetailPanel as any,
    data: { retro },
    state: { retroId: retro.meta.story_id },
  };
}

function RetroDetailPanel(props: PanelProps<{ retro: ParsedFile<RetroMeta> }>) {
  const { data, width, height } = props;
  const m = data.retro.meta;
  const body = data.retro.body;
  const [scrollOffset, setScrollOffset] = useState(0);

  useInput((input: string, key: any) => {
    if (key.upArrow || input === 'k') setScrollOffset(prev => Math.max(0, prev - 1));
    else if (key.downArrow || input === 'j') setScrollOffset(prev => prev + 1);
  });

  const allLines: string[] = [];
  allLines.push(`Story:     ${m.story_id}`);
  allLines.push(`Completed: ${m.completed}`);
  allLines.push(`Duration:  ${m.duration}`);
  allLines.push(`Agents:    ${m.agents_involved.join(', ')}`);
  allLines.push('');

  if (m.metrics) {
    allLines.push('Metrics:');
    allLines.push(`  Tasks: ${m.metrics.tasks_completed}/${m.metrics.tasks_total}`);
    allLines.push(`  ACs:   ${m.metrics.acs_passing}/${m.metrics.acs_total}`);
    allLines.push(`  Files changed: ${m.metrics.files_changed}`);
    allLines.push(`  Tests added:   ${m.metrics.tests_added}`);
    allLines.push(`  Cycle time:    ${m.metrics.cycle_time_hours}h`);
    allLines.push('');
  }

  // Include the markdown body
  const bodyLines = body.split('\n');
  for (const line of bodyLines) {
    allLines.push(line);
  }

  const headerLines2 = 2;
  const footerLines2 = 1;
  const visibleLines = Math.max(1, height - headerLines2 - footerLines2);
  const windowLines = allLines.slice(scrollOffset, scrollOffset + visibleLines);

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box>
        <Text bold color="magenta">Retrospective: {m.story_id}</Text>
        <Text dimColor> — {m.title}</Text>
      </Box>
      <Box><Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text></Box>

      {windowLines.map((line, i) => (
        <Box key={scrollOffset + i}>
          <Text>{line}</Text>
        </Box>
      ))}

      <Box flexGrow={1} />
      <Box justifyContent="space-between" width={width}>
        <Text dimColor>
          {allLines.length > visibleLines
            ? `${scrollOffset + 1}-${Math.min(scrollOffset + visibleLines, allLines.length)}/${allLines.length}`
            : `${allLines.length} lines`}
        </Text>
        <Text dimColor>j/k:scroll  Esc:back</Text>
      </Box>
    </Box>
  );
}

// ─── Helper ──────────────────────────────────────────────

function wrapText(text: string, width: number): string[] {
  if (!text) return ['(none)'];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > width && current.length > 0) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ─── Main Export ─────────────────────────────────────────

interface SwarmExplorerProps {
  swarmDir: string;
  appName?: string;
}

export function SwarmExplorer({ swarmDir, appName = 'swarm-explorer' }: SwarmExplorerProps) {
  const rootPanel: PanelConfig = {
    id: 'dashboard',
    title: 'SWARM',
    component: DashboardPanel as any,
    data: { title: 'SWARM Dashboard', swarmDir },
    state: { view: 'dashboard' },
  };

  return <PanelStack initialPanel={rootPanel} appName={appName} />;
}
