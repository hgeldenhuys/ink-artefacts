import React from 'react';
import { TablePanel } from '../../../src/index.js';
import { DetailPanel } from '../../../src/components/DetailPanel.js';
import type { PanelProps } from '../../../src/index.js';

interface TableViewData {
  title?: string;
  columns: Array<{ header: string; accessor: string; width?: number; align?: 'left' | 'right' | 'center' }>;
  rows: Record<string, unknown>[];
}

export function TableViewPanel(props: PanelProps<TableViewData>) {
  const { data } = props;

  const tableData = {
    title: data.title ?? 'Table',
    columns: data.columns,
    rows: data.rows,
    searchable: true,
    onSelect: (row: Record<string, unknown>, _idx: number, panelProps: any) => {
      const fields = Object.entries(row).map(([key, val]) => ({
        label: key,
        value: val == null ? 'null' : String(val),
      }));
      panelProps.push({
        id: `row-detail-${Date.now()}`,
        title: 'Row Detail',
        component: DetailPanel,
        data: { title: 'Row Detail', fields, actions: [] },
      });
    },
  };

  return <TablePanel {...props} data={tableData as any} />;
}
