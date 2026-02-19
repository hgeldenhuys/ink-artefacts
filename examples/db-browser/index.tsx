import React from 'react';
import { render, Box, Text, useInput } from 'ink';
import { PanelStack, ListPanel, DetailPanel, TablePanel } from '../../src/index.js';
import type { PanelConfig, PanelProps } from '../../src/index.js';

// ─── Simulated Database ──────────────────────────────────

interface DBTable {
  name: string;
  columns: Array<{ name: string; type: string; nullable: boolean; pk: boolean }>;
  rows: Record<string, unknown>[];
}

const TABLES: DBTable[] = [
  {
    name: 'users',
    columns: [
      { name: 'id', type: 'integer', nullable: false, pk: true },
      { name: 'email', type: 'varchar(255)', nullable: false, pk: false },
      { name: 'name', type: 'varchar(100)', nullable: false, pk: false },
      { name: 'role', type: 'varchar(20)', nullable: false, pk: false },
      { name: 'created_at', type: 'timestamp', nullable: false, pk: false },
      { name: 'active', type: 'boolean', nullable: false, pk: false },
    ],
    rows: [
      { id: 1, email: 'alice@example.com', name: 'Alice Johnson', role: 'admin', created_at: '2024-01-15 08:30:00', active: true },
      { id: 2, email: 'bob@example.com', name: 'Bob Smith', role: 'developer', created_at: '2024-02-20 14:15:00', active: true },
      { id: 3, email: 'charlie@example.com', name: 'Charlie Brown', role: 'developer', created_at: '2024-03-10 09:45:00', active: true },
      { id: 4, email: 'diana@example.com', name: 'Diana Prince', role: 'qa', created_at: '2024-04-05 11:00:00', active: false },
      { id: 5, email: 'eve@example.com', name: 'Eve Davis', role: 'designer', created_at: '2024-05-18 16:30:00', active: true },
      { id: 6, email: 'frank@example.com', name: 'Frank Miller', role: 'developer', created_at: '2024-06-22 10:00:00', active: true },
      { id: 7, email: 'grace@example.com', name: 'Grace Lee', role: 'pm', created_at: '2024-07-01 13:20:00', active: true },
      { id: 8, email: 'henry@example.com', name: 'Henry Wilson', role: 'developer', created_at: '2024-08-14 08:00:00', active: false },
      { id: 9, email: 'iris@example.com', name: 'Iris Chen', role: 'qa', created_at: '2024-09-03 15:45:00', active: true },
      { id: 10, email: 'jack@example.com', name: 'Jack Taylor', role: 'developer', created_at: '2024-10-11 12:30:00', active: true },
    ],
  },
  {
    name: 'projects',
    columns: [
      { name: 'id', type: 'integer', nullable: false, pk: true },
      { name: 'name', type: 'varchar(200)', nullable: false, pk: false },
      { name: 'owner_id', type: 'integer', nullable: false, pk: false },
      { name: 'status', type: 'varchar(20)', nullable: false, pk: false },
      { name: 'budget', type: 'decimal(10,2)', nullable: true, pk: false },
      { name: 'deadline', type: 'date', nullable: true, pk: false },
    ],
    rows: [
      { id: 1, name: 'Auth Service Rewrite', owner_id: 1, status: 'active', budget: 50000.00, deadline: '2025-06-30' },
      { id: 2, name: 'Dashboard V2', owner_id: 7, status: 'active', budget: 120000.00, deadline: '2025-09-15' },
      { id: 3, name: 'Mobile App MVP', owner_id: 2, status: 'planning', budget: 80000.00, deadline: '2025-12-01' },
      { id: 4, name: 'API Gateway Migration', owner_id: 1, status: 'completed', budget: 35000.00, deadline: '2025-03-01' },
      { id: 5, name: 'CI/CD Pipeline', owner_id: 6, status: 'active', budget: 15000.00, deadline: '2025-04-30' },
    ],
  },
  {
    name: 'tasks',
    columns: [
      { name: 'id', type: 'integer', nullable: false, pk: true },
      { name: 'project_id', type: 'integer', nullable: false, pk: false },
      { name: 'assigned_to', type: 'integer', nullable: true, pk: false },
      { name: 'title', type: 'varchar(300)', nullable: false, pk: false },
      { name: 'priority', type: 'varchar(10)', nullable: false, pk: false },
      { name: 'status', type: 'varchar(20)', nullable: false, pk: false },
      { name: 'estimated_hours', type: 'decimal(5,1)', nullable: true, pk: false },
    ],
    rows: [
      { id: 1, project_id: 1, assigned_to: 2, title: 'Design JWT token structure', priority: 'high', status: 'done', estimated_hours: 4.0 },
      { id: 2, project_id: 1, assigned_to: 3, title: 'Implement token refresh flow', priority: 'high', status: 'in-progress', estimated_hours: 8.0 },
      { id: 3, project_id: 1, assigned_to: 2, title: 'Add rate limiting to auth endpoints', priority: 'medium', status: 'todo', estimated_hours: 6.0 },
      { id: 4, project_id: 2, assigned_to: 5, title: 'Design new dashboard wireframes', priority: 'high', status: 'done', estimated_hours: 16.0 },
      { id: 5, project_id: 2, assigned_to: 6, title: 'Build widget grid component', priority: 'high', status: 'in-progress', estimated_hours: 20.0 },
      { id: 6, project_id: 2, assigned_to: 10, title: 'Implement chart rendering', priority: 'medium', status: 'todo', estimated_hours: 12.0 },
      { id: 7, project_id: 3, assigned_to: 7, title: 'Create product requirements doc', priority: 'high', status: 'in-progress', estimated_hours: 8.0 },
      { id: 8, project_id: 3, assigned_to: null, title: 'Research React Native vs Flutter', priority: 'medium', status: 'todo', estimated_hours: 10.0 },
      { id: 9, project_id: 5, assigned_to: 6, title: 'Setup GitHub Actions workflows', priority: 'high', status: 'done', estimated_hours: 6.0 },
      { id: 10, project_id: 5, assigned_to: 6, title: 'Add automated deployment to staging', priority: 'medium', status: 'in-progress', estimated_hours: 8.0 },
      { id: 11, project_id: 1, assigned_to: 9, title: 'Write auth E2E tests', priority: 'medium', status: 'todo', estimated_hours: 12.0 },
      { id: 12, project_id: 2, assigned_to: 4, title: 'Performance testing for widget grid', priority: 'low', status: 'todo', estimated_hours: 8.0 },
    ],
  },
];

// ─── Panels ──────────────────────────────────────────────

function makeRowDetailPanel(table: DBTable, row: Record<string, unknown>): PanelConfig {
  const pkCol = table.columns.find(c => c.pk);
  const pkVal = pkCol ? row[pkCol.name] : '?';

  // Find related data from other tables (simulate FK resolution)
  const relatedFields: Array<{ label: string; value: string }> = [];

  if (table.name === 'tasks') {
    const project = TABLES.find(t => t.name === 'projects')?.rows.find(r => r.id === row.project_id);
    if (project) relatedFields.push({ label: 'Project (FK)', value: `#${project.id}: ${project.name}` });
    const assignee = TABLES.find(t => t.name === 'users')?.rows.find(r => r.id === row.assigned_to);
    if (assignee) relatedFields.push({ label: 'Assigned To (FK)', value: `#${assignee.id}: ${assignee.name}` });
  }

  if (table.name === 'projects') {
    const owner = TABLES.find(t => t.name === 'users')?.rows.find(r => r.id === row.owner_id);
    if (owner) relatedFields.push({ label: 'Owner (FK)', value: `#${owner.id}: ${owner.name}` });
    const taskCount = TABLES.find(t => t.name === 'tasks')?.rows.filter(r => r.project_id === row.id).length ?? 0;
    relatedFields.push({ label: 'Tasks Count', value: String(taskCount) });
  }

  const fields = table.columns.map(col => ({
    label: `${col.name} (${col.type})`,
    value: row[col.name] == null ? 'NULL' : String(row[col.name]),
    color: row[col.name] == null ? 'gray' : col.pk ? 'yellow' : undefined,
  }));

  if (relatedFields.length > 0) {
    fields.push({ label: '', value: '', color: undefined });
    fields.push({ label: '── Relations ──', value: '', color: 'cyan' });
    for (const rf of relatedFields) {
      fields.push({ label: rf.label, value: rf.value, color: 'green' });
    }
  }

  const actions: any[] = [];

  // If this is a user, offer to see their tasks
  if (table.name === 'users') {
    const userTasks = TABLES.find(t => t.name === 'tasks')?.rows.filter(r => r.assigned_to === row.id) ?? [];
    if (userTasks.length > 0) {
      actions.push({
        key: 't',
        label: `View tasks (${userTasks.length})`,
        handler: (panelProps: any) => {
          const tasksTable = TABLES.find(t => t.name === 'tasks')!;
          panelProps.push(makeFilteredTablePanel(tasksTable, userTasks, `Tasks assigned to ${row.name}`));
        },
      });
    }
  }

  // If this is a project, offer to see its tasks
  if (table.name === 'projects') {
    const projectTasks = TABLES.find(t => t.name === 'tasks')?.rows.filter(r => r.project_id === row.id) ?? [];
    if (projectTasks.length > 0) {
      actions.push({
        key: 't',
        label: `View tasks (${projectTasks.length})`,
        handler: (panelProps: any) => {
          const tasksTable = TABLES.find(t => t.name === 'tasks')!;
          panelProps.push(makeFilteredTablePanel(tasksTable, projectTasks, `Tasks in ${row.name}`));
        },
      });
    }
  }

  return {
    id: `row-${table.name}-${pkVal}`,
    title: `${table.name} #${pkVal}`,
    component: DetailPanel as any,
    data: { title: `${table.name} — Row #${pkVal}`, fields, actions },
    state: {
      type: 'row-detail',
      table: table.name,
      primaryKey: pkVal,
      row,
    },
  };
}

function makeFilteredTablePanel(table: DBTable, rows: Record<string, unknown>[], title: string): PanelConfig {
  return {
    id: `filtered-${table.name}-${Date.now()}`,
    title,
    component: TablePanel as any,
    data: {
      title,
      columns: table.columns.map(col => ({
        header: col.name,
        accessor: col.name as any,
        align: (col.type.startsWith('integer') || col.type.startsWith('decimal') ? 'right' : 'left') as any,
      })),
      rows,
      searchable: true,
      onSelect: (row: Record<string, unknown>, _idx: number, panelProps: any) => {
        panelProps.push(makeRowDetailPanel(table, row));
      },
    },
    state: { type: 'table-data', table: table.name, filter: title },
  };
}

function makeTableDataPanel(table: DBTable): PanelConfig {
  return {
    id: `table-${table.name}`,
    title: table.name,
    component: TablePanel as any,
    data: {
      title: `${table.name} (${table.rows.length} rows)`,
      columns: table.columns.map(col => ({
        header: col.name,
        accessor: col.name as any,
        align: (col.type.startsWith('integer') || col.type.startsWith('decimal') ? 'right' : 'left') as any,
      })),
      rows: table.rows,
      searchable: true,
      onSelect: (row: Record<string, unknown>, _idx: number, panelProps: any) => {
        panelProps.push(makeRowDetailPanel(table, row));
      },
    },
    state: { type: 'table-data', table: table.name },
  };
}

function makeSchemaPanel(table: DBTable): PanelConfig {
  return {
    id: `schema-${table.name}`,
    title: `${table.name} schema`,
    component: DetailPanel as any,
    data: {
      title: `Schema: ${table.name}`,
      fields: table.columns.map(col => ({
        label: col.name,
        value: `${col.type}${col.pk ? ' PRIMARY KEY' : ''}${col.nullable ? ' NULL' : ' NOT NULL'}`,
        color: col.pk ? 'yellow' : undefined,
      })),
      actions: [
        {
          key: 'd',
          label: 'Browse data',
          handler: (panelProps: any) => {
            panelProps.push(makeTableDataPanel(table));
          },
        },
      ],
    },
    state: { type: 'schema', table: table.name },
  };
}

const tableListPanel: PanelConfig = {
  id: 'tables',
  title: 'Database',
  component: ListPanel as any,
  data: {
    title: 'Database Tables',
    items: TABLES.map(t => ({
      id: t.name,
      label: t.name,
      description: `${t.rows.length} rows, ${t.columns.length} columns`,
      badge: t.columns.find(c => c.pk)?.type ?? '',
      badgeColor: 'yellow',
    })),
    onSelect: (item: any, _idx: number, panelProps: any) => {
      const table = TABLES.find(t => t.name === item.id);
      if (table) {
        panelProps.push(makeSchemaPanel(table));
      }
    },
  },
  state: { type: 'table-list' },
};

// ─── Launch ──────────────────────────────────────────────
const { unmount } = render(
  <PanelStack
    appName="db-browser"
    initialPanel={tableListPanel}
    onExit={() => {
      unmount();
      process.exit(0);
    }}
  />,
);
