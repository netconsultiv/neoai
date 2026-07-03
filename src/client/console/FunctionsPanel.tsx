// src/client/console/FunctionsPanel.tsx
// -----------------------------------------------------------------------------
// The NeoAI half of the per-function "workflow selector": host plugins register
// their AI functions here (pm.get('neoai').registerFunction — or rows created
// manually), and an admin binds each function to a published workflow. Empty
// binding = the host plugin keeps its LEGACY code path (scoping Q4). The test
// dispatch exercises exactly the same service the host plugins will call.

import React, { useState } from 'react';
import { Button, Input, Select, Switch, Table, Tag, message, Space } from 'antd';
import { useAPIClient } from '@nocobase/client';
import { ConsoleDrawer, JsonBox, createResource, listResource, neoaiAction, updateResource, usePoll } from './shared';
import { NEOHOME_GREEN } from '../theme';

function TestDispatchDrawer({ fn, onClose }: { fn: any; onClose: () => void }) {
  const api = useAPIClient();
  const [inputText, setInputText] = useState(() => JSON.stringify(fn.input_example ?? {}, null, 2));
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const dispatch = async () => {
    let input: any = {};
    try {
      input = inputText.trim() ? JSON.parse(inputText) : {};
    } catch {
      message.error('Input is not valid JSON');
      return;
    }
    setBusy(true);
    try {
      setResult(await neoaiAction(api, 'runFunction', { functionKey: fn.key, input, wait: true }));
    } catch (err: any) {
      message.error(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ConsoleDrawer open title={<span>Test dispatch — <code>{fn.key}</code></span>} onClose={onClose}>
      <div style={{ padding: 18, maxWidth: 760 }}>
        <p style={{ fontSize: 13, color: '#5c605c' }}>
          Simulates a host-plugin call: <code>pm.get('neoai').runFunction('{fn.key}', input)</code>. Bound workflow runs and
          the dispatch waits for the result; no binding → the "legacy" answer the host plugin would act on.
        </p>
        <Input.TextArea
          rows={6}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12, marginBottom: 10 }}
        />
        <Button type="primary" loading={busy} onClick={dispatch}>
          Dispatch
        </Button>
        {result ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#8a8f8a', marginBottom: 6 }}>RESULT</div>
            <JsonBox value={result} maxHeight={320} />
          </div>
        ) : null}
      </div>
    </ConsoleDrawer>
  );
}

export function FunctionsPanel() {
  const api = useAPIClient();
  const [rows, setRows] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [testing, setTesting] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<{ key: string; title: string; plugin: string }>({ key: '', title: '', plugin: '' });

  const load = async () => {
    try {
      const [f, w] = await Promise.all([
        listResource(api, 'neoai_functions', { sort: 'key', pageSize: 100, appends: 'workflow' }),
        listResource(api, 'neoai_workflows', { sort: 'name', pageSize: 100 }),
      ]);
      setRows(f.rows);
      setWorkflows(w.rows);
    } catch (err: any) {
      message.error(`Load failed: ${err?.message ?? err}`);
    }
  };
  usePoll(load, 30_000, !testing);

  const bind = async (fnRow: any, workflowId: number | null) => {
    await updateResource(api, 'neoai_functions', fnRow.id, { workflow_id: workflowId });
    await load();
    message.success(workflowId ? 'Workflow bound' : 'Binding cleared — legacy code path active');
  };

  const create = async () => {
    if (!draft.key.trim() || !draft.title.trim()) {
      message.error('Key and title are required');
      return;
    }
    await createResource(api, 'neoai_functions', { ...draft, enabled: true });
    setCreating(false);
    setDraft({ key: '', title: '', plugin: '' });
    await load();
  };

  const workflowOptions = workflows
    .filter((w) => Number(w.current_version) > 0)
    .map((w) => ({ value: w.id, label: `${w.name} (v${w.current_version}${w.enabled ? '' : ' · disabled'})` }));

  const columns = [
    { title: 'Function key', dataIndex: 'key', render: (v: string) => <code style={{ fontSize: 12 }}>{v}</code> },
    { title: 'Title', dataIndex: 'title' },
    { title: 'Plugin', dataIndex: 'plugin', width: 130, render: (v: string) => (v ? <Tag>{v}</Tag> : '—') },
    {
      title: 'Bound workflow (empty = legacy path)',
      key: 'wf',
      width: 320,
      render: (_: any, r: any) => (
        <Select
          allowClear
          placeholder="legacy code path"
          style={{ width: '100%' }}
          value={r.workflow_id ?? undefined}
          options={workflowOptions}
          onChange={(v) => bind(r, v ?? null)}
        />
      ),
    },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      width: 90,
      render: (v: boolean, r: any) => (
        <Switch
          size="small"
          checked={v !== false}
          onChange={async (val) => {
            await updateResource(api, 'neoai_functions', r.id, { enabled: val });
            load();
          }}
        />
      ),
    },
    {
      title: '',
      key: 'act',
      width: 130,
      render: (_: any, r: any) => (
        <Button size="small" onClick={() => setTesting(r)}>
          Test dispatch
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>Functions</div>
        {creating ? (
          <Space.Compact>
            <Input placeholder="key (e.g. crm.draftReply)" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} style={{ width: 220 }} />
            <Input placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={{ width: 180 }} />
            <Input placeholder="Plugin" value={draft.plugin} onChange={(e) => setDraft({ ...draft, plugin: e.target.value })} style={{ width: 140 }} />
            <Button type="primary" onClick={create}>
              Create
            </Button>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
          </Space.Compact>
        ) : (
          <>
            <Button onClick={load}>Refresh</Button>
            <Button type="primary" onClick={() => setCreating(true)}>
              Register function
            </Button>
          </>
        )}
      </div>
      <p style={{ fontSize: 12.5, color: '#8a8f8a', margin: '0 0 12px', maxWidth: 760 }}>
        Host plugins (Konfigurator, CRM) register their AI functions here and gain a workflow selector; an empty binding keeps
        their built-in legacy behaviour. Bindings take effect immediately — dispatches use the bound workflow's published version.
      </p>
      <Table rowKey="id" size="middle" dataSource={rows} columns={columns as any} pagination={false} />
      {testing ? <TestDispatchDrawer fn={testing} onClose={() => setTesting(null)} /> : null}
    </div>
  );
}
