// src/client/console/WorkflowsPanel.tsx
// -----------------------------------------------------------------------------
// AI Workflows: list + the visual TREE editor (owner decision: tree structure
// is enough). The editor renders the definition as nested node cards with
// branch columns (condition/parallel/loop), a config side panel per node, a
// draft/publish lifecycle and an inline draft test-run with live step trace.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dropdown, Input, InputNumber, Select, Switch, Table, Checkbox, message, Modal, Space, Tag } from 'antd';
import { useAPIClient } from '@nocobase/client';
import {
  ConsoleDrawer,
  JsonBox,
  StatusTag,
  createResource,
  fmtCost,
  fmtDuration,
  fmtTime,
  listResource,
  neoaiAction,
  updateResource,
  usePoll,
} from './shared';
import { NEOHOME_GREEN } from '../theme';
import { VersionDiffDrawer } from './VersionDiffDrawer';

type NodeDef = { id: string; type: string; title?: string; config?: any; branches?: NodeDef[][] };
type WorkflowDef = { nodes: NodeDef[] };

const NODE_TYPES: Array<{ type: string; label: string; hint: string }> = [
  { type: 'llm', label: 'LLM', hint: 'Gemini text call (prompt + optional JSON schema)' },
  { type: 'image', label: 'Image', hint: 'Gemini image generation (raw REST path)' },
  { type: 'http', label: 'HTTP', hint: 'Call an external API' },
  { type: 'data', label: 'Data', hint: 'Read/write a NocoBase collection' },
  { type: 'transform', label: 'Transform', hint: 'Map values between nodes' },
  { type: 'condition', label: 'Condition', hint: 'True/false branches' },
  { type: 'parallel', label: 'Parallel', hint: 'Run branches concurrently' },
  { type: 'loop', label: 'Loop', hint: 'Iterate over an array' },
  { type: 'human_gate', label: 'Approval', hint: 'Pause until an admin approves' },
  { type: 'subworkflow', label: 'Sub-workflow', hint: 'Run another published workflow' },
  { type: 'output', label: 'Output', hint: 'Set the run result' },
];

const TYPE_COLORS: Record<string, string> = {
  llm: 'green',
  image: 'cyan',
  http: 'blue',
  data: 'geekblue',
  transform: 'default',
  condition: 'orange',
  parallel: 'purple',
  loop: 'magenta',
  human_gate: 'gold',
  subworkflow: 'lime',
  output: 'default',
};

function defaultConfig(type: string): any {
  switch (type) {
    case 'llm':
      return { prompt: '', temperature: 0.2 };
    case 'image':
      return { prompt: '' };
    case 'http':
      return { method: 'GET', url: 'https://', responseType: 'json' };
    case 'data':
      return { collection: '', op: 'list', filter: {}, limit: 20 };
    case 'transform':
      return { map: {} };
    case 'condition':
      return { left: '', op: 'notEmpty', right: '' };
    case 'loop':
      return { items: '' };
    case 'human_gate':
      return { message: 'Approval required' };
    case 'subworkflow':
      return { workflowKey: '', input: {} };
    case 'output':
      return { map: {} };
    default:
      return {};
  }
}

function collectIds(nodes: NodeDef[], out: Set<string>) {
  for (const n of nodes ?? []) {
    out.add(n.id);
    for (const b of n.branches ?? []) collectIds(b ?? [], out);
  }
}

function makeNode(type: string, def: WorkflowDef): NodeDef {
  const ids = new Set<string>();
  collectIds(def.nodes ?? [], ids);
  let i = 1;
  while (ids.has(`${type}_${i}`)) i += 1;
  const node: NodeDef = { id: `${type}_${i}`, type, title: '', config: defaultConfig(type) };
  if (type === 'condition') node.branches = [[], []];
  if (type === 'parallel') node.branches = [[], []];
  if (type === 'loop') node.branches = [[]];
  return node;
}

/** Find the list containing a node id (for delete/move). */
function findList(nodes: NodeDef[], id: string): { list: NodeDef[]; index: number } | null {
  for (let i = 0; i < (nodes ?? []).length; i++) {
    if (nodes[i].id === id) return { list: nodes, index: i };
    for (const b of nodes[i].branches ?? []) {
      const hit = findList(b ?? [], id);
      if (hit) return hit;
    }
  }
  return null;
}

function findNode(nodes: NodeDef[], id: string): NodeDef | null {
  const hit = findList(nodes, id);
  return hit ? hit.list[hit.index] : null;
}

// --- small editor building blocks ---------------------------------------------

function JsonArea(props: { value: any; onChange: (v: any) => void; rows?: number; placeholder?: string }) {
  const [text, setText] = useState(() => (props.value == null ? '' : JSON.stringify(props.value, null, 2)));
  const [bad, setBad] = useState(false);
  // Re-sync when the bound value changes identity from outside (node switch).
  const lastValue = useRef(props.value);
  if (lastValue.current !== props.value) {
    lastValue.current = props.value;
    const s = props.value == null ? '' : JSON.stringify(props.value, null, 2);
    if (s !== text) {
      setText(s);
      setBad(false);
    }
  }
  return (
    <Input.TextArea
      value={text}
      rows={props.rows ?? 4}
      placeholder={props.placeholder ?? '{ }'}
      status={bad ? 'error' : undefined}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const t = text.trim();
        if (!t) {
          setBad(false);
          props.onChange(undefined);
          return;
        }
        try {
          props.onChange(JSON.parse(t));
          setBad(false);
        } catch {
          setBad(true);
        }
      }}
      style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 }}
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#8a8f8a', marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// --- node tree rendering --------------------------------------------------------

function AddSlot({ onAdd }: { onAdd: (type: string) => void }) {
  return (
    <Dropdown
      menu={{
        items: NODE_TYPES.map((t) => ({ key: t.type, label: `${t.label} — ${t.hint}` })),
        onClick: ({ key }) => onAdd(String(key)),
      }}
      trigger={['click']}
    >
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0', cursor: 'pointer' }} title="Add node">
        <span
          style={{
            fontSize: 12,
            lineHeight: '18px',
            width: 22,
            height: 22,
            textAlign: 'center',
            borderRadius: 11,
            border: '1px dashed #bfc4bf',
            color: '#8a8f8a',
            background: '#fff',
          }}
        >
          +
        </span>
      </div>
    </Dropdown>
  );
}

function NodeCard(props: {
  node: NodeDef;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  children?: React.ReactNode;
  runStep?: any;
  errorMessages?: string[];
  cached?: boolean;
  skip?: boolean;
  onToggleSkip?: () => void;
}) {
  const { node, selected, runStep, errorMessages, cached, onToggleSkip } = props;
  const label = NODE_TYPES.find((t) => t.type === node.type)?.label ?? node.type;
  const hasErrors = !!errorMessages?.length;
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        props.onSelect();
      }}
      style={{
        border: `1.5px solid ${hasErrors ? '#d4380d' : selected ? NEOHOME_GREEN : '#e2e4e1'}`,
        borderRadius: 10,
        background: '#fff',
        padding: '8px 10px',
        cursor: 'pointer',
        boxShadow: selected ? '0 1px 6px rgba(0,153,0,.15)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Tag color={TYPE_COLORS[node.type] ?? 'default'} style={{ marginRight: 0 }}>
          {label}
        </Tag>
        <span
          title={node.title || node.id}
          style={{ fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {node.title || node.id}
        </span>
        {hasErrors ? (
          <span title={errorMessages!.join(' · ')} style={{ display: 'inline-flex' }}>
            <Tag color="error" style={{ marginRight: 0, fontSize: 11 }}>
              !
            </Tag>
          </span>
        ) : null}
        {runStep ? <StatusTag status={runStep.status} /> : null}
        {cached && onToggleSkip ? (
          <Checkbox
            checked={props.skip === true}
            onClick={(e) => e.stopPropagation()}
            onChange={onToggleSkip}
            title="Skip this node on the next draft test run — reuse its last cached output"
          >
            <span style={{ fontSize: 11.5, color: '#8a8f8a' }}>skip (cached)</span>
          </Checkbox>
        ) : null}
        <span style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
          <Button size="small" type="text" onClick={() => props.onMove(-1)} title="Move up">
            ↑
          </Button>
          <Button size="small" type="text" onClick={() => props.onMove(1)} title="Move down">
            ↓
          </Button>
          <Button size="small" type="text" danger onClick={props.onDelete} title="Delete">
            ✕
          </Button>
        </span>
      </div>
      {props.children}
    </div>
  );
}

function NodeList(props: {
  nodes: NodeDef[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChange: () => void;
  def: WorkflowDef;
  emptyHint?: string;
  stepsByNodeId?: Map<string, any>;
  errorsByNodeId?: Map<string, string[]>;
  /** Cached-test-data skip UI (item 2) only ever renders at the TOP level — never inside a branch. */
  isTopLevel?: boolean;
  cachedOutputs?: Record<string, any>;
  skipSet?: Set<string>;
  onToggleSkip?: (id: string) => void;
}) {
  const { nodes, def, stepsByNodeId, errorsByNodeId, isTopLevel, cachedOutputs, skipSet, onToggleSkip } = props;
  const insert = (index: number, type: string) => {
    nodes.splice(index, 0, makeNode(type, def));
    props.onChange();
  };
  const del = (index: number) => {
    nodes.splice(index, 1);
    props.onChange();
  };
  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= nodes.length) return;
    const [n] = nodes.splice(index, 1);
    nodes.splice(j, 0, n);
    props.onChange();
  };
  const branchLabel = (node: NodeDef, i: number) => {
    if (node.type === 'condition') return i === 0 ? 'TRUE' : 'FALSE';
    if (node.type === 'loop') return 'BODY (per item)';
    return `BRANCH ${i + 1}`;
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {nodes.length === 0 && props.emptyHint ? (
        <div
          style={{
            textAlign: 'center',
            padding: '6px 0 14px',
            fontSize: 13,
            color: '#8a8f8a',
          }}
        >
          {props.emptyHint}
        </div>
      ) : null}
      {nodes.map((node, i) => (
        <React.Fragment key={node.id}>
          <AddSlot onAdd={(t) => insert(i, t)} />
          <NodeCard
            node={node}
            selected={props.selectedId === node.id}
            onSelect={() => props.onSelect(node.id)}
            onDelete={() => del(i)}
            onMove={(dir) => move(i, dir)}
            runStep={stepsByNodeId?.get(node.id)}
            errorMessages={errorsByNodeId?.get(node.id)}
            cached={isTopLevel === true && cachedOutputs?.[node.id] !== undefined}
            skip={skipSet?.has(node.id) === true}
            onToggleSkip={isTopLevel === true && cachedOutputs?.[node.id] !== undefined ? () => onToggleSkip?.(node.id) : undefined}
          >
            {node.branches && node.branches.length > 0 ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'stretch', overflowX: 'auto' }}>
                {node.branches.map((branch, bi) => (
                  <div
                    key={bi}
                    style={{
                      flex: '1 0 260px',
                      minWidth: 260,
                      border: '1px dashed #d8dbd7',
                      borderRadius: 8,
                      padding: '6px 6px 4px',
                      background: '#fafbf9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', color: '#8a8f8a', flex: 1 }}>
                        {branchLabel(node, bi)}
                      </span>
                      {node.type === 'parallel' && node.branches!.length > 1 ? (
                        <Button
                          size="small"
                          type="text"
                          danger
                          style={{ fontSize: 11 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            node.branches!.splice(bi, 1);
                            props.onChange();
                          }}
                        >
                          remove
                        </Button>
                      ) : null}
                    </div>
                    <NodeList
                      nodes={branch}
                      selectedId={props.selectedId}
                      onSelect={props.onSelect}
                      onChange={props.onChange}
                      def={def}
                      stepsByNodeId={stepsByNodeId}
                      errorsByNodeId={errorsByNodeId}
                    />
                  </div>
                ))}
                {node.type === 'parallel' ? (
                  <Button
                    size="small"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      node.branches!.push([]);
                      props.onChange();
                    }}
                  >
                    + branch
                  </Button>
                ) : null}
              </div>
            ) : null}
          </NodeCard>
        </React.Fragment>
      ))}
      <AddSlot onAdd={(t) => insert(nodes.length, t)} />
    </div>
  );
}

// --- per-type config forms -------------------------------------------------------

function NodeConfigForm({ node, onChange }: { node: NodeDef; onChange: () => void }) {
  const cfg = node.config ?? (node.config = {});
  const set = (k: string, v: any) => {
    cfg[k] = v;
    onChange();
  };
  const common = (
    <Field label="Title">
      <Input value={node.title} placeholder={node.id} onChange={(e) => ((node.title = e.target.value), onChange())} />
    </Field>
  );
  const retries = (
    <Field label="Retries on failure">
      <InputNumber min={0} max={5} value={cfg.retries ?? 0} onChange={(v) => set('retries', v ?? 0)} />
    </Field>
  );
  let body: React.ReactNode = null;
  switch (node.type) {
    case 'llm':
      body = (
        <>
          <Field label="Model (empty = default)">
            <Input value={cfg.model} placeholder="gemini-2.5-flash" onChange={(e) => set('model', e.target.value || undefined)} />
          </Field>
          <Field label="plugin-ai service (empty = default)">
            <Input value={cfg.service} onChange={(e) => set('service', e.target.value || undefined)} />
          </Field>
          <Field label="System prompt">
            <Input.TextArea rows={3} value={cfg.system} onChange={(e) => set('system', e.target.value || undefined)} />
          </Field>
          <Field label="Prompt (templates: {{input.x}}, {{nodes.<id>.y}})">
            <Input.TextArea rows={6} value={cfg.prompt} onChange={(e) => set('prompt', e.target.value)} />
          </Field>
          <Field label="JSON schema (optional — forces JSON output)">
            <JsonArea value={cfg.jsonSchema} onChange={(v) => set('jsonSchema', v)} rows={5} />
          </Field>
          <Field label="Temperature">
            <InputNumber min={0} max={2} step={0.1} value={cfg.temperature ?? 0.2} onChange={(v) => set('temperature', v ?? 0.2)} />
          </Field>
          {retries}
        </>
      );
      break;
    case 'image':
      body = (
        <>
          <Field label="Model">
            <Input value={cfg.model} placeholder="gemini-2.5-flash-image" onChange={(e) => set('model', e.target.value || undefined)} />
          </Field>
          <Field label="Prompt">
            <Input.TextArea rows={5} value={cfg.prompt} onChange={(e) => set('prompt', e.target.value)} />
          </Field>
          <Field label="Input image (template → data URL, optional)">
            <Input value={cfg.image} placeholder="{{input.image}}" onChange={(e) => set('image', e.target.value || undefined)} />
          </Field>
          {retries}
        </>
      );
      break;
    case 'http':
      body = (
        <>
          <Field label="Method">
            <Select
              value={cfg.method ?? 'GET'}
              onChange={(v) => set('method', v)}
              options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ value: m, label: m }))}
              style={{ width: 120 }}
            />
          </Field>
          <Field label="URL (templated)">
            <Input value={cfg.url} onChange={(e) => set('url', e.target.value)} />
          </Field>
          <Field label="Headers (JSON)">
            <JsonArea value={cfg.headers} onChange={(v) => set('headers', v)} rows={3} />
          </Field>
          <Field label="Body (string or JSON; templated)">
            <Input.TextArea
              rows={4}
              value={typeof cfg.body === 'string' ? cfg.body : cfg.body ? JSON.stringify(cfg.body, null, 2) : ''}
              onChange={(e) => set('body', e.target.value || undefined)}
            />
          </Field>
          <Field label="Response type">
            <Select
              value={cfg.responseType ?? 'json'}
              onChange={(v) => set('responseType', v)}
              options={[
                { value: 'json', label: 'JSON' },
                { value: 'text', label: 'Text' },
              ]}
              style={{ width: 120 }}
            />
          </Field>
          {retries}
        </>
      );
      break;
    case 'data':
      body = (
        <>
          <Field label="Collection">
            <Input value={cfg.collection} placeholder="konfigurator_plots" onChange={(e) => set('collection', e.target.value)} />
          </Field>
          <Field label="Operation">
            <Select
              value={cfg.op ?? 'list'}
              onChange={(v) => set('op', v)}
              options={['list', 'get', 'create', 'update'].map((o) => ({ value: o, label: o }))}
              style={{ width: 140 }}
            />
          </Field>
          <Field label="Filter (JSON, templated)">
            <JsonArea value={cfg.filter} onChange={(v) => set('filter', v)} rows={3} />
          </Field>
          <Field label="Values (JSON, for create/update)">
            <JsonArea value={cfg.values} onChange={(v) => set('values', v)} rows={3} />
          </Field>
          <Field label="Allow write">
            <Checkbox checked={cfg.allowWrite === true} onChange={(e) => set('allowWrite', e.target.checked)}>
              permit create/update (explicit opt-in)
            </Checkbox>
          </Field>
        </>
      );
      break;
    case 'transform':
      body = (
        <Field label="Map (JSON of templates)">
          <JsonArea value={cfg.map} onChange={(v) => set('map', v ?? {})} rows={8} placeholder='{ "lat": "{{nodes.geo.body.0.lat}}" }' />
        </Field>
      );
      break;
    case 'condition':
      body = (
        <>
          <Field label="Left (templated)">
            <Input value={cfg.left} onChange={(e) => set('left', e.target.value)} />
          </Field>
          <Field label="Operator">
            <Select
              value={cfg.op ?? 'notEmpty'}
              onChange={(v) => set('op', v)}
              options={['truthy', 'eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'empty', 'notEmpty'].map((o) => ({ value: o, label: o }))}
              style={{ width: 160 }}
            />
          </Field>
          <Field label="Right (templated)">
            <Input value={cfg.right} onChange={(e) => set('right', e.target.value)} />
          </Field>
        </>
      );
      break;
    case 'loop':
      body = (
        <Field label="Items (template → array; body sees {{item}} / {{index}})">
          <Input value={cfg.items} placeholder="{{nodes.list.rows}}" onChange={(e) => set('items', e.target.value)} />
        </Field>
      );
      break;
    case 'human_gate':
      body = (
        <Field label="Message shown to the approver (templated)">
          <Input.TextArea rows={3} value={cfg.message} onChange={(e) => set('message', e.target.value)} />
        </Field>
      );
      break;
    case 'subworkflow':
      body = (
        <>
          <Field label="Workflow key">
            <Input value={cfg.workflowKey} onChange={(e) => set('workflowKey', e.target.value)} />
          </Field>
          <Field label="Input (JSON of templates)">
            <JsonArea value={cfg.input} onChange={(v) => set('input', v ?? {})} rows={4} />
          </Field>
        </>
      );
      break;
    case 'output':
      body = (
        <>
          <Field label="Result map (JSON of templates)">
            <JsonArea value={cfg.map} onChange={(v) => set('map', v ?? {})} rows={6} />
          </Field>
          <Field label="End run here">
            <Checkbox checked={cfg.end === true} onChange={(e) => set('end', e.target.checked)}>
              stop the workflow after this node
            </Checkbox>
          </Field>
        </>
      );
      break;
    default:
      body = null;
  }
  return (
    <>
      {common}
      <Field label="Node id">
        <Input value={node.id} disabled />
      </Field>
      {body}
    </>
  );
}

// --- run confirm dialog (replaces window.confirm — native dialogs block the
// renderer entirely, which is both bad UX and breaks any automated driving of
// the page) ---------------------------------------------------------------

function confirmRun(estimate: any): Promise<boolean> {
  const e = estimate ?? {};
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v: boolean) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    Modal.confirm({
      title: 'Run this workflow?',
      icon: null,
      width: 440,
      okText: 'Run',
      cancelText: 'Cancel',
      onOk: () => finish(true),
      onCancel: () => finish(false),
      content: (
        <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 10px' }}>
            Makes <b>{e.llmCalls ?? '?'}</b> LLM call{e.llmCalls === 1 ? '' : 's'} and <b>{e.imageCalls ?? 0}</b> image call
            {e.imageCalls === 1 ? '' : 's'} per run.
          </p>
          <div style={{ background: '#fafaf8', border: '1px solid #ececea', borderRadius: 8, padding: '8px 12px' }}>
            <div>
              Spent today (global): <b>${(e.spentTodayUsd ?? 0).toFixed(2)}</b>
              {e.globalDailyBudgetUsd ? ` / $${e.globalDailyBudgetUsd} budget` : ' (no budget set)'}
            </div>
            <div>
              Spent today (this workflow): <b>${(e.workflowSpentTodayUsd ?? 0).toFixed(2)}</b>
              {e.workflowDailyBudgetUsd ? ` / $${e.workflowDailyBudgetUsd} budget` : ' (no budget set)'}
            </div>
          </div>
        </div>
      ),
    });
  });
}

// --- draft test run ---------------------------------------------------------------

function TestRunBox({
  workflowId,
  currentVersion,
  exampleInput,
  onStatus,
  topLevelNodes,
  skipSet,
  cachedOutputs,
}: {
  workflowId: number;
  currentVersion: number;
  exampleInput?: any;
  onStatus?: (data: { run?: any; steps?: any[] }) => void;
  /** Cached test-data (item 2) — a contiguous PREFIX of skipSet-marked top-level
   * nodes gets skipped, seeded from cachedOutputs; a gap in the prefix just
   * stops the skip there (only the from-the-start run is supported in v1). */
  topLevelNodes?: NodeDef[];
  skipSet?: Set<string>;
  cachedOutputs?: Record<string, any>;
}) {
  const api = useAPIClient();
  const [inputText, setInputText] = useState(() => JSON.stringify(exampleInput ?? {}, null, 2));
  const [runId, setRunId] = useState<number | null>(null);
  const [data, setData] = useState<{ run?: any; steps?: any[] }>({});
  const active = !!runId && !['succeeded', 'failed', 'cancelled', 'rejected'].includes(String(data.run?.status ?? ''));
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;
  usePoll(
    async () => {
      if (!runId) return;
      try {
        const d = await neoaiAction(api, 'runStatus', { runId });
        setData(d);
        onStatusRef.current?.(d);
      } catch {
        /* keep last */
      }
    },
    2000,
    !!runId && active,
  );
  /** Earliest gap-free run of skipSet-marked nodes from the start of the top-level list. */
  const computeSeed = (): { skipToNodeId?: string; seedVars?: Record<string, any> } => {
    const nodes = topLevelNodes ?? [];
    if (!skipSet?.size || !nodes.length) return {};
    let firstRunIndex = 0;
    while (firstRunIndex < nodes.length && skipSet.has(nodes[firstRunIndex].id)) firstRunIndex += 1;
    if (firstRunIndex === 0 || firstRunIndex >= nodes.length) return {};
    const seedVars: Record<string, any> = {};
    for (let i = 0; i < firstRunIndex; i++) {
      const id = nodes[i].id;
      if (cachedOutputs?.[id] !== undefined) seedVars[id] = cachedOutputs[id];
    }
    return { skipToNodeId: nodes[firstRunIndex].id, seedVars };
  };
  const start = async (draft: boolean) => {
    let input: any = {};
    try {
      input = inputText.trim() ? JSON.parse(inputText) : {};
    } catch {
      message.error('Test input is not valid JSON');
      return;
    }
    try {
      const seed = draft ? computeSeed() : {};
      let res = await neoaiAction(api, 'run', { workflowId, input, draft, confirmed: draft, trigger: draft ? 'test' : 'manual', ...seed });
      if (res.needsConfirm) {
        // Honest confirm gate (Q15): model-call counts + today's spend vs budgets.
        const ok = await confirmRun(res.estimate);
        if (!ok) return;
        res = await neoaiAction(api, 'run', { workflowId, input, draft, confirmed: true, trigger: 'manual' });
      }
      if (res.error) {
        message.error(res.error);
        return;
      }
      setRunId(res.runId);
      setData({});
      onStatusRef.current?.({});
    } catch (err: any) {
      message.error(String(err?.message ?? err));
    }
  };
  return (
    <div>
      <Field label="Input (JSON)">
        <Input.TextArea
          rows={4}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 }}
        />
      </Field>
      <Space wrap>
        <Button type="primary" onClick={() => start(true)}>
          Run draft test
        </Button>
        <Button disabled={!currentVersion} title={currentVersion ? '' : 'Publish first'} onClick={() => start(false)}>
          Run published v{currentVersion || '—'}
        </Button>
        {runId ? <span style={{ fontSize: 12, color: '#8a8f8a' }}>run #{runId}</span> : null}
        {data.run ? <StatusTag status={data.run.status} /> : null}
      </Space>
      {(data.steps ?? []).length > 0 ? (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(data.steps ?? []).map((s: any) => (
            <div key={s.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5 }}>
              <StatusTag status={s.status} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title || s.node_id}</span>
              <span style={{ color: '#8a8f8a' }}>{fmtDuration(s.duration_ms)}</span>
              <span style={{ color: '#8a8f8a' }}>{fmtCost(s.cost_usd)}</span>
            </div>
          ))}
        </div>
      ) : null}
      {data.run?.status === 'succeeded' ? (
        <div style={{ marginTop: 8 }}>
          <JsonBox value={data.run.output} maxHeight={200} />
        </div>
      ) : null}
      {data.run?.status === 'failed' ? (
        <div style={{ marginTop: 8, color: '#b02a2a', fontSize: 12.5 }}>{data.run.error}</div>
      ) : null}
    </div>
  );
}

// --- batch/bulk dispatch (item 9) --------------------------------------------------

function BatchRunBox({ workflowId }: { workflowId: number }) {
  const api = useAPIClient();
  const [itemsText, setItemsText] = useState('[\n  {}\n]');
  const [busy, setBusy] = useState(false);
  const start = async () => {
    let items: any[];
    try {
      const parsed = JSON.parse(itemsText);
      if (!Array.isArray(parsed)) throw new Error('not an array');
      items = parsed;
    } catch {
      message.error('Items must be a JSON array, e.g. [{"x":1},{"x":2}]');
      return;
    }
    setBusy(true);
    try {
      const res = await neoaiAction(api, 'batchRun', { workflowId, items });
      if (res.error) {
        message.error(res.error);
        return;
      }
      const started = (res.started ?? []).filter((r: any) => r.runId).length;
      const failed = (res.started ?? []).length - started;
      message.success(`Batch: ${started} run${started === 1 ? '' : 's'} started${failed ? `, ${failed} failed to start` : ''}`);
    } catch (err: any) {
      message.error(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <Field label='Items (JSON array — one run per item, e.g. [{"dealId":1},{"dealId":2}])'>
        <Input.TextArea
          rows={4}
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
          style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 }}
        />
      </Field>
      <Button loading={busy} onClick={start}>
        Run batch
      </Button>
      <span style={{ marginLeft: 10, fontSize: 12, color: '#8a8f8a' }}>
        Runs against the published version — view progress in the Runs tab (trigger: batch).
      </span>
    </div>
  );
}

// --- editor drawer ----------------------------------------------------------------

function WorkflowEditor(props: { row: any; onClose: (changed: boolean) => void }) {
  const api = useAPIClient();
  const [wf, setWf] = useState<any>(props.row);
  const defRef = useRef<WorkflowDef>(
    props.row.definition_draft && Array.isArray(props.row.definition_draft.nodes)
      ? JSON.parse(JSON.stringify(props.row.definition_draft))
      : { nodes: [] },
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [, setTick] = useState(0);
  const [runStatus, setRunStatus] = useState<{ run?: any; steps?: any[] }>({});
  const [validationErrors, setValidationErrors] = useState<Array<{ nodeId?: string; message: string }>>([]);
  const validateTimer = useRef<any>(null);
  const rerender = () => {
    setDirty(true);
    setTick((n) => n + 1);
    if (validateTimer.current) clearTimeout(validateTimer.current);
    validateTimer.current = setTimeout(async () => {
      try {
        const res = await neoaiAction(api, 'publishWorkflow', { workflowId: wf.id, dryRun: true });
        setValidationErrors(res.errors ?? []);
      } catch {
        /* live-validation is best-effort — never blocks editing */
      }
    }, 500);
  };
  const selected = selectedId ? findNode(defRef.current.nodes, selectedId) : null;
  if (selectedId && !selected && selectedId !== null) {
    // node was deleted
    setSelectedId(null);
  }

  const stepsByNodeId = useMemo(() => {
    const m = new Map<string, any>();
    for (const s of runStatus.steps ?? []) m.set(s.node_id, s);
    return m;
  }, [runStatus]);

  // Cached test-data (item 2): a completed step's output is remembered for the
  // life of this editor session so a later draft test run can skip re-running
  // it. Client-side only, dies with the tab — a debugging aid, not durable data.
  const cachedOutputsRef = useRef<Record<string, any>>({});
  const [skipSet, setSkipSet] = useState<Set<string>>(new Set());
  for (const s of runStatus.steps ?? []) {
    if (s.status === 'done' && s.output !== undefined) cachedOutputsRef.current[s.node_id] = s.output;
  }
  const toggleSkip = (nodeId: string) => {
    setSkipSet((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };
  const errorsByNodeId = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of validationErrors) {
      if (!e.nodeId) continue;
      const arr = m.get(e.nodeId) ?? [];
      arr.push(e.message);
      m.set(e.nodeId, arr);
    }
    return m;
  }, [validationErrors]);
  const generalErrors = validationErrors.filter((e) => !e.nodeId);

  // Validate once on open (not via rerender(), which would wrongly mark a
  // freshly opened editor as having unsaved changes).
  useEffect(() => {
    (async () => {
      try {
        const res = await neoaiAction(api, 'publishWorkflow', { workflowId: wf.id, dryRun: true });
        setValidationErrors(res.errors ?? []);
      } catch {
        /* best-effort */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reattach to a run already in flight if the editor was reopened mid-run —
  // TestRunBox only tracks runs it itself started this mount.
  usePoll(
    async () => {
      try {
        const { rows } = await listResource(api, 'neoai_runs', {
          filter: JSON.stringify({ workflow_id: wf.id, status: { $in: ['queued', 'running', 'waiting'] } }),
          sort: '-id',
          pageSize: 1,
        });
        if (rows[0]) setRunStatus(await neoaiAction(api, 'runStatus', { runId: rows[0].id }));
      } catch {
        /* best-effort */
      }
    },
    5000,
    stepsByNodeId.size === 0 && !runStatus.run,
  );

  const [versions, setVersions] = useState<any[]>([]);
  const [diffAgainst, setDiffAgainst] = useState<any | null>(null);
  const loadVersions = async () => {
    try {
      const { rows } = await listResource(api, 'neoai_workflow_versions', {
        filter: JSON.stringify({ workflow_id: wf.id }),
        sort: '-version',
        pageSize: 10,
      });
      setVersions(rows);
    } catch {
      /* non-fatal */
    }
  };
  usePoll(loadVersions, 3_600_000, true);

  const saveDraft = async (silent = false) => {
    try {
      await updateResource(api, 'neoai_workflows', wf.id, {
        definition_draft: defRef.current,
        name: wf.name,
        require_confirm: wf.require_confirm === true,
        daily_budget_usd: Number(wf.daily_budget_usd) || 0,
        description: wf.description ?? '',
        schedule: wf.schedule ?? '',
        schedule_input: wf.schedule_input ?? null,
        on_failure_workflow_key: wf.on_failure_workflow_key ?? '',
        on_failure_input: wf.on_failure_input ?? null,
      });
      setDirty(false);
      if (!silent) message.success('Draft saved');
      return true;
    } catch (err: any) {
      message.error(`Save failed: ${err?.message ?? err}`);
      return false;
    }
  };

  const publish = async () => {
    if (dirty && !(await saveDraft(true))) return;
    try {
      const res = await neoaiAction(api, 'publishWorkflow', { workflowId: wf.id });
      if (res.ok) {
        message.success(`Published as version ${res.version}`);
        setWf({ ...wf, current_version: res.version });
        loadVersions();
      } else {
        setValidationErrors(res.errors ?? []);
        message.error(`Not publishable: ${(res.errors ?? []).map((e: any) => e.message).join(' · ')}`);
      }
    } catch (err: any) {
      message.error(`Publish failed: ${err?.message ?? err}`);
    }
  };

  return (
    <ConsoleDrawer
      open
      title={
        <span>
          {wf.name} <span style={{ color: '#8a8f8a', fontWeight: 400, fontSize: 13 }}>({wf.key} · v{wf.current_version ?? 0}{dirty ? ' · unsaved changes' : ''})</span>
        </span>
      }
      extra={
        <Space>
          <Button onClick={saveDraft} disabled={!dirty}>
            Save draft
          </Button>
          <Button type="primary" onClick={publish}>
            Publish
          </Button>
        </Space>
      }
      onClose={() => props.onClose(true)}
    >
      <div style={{ display: 'flex', minHeight: '100%', alignItems: 'stretch' }}>
        <div style={{ flex: 1, padding: 18, minWidth: 0 }}>
          <div style={{ maxWidth: 860 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#8a8f8a', margin: '0 0 6px' }}>WORKFLOW TREE</div>
            {generalErrors.length > 0 ? (
              <div style={{ marginBottom: 10, fontSize: 12.5, color: '#b02a2a' }}>{generalErrors.map((e) => e.message).join(' · ')}</div>
            ) : null}
            <NodeList
              nodes={defRef.current.nodes}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={rerender}
              def={defRef.current}
              emptyHint="Empty workflow — click + below to add the first step."
              stepsByNodeId={stepsByNodeId}
              errorsByNodeId={errorsByNodeId}
              isTopLevel
              cachedOutputs={cachedOutputsRef.current}
              skipSet={skipSet}
              onToggleSkip={toggleSkip}
            />
          </div>
        </div>
        <div style={{ width: 400, borderLeft: '1px solid #ececea', background: '#fff', padding: 16, overflow: 'auto' }}>
          {selected ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#8a8f8a', marginBottom: 8 }}>NODE SETTINGS</div>
              <NodeConfigForm node={selected} onChange={rerender} />
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#8a8f8a', marginBottom: 8 }}>WORKFLOW SETTINGS</div>
              <Field label="Name">
                <Input value={wf.name} onChange={(e) => (setWf({ ...wf, name: e.target.value }), setDirty(true))} />
              </Field>
              <Field label="Description">
                <Input.TextArea rows={3} value={wf.description} onChange={(e) => (setWf({ ...wf, description: e.target.value }), setDirty(true))} />
              </Field>
              <Field label="Require confirmation before each run">
                <Switch checked={wf.require_confirm === true} onChange={(v) => (setWf({ ...wf, require_confirm: v }), setDirty(true))} />
              </Field>
              <Field label="Daily budget (USD, 0 = unlimited)">
                <InputNumber min={0} step={0.5} value={Number(wf.daily_budget_usd) || 0} onChange={(v) => (setWf({ ...wf, daily_budget_usd: v ?? 0 }), setDirty(true))} />
              </Field>
              <Field label='Schedule — "every 15m" · "every 2h" · "daily 07:00" (empty = off; runs published version)'>
                <Input
                  value={wf.schedule ?? ''}
                  placeholder="off"
                  onChange={(e) => (setWf({ ...wf, schedule: e.target.value }), setDirty(true))}
                />
              </Field>
              <Field label="Schedule input (JSON passed to scheduled runs)">
                <JsonArea value={wf.schedule_input} onChange={(v) => (setWf({ ...wf, schedule_input: v ?? null }), setDirty(true))} rows={3} />
              </Field>
              <Field label="Run a workflow on failure (key, empty = off)">
                <Input
                  value={wf.on_failure_workflow_key ?? ''}
                  placeholder="e.g. notify-admin-of-failure"
                  onChange={(e) => (setWf({ ...wf, on_failure_workflow_key: e.target.value }), setDirty(true))}
                />
              </Field>
              {wf.on_failure_workflow_key ? (
                <Field label="On-failure hook input (JSON of templates: {{run.id}}, {{run.error}}, {{input.x}})">
                  <JsonArea value={wf.on_failure_input} onChange={(v) => (setWf({ ...wf, on_failure_input: v ?? null }), setDirty(true))} rows={3} />
                </Field>
              ) : null}
              <div style={{ borderTop: '1px solid #ececea', margin: '14px 0' }} />
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#8a8f8a', marginBottom: 8 }}>RUN</div>
              <TestRunBox
                workflowId={wf.id}
                currentVersion={Number(wf.current_version) || 0}
                onStatus={setRunStatus}
                topLevelNodes={defRef.current.nodes}
                skipSet={skipSet}
                cachedOutputs={cachedOutputsRef.current}
              />
              {Number(wf.current_version) > 0 ? (
                <>
                  <div style={{ borderTop: '1px solid #ececea', margin: '14px 0' }} />
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#8a8f8a', marginBottom: 8 }}>BATCH RUN</div>
                  <BatchRunBox workflowId={wf.id} />
                </>
              ) : null}
              <div style={{ borderTop: '1px solid #ececea', margin: '14px 0' }} />
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#8a8f8a', marginBottom: 8 }}>VERSIONS</div>
              {versions.length === 0 ? (
                <div style={{ fontSize: 12.5, color: '#8a8f8a' }}>No published versions yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {versions.map((v) => (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                      <Tag color={Number(v.version) === Number(wf.current_version) ? 'green' : 'default'} style={{ marginRight: 0 }}>
                        v{v.version}
                      </Tag>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#5c605c' }}>
                        {fmtTime(v.createdAt)} · {v.published_by || '—'}
                        {v.notes ? ` · ${v.notes}` : ''}
                      </span>
                      <Button size="small" onClick={() => setDiffAgainst(v)}>
                        Diff
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          defRef.current = JSON.parse(JSON.stringify(v.definition ?? { nodes: [] }));
                          setSelectedId(null);
                          rerender();
                          message.info(`Version ${v.version} loaded into the draft — save & publish to make it current`);
                        }}
                      >
                        Load as draft
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {diffAgainst ? (
        <VersionDiffDrawer
          options={[
            { key: 'draft', label: 'Current draft', definition: defRef.current },
            ...versions.map((v) => ({ key: `v${v.version}`, label: `v${v.version} (${v.published_by || '—'})`, definition: v.definition ?? { nodes: [] } })),
          ]}
          initialLeftKey="draft"
          initialRightKey={`v${diffAgainst.version}`}
          onClose={() => setDiffAgainst(null)}
        />
      ) : null}
    </ConsoleDrawer>
  );
}

// --- list panel --------------------------------------------------------------------

export function WorkflowsPanel() {
  const api = useAPIClient();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.key, r.description].some((v) => String(v ?? '').toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const load = async () => {
    setLoading(true);
    try {
      const { rows } = await listResource(api, 'neoai_workflows', { sort: '-id', pageSize: 100 });
      setRows(rows);
    } catch (err: any) {
      message.error(`Load failed: ${err?.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };
  usePoll(load, 30_000, !editing);

  const create = async () => {
    const name = newName.trim();
    if (!name) {
      message.error('Enter a workflow name');
      return;
    }
    const key = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    try {
      await createResource(api, 'neoai_workflows', {
        name,
        key,
        enabled: false,
        require_confirm: true,
        definition_draft: { nodes: [] },
        current_version: 0,
      });
      setCreating(false);
      setNewName('');
      await load();
      message.success(`Workflow "${name}" created (disabled draft)`);
    } catch (err: any) {
      message.error(`Create failed: ${err?.message ?? err}`);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (v: string, r: any) => (
        <a style={{ fontWeight: 600, color: NEOHOME_GREEN }} onClick={() => setEditing(r)}>
          {v}
        </a>
      ),
    },
    {
      title: 'Schedule',
      dataIndex: 'schedule',
      width: 110,
      render: (v: string) => (v ? <Tag color="green">{v}</Tag> : '—'),
    },
    { title: 'Key', dataIndex: 'key', render: (v: string) => <code style={{ fontSize: 12 }}>{v}</code> },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      width: 90,
      render: (v: boolean, r: any) => (
        <Switch
          size="small"
          checked={v === true}
          onChange={async (val) => {
            await updateResource(api, 'neoai_workflows', r.id, { enabled: val });
            load();
          }}
        />
      ),
    },
    { title: 'Version', dataIndex: 'current_version', width: 90, render: (v: number) => (v ? `v${v}` : <Tag>draft</Tag>) },
    { title: 'Confirm', dataIndex: 'require_confirm', width: 90, render: (v: boolean) => (v ? 'yes' : 'no') },
    {
      title: 'Budget/day',
      dataIndex: 'daily_budget_usd',
      width: 110,
      render: (v: number) => (Number(v) > 0 ? `$${Number(v)}` : '—'),
    },
    { title: 'Updated', dataIndex: 'updatedAt', width: 150, render: (v: string) => fmtTime(v) },
  ];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>AI Workflows</div>
        <div style={{ flex: 1 }} />
        {!creating ? (
          <Input.Search
            allowClear
            placeholder="Search name, key, description"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240 }}
          />
        ) : null}
        {creating ? (
          <Space.Compact>
            <Input
              autoFocus
              placeholder="Workflow name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onPressEnter={create}
              style={{ width: 260 }}
            />
            <Button type="primary" onClick={create}>
              Create
            </Button>
            <Button onClick={() => setCreating(false)}>Cancel</Button>
          </Space.Compact>
        ) : (
          <>
            <Button onClick={load}>Refresh</Button>
            <Button type="primary" onClick={() => setCreating(true)}>
              New workflow
            </Button>
          </>
        )}
      </div>
      <Table
        rowKey="id"
        size="middle"
        loading={loading}
        dataSource={filteredRows}
        columns={columns as any}
        pagination={false}
        locale={{ emptyText: rows.length ? 'No workflows match this search' : 'No workflows yet' }}
      />
      {editing ? (
        <WorkflowEditor
          row={editing}
          onClose={() => {
            setEditing(null);
            load();
          }}
        />
      ) : null}
    </div>
  );
}
