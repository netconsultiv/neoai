// src/client/console/MemoryPanel.tsx
// -----------------------------------------------------------------------------
// Thin, entity-agnostic view over neoai_memories: a host plugin's AI-generated
// summary about one of ITS entities (e.g. crm.deal #42), gated by a human
// confirm. Deliberately renders entity_type/entity_id as plain tag/text — no
// CRM/Konfigurator-specific deep links, keeping this panel as loosely coupled
// as the collection itself (owner decision: central store, modular UI).
//
// Upsert/confirm semantics (owner decision: confirmed content stays frozen):
// a re-drafted summary for an already-confirmed key stages as a SEPARATE
// "<key>__pending" row instead of overwriting the confirmed one. Both rows
// share the same drawer here — confirming either just calls confirmMemory,
// which handles the "adopt pending onto the base row" swap server-side.

import React, { useMemo, useState } from 'react';
import { Button, Input, Popconfirm, Table, Tag, message } from 'antd';
import { useAPIClient } from '@nocobase/client';
import { ConsoleDrawer, JsonBox, fmtTime, listResource, neoaiAction, usePoll } from './shared';
import { NEOHOME_GREEN } from '../theme';

const PENDING_SUFFIX = '__pending';

function baseKeyOf(key: string) {
  return key.endsWith(PENDING_SUFFIX) ? key.slice(0, -PENDING_SUFFIX.length) : key;
}

function MemoryDetail({ row, confirmedSibling, onClose, onSaved }: { row: any; confirmedSibling: any | null; onClose: () => void; onSaved: () => void }) {
  const api = useAPIClient();
  const isPending = String(row.key ?? '').endsWith(PENDING_SUFFIX);
  const [summary, setSummary] = useState(String(row.summary ?? ''));
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      const res = await neoaiAction(api, 'memoryConfirm', { id: row.id, editedSummary: summary });
      if (res?.ok) {
        message.success(isPending ? 'Confirmed — swapped in over the previous version' : 'Confirmed');
        onSaved();
        onClose();
      } else {
        message.error(res?.reason ?? 'Confirm failed');
      }
    } catch (err: any) {
      message.error(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConsoleDrawer
      open
      title={
        <span>
          <code style={{ fontSize: 13 }}>{row.entity_type}</code>
          <span style={{ color: '#8a8f8a' }}> · </span>
          <code style={{ fontSize: 13 }}>{row.entity_id}</code>
          <span style={{ color: '#8a8f8a' }}> · </span>
          {baseKeyOf(row.key)}
          {isPending ? <Tag color="gold" style={{ marginLeft: 8 }}>pending review</Tag> : null}
          {!isPending && row.status === 'confirmed' ? <Tag color="green" style={{ marginLeft: 8 }}>confirmed</Tag> : null}
        </span>
      }
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Close</Button>
          <Button type="primary" loading={busy} onClick={confirm}>
            {isPending ? 'Confirm & swap in' : row.status === 'confirmed' ? 'Save changes' : 'Confirm'}
          </Button>
        </div>
      }
    >
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
        {isPending && confirmedSibling ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#8a8f8a', margin: '0 0 6px' }}>
              CURRENTLY CONFIRMED (unaffected until you confirm the draft below)
            </div>
            <JsonBox value={confirmedSibling.summary} maxHeight={140} />
          </div>
        ) : null}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#8a8f8a', margin: '0 0 6px' }}>
            {isPending ? 'NEW DRAFT — REVIEW BEFORE CONFIRMING' : 'SUMMARY'}
          </div>
          <Input.TextArea rows={8} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        {row.structured ? (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#8a8f8a', margin: '0 0 6px' }}>
              STRUCTURED (Phase 2 — informational only, not applied anywhere yet)
            </div>
            <JsonBox value={row.structured} maxHeight={200} />
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 13, color: '#5c605c' }}>
          <span>
            <b>Updated by:</b> {row.updated_by || '—'}
          </span>
          <span>
            <b>Confirmed at:</b> {fmtTime(row.confirmed_at)}
          </span>
          <span>
            <b>Source run:</b> {row.source_run_id ? `#${row.source_run_id}` : '—'}
          </span>
        </div>
      </div>
    </ConsoleDrawer>
  );
}

export function MemoryPanel() {
  const api = useAPIClient();
  const [rows, setRows] = useState<any[]>([]);
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const load = async () => {
    try {
      const { rows } = await listResource(api, 'neoai_memories', { sort: '-id', pageSize: 500 });
      setRows(rows);
    } catch (err: any) {
      message.error(`Load failed: ${err?.message ?? err}`);
    }
  };
  usePoll(load, 15_000, openId == null);

  const filteredRows = useMemo(() => {
    const et = entityType.trim().toLowerCase();
    const ei = entityId.trim().toLowerCase();
    return rows.filter((r) => {
      if (et && !String(r.entity_type ?? '').toLowerCase().includes(et)) return false;
      if (ei && !String(r.entity_id ?? '').toLowerCase().includes(ei)) return false;
      return true;
    });
  }, [rows, entityType, entityId]);

  const openRow = rows.find((r) => r.id === openId) ?? null;
  const confirmedSibling =
    openRow && String(openRow.key ?? '').endsWith(PENDING_SUFFIX)
      ? rows.find(
          (r) => r.entity_type === openRow.entity_type && r.entity_id === openRow.entity_id && r.key === baseKeyOf(openRow.key) && r.status === 'confirmed',
        ) ?? null
      : null;

  const columns = [
    { title: 'Entity type', dataIndex: 'entity_type', width: 180, render: (v: string) => <code style={{ fontSize: 12 }}>{v}</code> },
    { title: 'Entity id', dataIndex: 'entity_id', width: 140, render: (v: string) => <code style={{ fontSize: 12 }}>{v}</code> },
    {
      title: 'Key',
      dataIndex: 'key',
      width: 160,
      render: (v: string) => (String(v).endsWith(PENDING_SUFFIX) ? <span>{baseKeyOf(v)} <Tag color="gold">pending</Tag></span> : v),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (v: string, r: any) =>
        String(r.key ?? '').endsWith(PENDING_SUFFIX) ? (
          <Tag color="gold">awaiting review</Tag>
        ) : (
          <Tag color={v === 'confirmed' ? 'green' : 'default'}>{v}</Tag>
        ),
    },
    { title: 'Summary', dataIndex: 'summary', render: (v: string) => <span style={{ color: '#3c4043' }}>{(v ?? '').slice(0, 140)}{(v ?? '').length > 140 ? '…' : ''}</span> },
    { title: 'Updated by', dataIndex: 'updated_by', width: 160 },
    { title: 'Confirmed at', dataIndex: 'confirmed_at', width: 150, render: (v: string) => fmtTime(v) },
    {
      title: '',
      key: 'act',
      width: 90,
      render: (_: any, r: any) => (
        <Button size="small" onClick={() => setOpenId(r.id)}>
          Open
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Memory</div>
        <div style={{ flex: 1 }} />
        <Input placeholder="Filter entity type (e.g. crm.deal)" value={entityType} onChange={(e) => setEntityType(e.target.value)} style={{ width: 220 }} allowClear />
        <Input placeholder="Filter entity id" value={entityId} onChange={(e) => setEntityId(e.target.value)} style={{ width: 160 }} allowClear />
        <Button onClick={load}>Refresh</Button>
      </div>
      <p style={{ fontSize: 12.5, color: '#8a8f8a', margin: '0 0 12px', maxWidth: 820 }}>
        Central, entity-agnostic AI memory: host plugins (CRM, Konfigurator, …) write a draft summary about one of their
        records here; nothing feeds back into that record until a human opens it and confirms. Once confirmed, a later
        AI re-draft never overwrites it directly — it stages as a "pending" row you review and swap in explicitly.
      </p>
      <Table
        rowKey="id"
        size="middle"
        dataSource={filteredRows}
        columns={columns as any}
        pagination={{ pageSize: 25 }}
        locale={{ emptyText: rows.length ? 'No memory rows match this filter' : 'No memory rows yet' }}
        onRow={(r) => ({ onClick: () => setOpenId(r.id), style: { cursor: 'pointer' } })}
      />
      {openRow ? (
        <MemoryDetail
          row={openRow}
          confirmedSibling={confirmedSibling}
          onClose={() => setOpenId(null)}
          onSaved={load}
        />
      ) : null}
    </div>
  );
}
