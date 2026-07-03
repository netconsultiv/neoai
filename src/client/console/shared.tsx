// src/client/console/shared.tsx
// -----------------------------------------------------------------------------
// Shared console helpers: NocoBase API wrappers (response-envelope aware),
// polling hook, status tags, the full-screen ConsoleDrawer (CRM pattern:
// plain fixed overlay — antd portal drawers misbehave in console routes) and
// small formatters. English UI (owner decision).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Tag } from 'antd';

export const PAGE_BG = '#f5f5f5';

// --- API ---------------------------------------------------------------------

/** POST a custom neoai action; returns response.data.data (NocoBase envelope). */
export async function neoaiAction(api: any, action: string, values: any = {}) {
  const res = await api.request({ url: `neoai:${action}`, method: 'post', data: values });
  return res?.data?.data ?? res?.data ?? {};
}

/** List a collection resource; returns { rows, meta }. */
export async function listResource(api: any, collection: string, params: any = {}) {
  const res = await api.request({ url: `${collection}:list`, method: 'get', params });
  return { rows: res?.data?.data ?? [], meta: res?.data?.meta ?? {} };
}

export async function updateResource(api: any, collection: string, filterByTk: any, values: any) {
  const res = await api.request({ url: `${collection}:update`, method: 'post', params: { filterByTk }, data: values });
  return res?.data?.data ?? {};
}

export async function createResource(api: any, collection: string, values: any) {
  const res = await api.request({ url: `${collection}:create`, method: 'post', data: values });
  return res?.data?.data ?? {};
}

// --- hooks ---------------------------------------------------------------------

/** Poll `fn` every `ms` while `active`; also fires immediately on activation. */
export function usePoll(fn: () => void | Promise<void>, ms: number, active: boolean) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (!active) return;
    let stop = false;
    const tick = () => {
      if (!stop) void fnRef.current();
    };
    tick();
    const t = setInterval(tick, ms);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [ms, active]);
}

// --- status/format -------------------------------------------------------------

const RUN_COLORS: Record<string, string> = {
  queued: 'default',
  running: 'processing',
  waiting: 'gold',
  succeeded: 'green',
  failed: 'red',
  cancelled: 'default',
  rejected: 'volcano',
  done: 'green',
  skipped: 'default',
};

export function StatusTag({ status }: { status?: string }) {
  const s = String(status ?? '');
  return <Tag color={RUN_COLORS[s] ?? 'default'}>{s || '—'}</Tag>;
}

export function fmtCost(usd?: number) {
  const n = Number(usd) || 0;
  if (!n) return '—';
  return `$${n < 0.01 ? n.toFixed(4) : n.toFixed(2)}`;
}

export function fmtTokens(inTok?: number, outTok?: number) {
  const i = Number(inTok) || 0;
  const o = Number(outTok) || 0;
  if (!i && !o) return '—';
  return `${i.toLocaleString('en-US')} → ${o.toLocaleString('en-US')}`;
}

export function fmtDuration(ms?: number) {
  const n = Number(ms) || 0;
  if (!n) return '—';
  if (n < 1000) return `${n} ms`;
  if (n < 60_000) return `${(n / 1000).toFixed(1)} s`;
  return `${Math.floor(n / 60000)}m ${Math.round((n % 60000) / 1000)}s`;
}

export function fmtTime(v?: string | Date) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function runDuration(run: any) {
  const s = run?.started_at ? new Date(run.started_at).getTime() : 0;
  const e = run?.finished_at ? new Date(run.finished_at).getTime() : Date.now();
  return s ? fmtDuration(e - s) : '—';
}

// --- JSON viewer -----------------------------------------------------------------

export function JsonBox({ value, maxHeight = 240 }: { value: any; maxHeight?: number }) {
  let text: string;
  try {
    text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  } catch {
    text = String(value);
  }
  return (
    <pre
      style={{
        margin: 0,
        padding: '8px 10px',
        background: '#fafaf8',
        border: '1px solid #ececea',
        borderRadius: 8,
        fontSize: 12,
        lineHeight: 1.5,
        maxHeight,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {text ?? '—'}
    </pre>
  );
}

// --- full-screen drawer (CRM ConsoleDrawer pattern) ------------------------------

export function ConsoleDrawer(props: {
  open: boolean;
  title: React.ReactNode;
  extra?: React.ReactNode;
  onClose: () => void;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { open, title, extra, onClose, children, footer } = props;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 20px',
          borderBottom: '1px solid #ececea',
          background: '#fff',
        }}
      >
        <a onClick={onClose} style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
          ← Back
        </a>
        <div style={{ fontSize: 16, fontWeight: 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{extra}</div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', background: PAGE_BG }}>{children}</div>
      {footer ? <div style={{ borderTop: '1px solid #ececea', padding: '10px 20px', background: '#fff' }}>{footer}</div> : null}
    </div>
  );
}

export function useForceUpdate() {
  const [, setN] = useState(0);
  return useCallback(() => setN((n) => n + 1), []);
}
