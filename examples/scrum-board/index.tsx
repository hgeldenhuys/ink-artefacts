import React from 'react';
import { render } from 'ink';
import { PanelStack, ListPanel, DetailPanel, TablePanel } from '../../src/index.js';
import type { PanelConfig, PanelProps } from '../../src/index.js';

// ─── Mock Data (a realistic scrum board) ─────────────────

interface Task {
  id: number;
  title: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  assignee: string;
  points: number;
  description: string;
}

interface Story {
  id: number;
  title: string;
  status: 'open' | 'in-progress' | 'done';
  points: number;
  tasks: Task[];
}

interface Feature {
  id: number;
  title: string;
  stories: Story[];
}

interface Epic {
  id: number;
  title: string;
  description: string;
  features: Feature[];
}

const EPICS: Epic[] = [
  {
    id: 1,
    title: 'User Authentication',
    description: 'Complete authentication system with OAuth, MFA, and session management',
    features: [
      {
        id: 101,
        title: 'OAuth2 Integration',
        stories: [
          {
            id: 1001,
            title: 'Google OAuth login flow',
            status: 'done',
            points: 5,
            tasks: [
              { id: 10001, title: 'Setup Google Cloud credentials', status: 'done', assignee: 'Alice', points: 1, description: 'Configure OAuth2 client in Google Cloud Console, set redirect URIs' },
              { id: 10002, title: 'Implement callback handler', status: 'done', assignee: 'Alice', points: 2, description: 'Handle OAuth2 callback, exchange code for tokens, create session' },
              { id: 10003, title: 'Add login button to UI', status: 'done', assignee: 'Bob', points: 1, description: 'Add "Sign in with Google" button to login page with proper branding' },
              { id: 10004, title: 'Write integration tests', status: 'done', assignee: 'Charlie', points: 1, description: 'Test the full OAuth flow with mocked Google endpoints' },
            ],
          },
          {
            id: 1002,
            title: 'GitHub OAuth login flow',
            status: 'in-progress',
            points: 5,
            tasks: [
              { id: 10005, title: 'Setup GitHub OAuth App', status: 'done', assignee: 'Alice', points: 1, description: 'Register OAuth app in GitHub settings' },
              { id: 10006, title: 'Implement auth flow', status: 'in-progress', assignee: 'Alice', points: 2, description: 'Handle GitHub OAuth redirect and token exchange' },
              { id: 10007, title: 'Map GitHub user to local user', status: 'todo', assignee: 'Bob', points: 1, description: 'Create or link local account from GitHub profile data' },
              { id: 10008, title: 'E2E tests for GitHub login', status: 'todo', assignee: 'Charlie', points: 1, description: 'Playwright tests for the GitHub login flow' },
            ],
          },
        ],
      },
      {
        id: 102,
        title: 'Multi-Factor Authentication',
        stories: [
          {
            id: 1003,
            title: 'TOTP-based MFA',
            status: 'open',
            points: 8,
            tasks: [
              { id: 10009, title: 'TOTP library integration', status: 'todo', assignee: '', points: 2, description: 'Integrate otplib for TOTP generation and verification' },
              { id: 10010, title: 'QR code enrollment UI', status: 'todo', assignee: '', points: 3, description: 'Show QR code during setup, verify with a test code' },
              { id: 10011, title: 'MFA challenge on login', status: 'todo', assignee: '', points: 2, description: 'Prompt for TOTP code after password verification' },
              { id: 10012, title: 'Recovery codes', status: 'todo', assignee: '', points: 1, description: 'Generate and store one-time recovery codes' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 2,
    title: 'Dashboard Redesign',
    description: 'Modern dashboard with real-time widgets, dark mode, and responsive layout',
    features: [
      {
        id: 201,
        title: 'Widget System',
        stories: [
          {
            id: 2001,
            title: 'Draggable widget grid',
            status: 'in-progress',
            points: 13,
            tasks: [
              { id: 20001, title: 'Grid layout engine', status: 'done', assignee: 'Dave', points: 5, description: 'CSS Grid based layout with configurable columns and breakpoints' },
              { id: 20002, title: 'Drag-and-drop support', status: 'in-progress', assignee: 'Dave', points: 5, description: 'HTML5 DnD API with smooth animations and snap-to-grid' },
              { id: 20003, title: 'Widget persistence', status: 'todo', assignee: 'Eve', points: 3, description: 'Save widget positions and sizes to user preferences' },
            ],
          },
          {
            id: 2002,
            title: 'Chart widgets',
            status: 'open',
            points: 8,
            tasks: [
              { id: 20004, title: 'Line chart widget', status: 'todo', assignee: '', points: 3, description: 'Time-series line chart with zoom and pan' },
              { id: 20005, title: 'Bar chart widget', status: 'todo', assignee: '', points: 2, description: 'Categorical bar chart with stacking support' },
              { id: 20006, title: 'Pie chart widget', status: 'todo', assignee: '', points: 3, description: 'Interactive pie/donut chart with drill-down' },
            ],
          },
        ],
      },
      {
        id: 202,
        title: 'Dark Mode',
        stories: [
          {
            id: 2003,
            title: 'Theme system',
            status: 'open',
            points: 5,
            tasks: [
              { id: 20007, title: 'CSS variables for theming', status: 'todo', assignee: '', points: 2, description: 'Define color tokens as CSS custom properties' },
              { id: 20008, title: 'Theme toggle component', status: 'todo', assignee: '', points: 1, description: 'Toggle between light/dark with system preference detection' },
              { id: 20009, title: 'Persist theme choice', status: 'todo', assignee: '', points: 2, description: 'Save preference to localStorage and cookie for SSR' },
            ],
          },
        ],
      },
    ],
  },
];

// ─── Panels ──────────────────────────────────────────────

const statusColors: Record<string, string> = {
  'todo': 'gray',
  'open': 'gray',
  'in-progress': 'yellow',
  'review': 'magenta',
  'done': 'green',
};

function makeTaskDetailPanel(task: Task, story: Story, feature: Feature, epic: Epic): PanelConfig {
  return {
    id: `task-${task.id}`,
    title: `Task #${task.id}`,
    component: DetailPanel as any,
    data: {
      title: `Task #${task.id}: ${task.title}`,
      fields: [
        { label: 'Status', value: task.status, color: statusColors[task.status] },
        { label: 'Assignee', value: task.assignee || 'Unassigned', color: task.assignee ? 'white' : 'gray' },
        { label: 'Points', value: task.points },
        { label: 'Description', value: task.description },
        { label: '', value: '' },
        { label: 'Story', value: `#${story.id}: ${story.title}` },
        { label: 'Feature', value: feature.title },
        { label: 'Epic', value: epic.title },
      ],
      actions: [],
    },
    state: {
      type: 'task',
      taskId: task.id,
      taskTitle: task.title,
      status: task.status,
      assignee: task.assignee,
      storyId: story.id,
      storyTitle: story.title,
      featureId: feature.id,
      featureTitle: feature.title,
      epicId: epic.id,
      epicTitle: epic.title,
    },
  };
}

function makeTaskTablePanel(story: Story, feature: Feature, epic: Epic): PanelConfig {
  return {
    id: `tasks-${story.id}`,
    title: `Tasks`,
    component: TablePanel as any,
    data: {
      title: `Tasks for: ${story.title}`,
      columns: [
        { header: 'ID', accessor: 'id' as any, width: 6, align: 'right' as const },
        { header: 'Status', accessor: 'status' as any, width: 12 },
        { header: 'Assignee', accessor: 'assignee' as any, width: 10 },
        { header: 'Pts', accessor: 'points' as any, width: 4, align: 'right' as const },
        { header: 'Title', accessor: 'title' as any },
      ],
      rows: story.tasks,
      searchable: true,
      onSelect: (row: Task, _idx: number, panelProps: any) => {
        panelProps.push(makeTaskDetailPanel(row, story, feature, epic));
      },
    },
    state: {
      type: 'task-list',
      storyId: story.id,
      storyTitle: story.title,
    },
  };
}

function makeStoryListPanel(feature: Feature, epic: Epic): PanelConfig {
  return {
    id: `stories-${feature.id}`,
    title: feature.title,
    component: ListPanel as any,
    data: {
      title: `Stories in: ${feature.title}`,
      items: feature.stories.map(s => ({
        id: String(s.id),
        label: s.title,
        description: `${s.points} pts`,
        badge: s.status,
        badgeColor: statusColors[s.status],
      })),
      onSelect: (item: any, _idx: number, panelProps: any) => {
        const story = feature.stories.find(s => String(s.id) === item.id);
        if (story) {
          panelProps.push(makeTaskTablePanel(story, feature, epic));
        }
      },
    },
    state: {
      type: 'story-list',
      featureId: feature.id,
      featureTitle: feature.title,
    },
  };
}

function makeFeatureListPanel(epic: Epic): PanelConfig {
  return {
    id: `features-${epic.id}`,
    title: epic.title,
    component: ListPanel as any,
    data: {
      title: `Features in: ${epic.title}`,
      items: epic.features.map(f => {
        const totalStories = f.stories.length;
        const doneStories = f.stories.filter(s => s.status === 'done').length;
        return {
          id: String(f.id),
          label: f.title,
          description: `${doneStories}/${totalStories} stories done`,
          badge: `${f.stories.reduce((a, s) => a + s.points, 0)} pts`,
          badgeColor: 'cyan',
        };
      }),
      onSelect: (item: any, _idx: number, panelProps: any) => {
        const feature = epic.features.find(f => String(f.id) === item.id);
        if (feature) {
          panelProps.push(makeStoryListPanel(feature, epic));
        }
      },
    },
    state: {
      type: 'feature-list',
      epicId: epic.id,
      epicTitle: epic.title,
    },
  };
}

const epicListPanel: PanelConfig = {
  id: 'epics',
  title: 'Epics',
  component: ListPanel as any,
  data: {
    title: 'Project Epics',
    items: EPICS.map(e => {
      const totalFeatures = e.features.length;
      const totalStories = e.features.reduce((a, f) => a + f.stories.length, 0);
      return {
        id: String(e.id),
        label: e.title,
        description: `${totalFeatures} features, ${totalStories} stories`,
      };
    }),
    onSelect: (item: any, _idx: number, panelProps: any) => {
      const epic = EPICS.find(e => String(e.id) === item.id);
      if (epic) {
        panelProps.push(makeFeatureListPanel(epic));
      }
    },
  },
  state: { type: 'epic-list' },
};

// ─── Launch ──────────────────────────────────────────────
const { unmount } = render(
  <PanelStack
    appName="scrum-board"
    initialPanel={epicListPanel}
    onExit={() => {
      unmount();
      process.exit(0);
    }}
  />,
);
