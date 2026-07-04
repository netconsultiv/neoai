// src/client/console/ApprovalsPanel.tsx
// -----------------------------------------------------------------------------
// Stale-approval nudges (item 10): a trimmed RunsPanel view scoped to runs
// waiting on a human_gate, sorted oldest-first with an elapsed-time badge —
// today these are only visible mixed into the main Runs list. No schema
// change, no new action — neoai_runs already carries everything needed.

import React, { useMemo, useState } from 'react';
import { Table, Tag } from 'antd';
import { useAPIClient } from '@nocobase/client';
import { fmtTime, listResource, usePoll } from './shared';
import { RunDetail } from './RunsPanel';
import { NEOHOME_GREEN } from '../theme';

const STALE_WARN_MS = 3_600_000; // 1h
const STALE_CRITICAL_MS = 86_400_000; // 24h

function StalenessTag({ startedAt }: { startedAt?: string }) {
  if (!startedAt) return <Tag>—</Tag>;
  const ms = Date.now() - new Date(startedAt).getTime();
  const hours = ms / 3_600_000;
  const label = hours < 1 ? `${Math.max(0, Math.round(ms / 60_000))}m` : hours < 24 ? `${hours.toFixed(1)}h` : `${(hours / 24).toFixed(1)}d`;
  const color = ms >= STALE_CRITICAL_MS ? 'red' : ms >= STALE_WARN_MS ? 'gold' : 'default';
  return <Tag color={color}>{label} waiting</Tag>;
}

export function ApprovalsPanel() {
  const api = useAPIClient();
  const [rows, setRows] = useState<any[]>([]);
  const [openRun, setOpenRun] = useState<number | null>(null);

  usePoll(
    async () => {
      try {
        const { rows } = await listResource(api, 'neoai_runs', {
          filter: JSON.stringify({ status: 'waiting' }),
          sort: 'started_at',
          pageSize: 100,
          appends: 'workflow',
        });
        setRows(rows);
      } catch {
        /* transient */
      }
    },
    5000,
    openRun == null,
  );

  const sorted = useMemo(() => [...rows].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime()), [rows]);

  const columns = [
    {
      title: 'Run',
      dataIndex: 'id',
      width: 80,
      render: (v: number) => (
        <a style={{ fontWeight: 600, color: NEOHOME_GREEN }} onClick={() => setOpenRun(v)}>
          #{v}
        </a>
      ),
    },
    { title: 'Workflow', key: 'wf', render: (_: any, r: any) => r.workflow?.name ?? r.workflow_id },
    { title: 'Waiting on', dataIndex: 'waiting_message', ellipsis: true },
    { title: 'Started', dataIndex: 'started_at', width: 150, render: (v: string) => fmtTime(v) },
    { title: 'Elapsed', key: 'elapsed', width: 130, render: (_: any, r: any) => <StalenessTag startedAt={r.started_at} /> },
  ];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Approvals</div>
        <span style={{ fontSize: 12, color: '#8a8f8a' }}>runs waiting on a human_gate, oldest first</span>
      </div>
      <Table
        rowKey="id"
        size="middle"
        dataSource={sorted}
        columns={columns as any}
        pagination={false}
        locale={{ emptyText: 'Nothing waiting on approval right now.' }}
      />
      {openRun != null ? <RunDetail runId={openRun} onClose={() => setOpenRun(null)} /> : null}
    </div>
  );
}
