// src/client/console/RunsPanel.tsx
// -----------------------------------------------------------------------------
// Runs monitor: polled list (platform convention: 3s interval) + full-screen
// run detail with the step trace, live while running, approve/reject for
// waiting human gates, cancel for running runs.

import React, { useState } from 'react';
import { Button, Input, Popover, Space, Table, message } from 'antd';
import { useAPIClient } from '@nocobase/client';
import {
  ConsoleDrawer,
  JsonBox,
  StatusTag,
  fmtCost,
  fmtDuration,
  fmtTime,
  fmtTokens,
  listResource,
  neoaiAction,
  runDuration,
  usePoll,
} from './shared';

const TERMINAL = new Set(['succeeded', 'failed', 'cancelled', 'rejected']);

function RunDetail({ runId, onClose }: { runId: number; onClose: () => void }) {
  const api = useAPIClient();
  const [data, setData] = useState<{ run?: any; steps?: any[] }>({});
  const [comment, setComment] = useState('');
  const run = data.run;
  const live = !run || !TERMINAL.has(String(run.status));
  usePoll(
    async () => {
      try {
        setData(await neoaiAction(api, 'runStatus', { runId }));
      } catch (err: any) {
        message.error(`Run load failed: ${err?.message ?? err}`);
      }
    },
    2500,
    live,
  );
  // one final refresh when leaving live mode is covered by the last poll tick.

  const decide = async (approved: boolean) => {
    try {
      const res = await neoaiAction(api, 'resumeRun', { runId, approved, comment });
      if (res.error) message.error(res.error);
      else message.success(approved ? 'Approved — run continues' : 'Rejected');
    } catch (err: any) {
      message.error(String(err?.message ?? err));
    }
  };
  const cancel = async () => {
    try {
      await neoaiAction(api, 'cancelRun', { runId });
      message.success('Cancel requested');
    } catch (err: any) {
      message.error(String(err?.message ?? err));
    }
  };

  const stepColumns = [
    { title: '#', dataIndex: 'seq', width: 50 },
    { title: 'Node', dataIndex: 'title', render: (v: string, s: any) => v || s.node_id },
    { title: 'Type', dataIndex: 'node_type', width: 110 },
    { title: 'Status', dataIndex: 'status', width: 110, render: (v: string) => <StatusTag status={v} /> },
    { title: 'Duration', dataIndex: 'duration_ms', width: 100, render: (v: number) => fmtDuration(v) },
    { title: 'Tokens', key: 'tok', width: 130, render: (_: any, s: any) => fmtTokens(s.input_tokens, s.output_tokens) },
    { title: 'Cost', dataIndex: 'cost_usd', width: 90, render: (v: number) => fmtCost(v) },
    {
      title: 'Error',
      dataIndex: 'error',
      render: (v: string) => (v ? <span style={{ color: '#b02a2a', fontSize: 12 }}>{v}</span> : null),
    },
  ];

  return (
    <ConsoleDrawer
      open
      title={
        <span>
          Run #{runId} {run ? <StatusTag status={run.status} /> : null}
          {run?.function_key ? <span style={{ fontWeight: 400, fontSize: 13, color: '#8a8f8a' }}> · function {run.function_key}</span> : null}
        </span>
      }
      extra={
        <Space>
          {run?.status === 'waiting' ? (
            <>
              <Input placeholder="Comment (optional)" value={comment} onChange={(e) => setComment(e.target.value)} style={{ width: 220 }} />
              <Button type="primary" onClick={() => decide(true)}>
                Approve
              </Button>
              <Button danger onClick={() => decide(false)}>
                Reject
              </Button>
            </>
          ) : null}
          {run && !TERMINAL.has(String(run.status)) ? <Button onClick={cancel}>Cancel run</Button> : null}
        </Space>
      }
      onClose={onClose}
    >
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1200 }}>
        {run?.status === 'waiting' ? (
          <div style={{ border: '1px solid #e7d9a8', background: '#fdf7e3', borderRadius: 10, padding: '10px 14px' }}>
            <b>Waiting for approval:</b> {run.waiting_message || '—'}
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13 }}>
          <span>
            <b>Started:</b> {fmtTime(run?.started_at)}
          </span>
          <span>
            <b>Duration:</b> {runDuration(run)}
          </span>
          <span>
            <b>Tokens:</b> {fmtTokens(run?.input_tokens, run?.output_tokens)}
          </span>
          <span>
            <b>Cost:</b> {fmtCost(run?.cost_usd)}
          </span>
          <span>
            <b>Trigger:</b> {run?.trigger ?? '—'} ({run?.triggered_by ?? '—'})
          </span>
          <span>
            <b>Version:</b> {run?.version ? `v${run.version}` : 'draft'}
          </span>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#8a8f8a', margin: '0 0 6px' }}>STEPS</div>
          <Table
            rowKey="id"
            size="small"
            dataSource={data.steps ?? []}
            columns={stepColumns as any}
            pagination={false}
            expandable={{
              expandedRowRender: (s: any) => <JsonBox value={s.output} maxHeight={300} />,
              rowExpandable: (s: any) => s.output != null,
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', minWidth: 280 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#8a8f8a', margin: '0 0 6px' }}>INPUT</div>
            <JsonBox value={run?.input} maxHeight={260} />
          </div>
          <div style={{ flex: '1 1 320px', minWidth: 280 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#8a8f8a', margin: '0 0 6px' }}>
              {run?.status === 'failed' ? 'ERROR' : 'OUTPUT'}
            </div>
            {run?.status === 'failed' ? (
              <div style={{ color: '#b02a2a', fontSize: 13 }}>{run?.error}</div>
            ) : (
              <JsonBox value={run?.output} maxHeight={260} />
            )}
          </div>
        </div>
      </div>
    </ConsoleDrawer>
  );
}

export function RunsPanel() {
  const api = useAPIClient();
  const [rows, setRows] = useState<any[]>([]);
  const [openRun, setOpenRun] = useState<number | null>(null);

  usePoll(
    async () => {
      try {
        const { rows } = await listResource(api, 'neoai_runs', { sort: '-id', pageSize: 50, appends: 'workflow' });
        setRows(rows);
      } catch {
        /* transient */
      }
    },
    3000,
    openRun == null,
  );

  const columns = [
    {
      title: 'Run',
      dataIndex: 'id',
      width: 80,
      render: (v: number) => (
        <a style={{ fontWeight: 600 }} onClick={() => setOpenRun(v)}>
          #{v}
        </a>
      ),
    },
    { title: 'Workflow', key: 'wf', render: (_: any, r: any) => r.workflow?.name ?? r.workflow_id },
    { title: 'Status', dataIndex: 'status', width: 110, render: (v: string) => <StatusTag status={v} /> },
    {
      title: 'Waiting on',
      dataIndex: 'waiting_message',
      render: (v: string, r: any) =>
        r.status === 'waiting' && v ? (
          <Popover content={v}>
            <span style={{ color: '#9a7b00' }}>{v.slice(0, 40)}…</span>
          </Popover>
        ) : null,
    },
    { title: 'Trigger', dataIndex: 'trigger', width: 90 },
    { title: 'Started', dataIndex: 'started_at', width: 150, render: (v: string) => fmtTime(v) },
    { title: 'Duration', key: 'dur', width: 100, render: (_: any, r: any) => runDuration(r) },
    { title: 'Tokens', key: 'tok', width: 130, render: (_: any, r: any) => fmtTokens(r.input_tokens, r.output_tokens) },
    { title: 'Cost', dataIndex: 'cost_usd', width: 90, render: (v: number) => fmtCost(v) },
  ];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>Runs</div>
        <span style={{ fontSize: 12, color: '#8a8f8a' }}>auto-refreshing every 3 s</span>
      </div>
      <Table rowKey="id" size="middle" dataSource={rows} columns={columns as any} pagination={{ pageSize: 25 }} />
      {openRun != null ? <RunDetail runId={openRun} onClose={() => setOpenRun(null)} /> : null}
    </div>
  );
}
