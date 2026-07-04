// src/client/console/VersionDiffDrawer.tsx
// -----------------------------------------------------------------------------
// Structural diff between two workflow definitions (current draft vs. a
// published version, or version vs. version) — pure client-side, no server
// changes: neoai_workflow_versions already stores full immutable snapshots.

import React, { useMemo, useState } from 'react';
import { Select, Tag } from 'antd';
import { ConsoleDrawer, JsonBox } from './shared';

type NodeDef = { id: string; type: string; title?: string; config?: any; branches?: NodeDef[][] };
type WorkflowDef = { nodes: NodeDef[] };

// Duplicated (not imported) from WorkflowsPanel.tsx on purpose — a ~15-line
// lookup table isn't worth exporting/restructuring that module's boundary for.
const TYPE_LABELS: Record<string, string> = {
  llm: 'LLM',
  image: 'Image',
  http: 'HTTP',
  data: 'Data',
  transform: 'Transform',
  condition: 'Condition',
  parallel: 'Parallel',
  loop: 'Loop',
  human_gate: 'Approval',
  subworkflow: 'Sub-workflow',
  output: 'Output',
};

export type DiffEntry = {
  nodeId: string;
  kind: 'added' | 'removed' | 'changed';
  type?: string;
  title?: string;
  detail?: string;
};

function flatten(nodes: NodeDef[] | undefined, out: Map<string, NodeDef>) {
  for (const n of nodes ?? []) {
    out.set(n.id, n);
    for (const b of n.branches ?? []) flatten(b, out);
  }
}

/** Pure structural diff by node.id — ids are unique within a definition per validateDefinition's own invariant. */
export function diffWorkflowDef(a: WorkflowDef | null | undefined, b: WorkflowDef | null | undefined): DiffEntry[] {
  const aMap = new Map<string, NodeDef>();
  const bMap = new Map<string, NodeDef>();
  flatten(a?.nodes, aMap);
  flatten(b?.nodes, bMap);
  const entries: DiffEntry[] = [];
  const seen = new Set<string>();

  for (const [id, bNode] of bMap) {
    seen.add(id);
    const aNode = aMap.get(id);
    if (!aNode) {
      entries.push({ nodeId: id, kind: 'added', type: bNode.type, title: bNode.title });
      continue;
    }
    const diffs: string[] = [];
    if (aNode.type !== bNode.type) diffs.push(`type: ${aNode.type} → ${bNode.type}`);
    if ((aNode.title ?? '') !== (bNode.title ?? '')) diffs.push(`title: "${aNode.title ?? ''}" → "${bNode.title ?? ''}"`);
    if (JSON.stringify(aNode.config ?? {}) !== JSON.stringify(bNode.config ?? {})) diffs.push('config changed');
    const aBranchCount = aNode.branches?.length ?? 0;
    const bBranchCount = bNode.branches?.length ?? 0;
    if (aBranchCount !== bBranchCount) diffs.push(`branches: ${aBranchCount} → ${bBranchCount}`);
    if (diffs.length) entries.push({ nodeId: id, kind: 'changed', type: bNode.type, title: bNode.title, detail: diffs.join(' · ') });
  }
  for (const [id, aNode] of aMap) {
    if (seen.has(id)) continue;
    entries.push({ nodeId: id, kind: 'removed', type: aNode.type, title: aNode.title });
  }
  return entries;
}

const KIND_COLOR: Record<DiffEntry['kind'], string> = { added: 'green', removed: 'red', changed: 'orange' };
const KIND_LABEL: Record<DiffEntry['kind'], string> = { added: 'ADDED', removed: 'REMOVED', changed: 'CHANGED' };

export function VersionDiffDrawer(props: {
  /** { label, definition } — one entry per selectable side (current draft + each version). */
  options: Array<{ key: string; label: string; definition: WorkflowDef }>;
  initialLeftKey: string;
  initialRightKey: string;
  onClose: () => void;
}) {
  const [leftKey, setLeftKey] = useState(props.initialLeftKey);
  const [rightKey, setRightKey] = useState(props.initialRightKey);
  const left = props.options.find((o) => o.key === leftKey);
  const right = props.options.find((o) => o.key === rightKey);
  const entries = useMemo(() => diffWorkflowDef(left?.definition, right?.definition), [left, right]);
  const selectOpts = props.options.map((o) => ({ value: o.key, label: o.label }));

  return (
    <ConsoleDrawer open title="Version diff" onClose={props.onClose}>
      <div style={{ padding: 18, maxWidth: 900 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <Select value={leftKey} onChange={setLeftKey} options={selectOpts} style={{ width: 220 }} />
          <span style={{ color: '#8a8f8a' }}>vs.</span>
          <Select value={rightKey} onChange={setRightKey} options={selectOpts} style={{ width: 220 }} />
        </div>
        {entries.length === 0 ? (
          <div style={{ color: '#8a8f8a', fontSize: 13 }}>No structural differences between these two.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {entries.map((e) => (
              <div
                key={e.nodeId}
                style={{
                  borderLeft: `3px solid ${e.kind === 'added' ? '#389e0d' : e.kind === 'removed' ? '#cf1322' : '#d46b08'}`,
                  padding: '6px 10px',
                  background: '#fafaf8',
                  borderRadius: 4,
                  fontSize: 13,
                }}
              >
                <Tag color={KIND_COLOR[e.kind]} style={{ marginRight: 8 }}>
                  {KIND_LABEL[e.kind]}
                </Tag>
                <b>{e.title || e.nodeId}</b>
                {e.type ? <span style={{ color: '#8a8f8a' }}> ({TYPE_LABELS[e.type] ?? e.type})</span> : null}
                {e.detail ? <div style={{ color: '#5c605c', marginTop: 2 }}>{e.detail}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </ConsoleDrawer>
  );
}
