// src/client/console/NeoaiConsole.tsx
// -----------------------------------------------------------------------------
// The NeoAI console shell: brand sidebar (Konfigurator ConsoleShell look) with
// the three areas (AI Workflows / Runs / Settings) plus cross-links to
// NocoBase's own workflow admin ("Automation", scoping Q2/Q9) and the admin
// home. One component serves every sub-path — the active tab is derived from
// the pathname (CatalogPage pattern), navigation is plain href assignment.

import React, { useEffect, useState } from 'react';
import { Alert, ConfigProvider } from 'antd';
import { Icon, useAPIClient } from '@nocobase/client';
import { NEOHOME_GREEN, NEOHOME_THEME, ensureInterFont } from '../theme';
import { NEOMODUL_FAVICON_SRC } from '../logo';
import { ConsoleAccessGate, neoaiAction, usePoll } from './shared';
import { WorkflowsPanel } from './WorkflowsPanel';
import { RunsPanel } from './RunsPanel';
import { ApprovalsPanel } from './ApprovalsPanel';
import { FunctionsPanel } from './FunctionsPanel';
import { McpServersPanel } from './McpServersPanel';
import { SettingsPanel } from './SettingsPanel';
import { MemoryPanel } from './MemoryPanel';

const TABS: Array<{ key: string; label: string; icon: string }> = [
  { key: 'workflows', label: 'AI Workflows', icon: 'PartitionOutlined' },
  { key: 'runs', label: 'Runs', icon: 'PlayCircleOutlined' },
  { key: 'approvals', label: 'Approvals', icon: 'CheckSquareOutlined' },
  { key: 'functions', label: 'Functions', icon: 'ApiOutlined' },
  { key: 'mcp', label: 'MCP Servers', icon: 'CloudServerOutlined' },
  { key: 'memory', label: 'Memory', icon: 'DatabaseOutlined' },
  { key: 'settings', label: 'Settings', icon: 'SettingOutlined' },
];

/** Proactive spend alert (item 15) — forward-looking; the hard block is still checkBudget's job. */
function SpendAlertBanner() {
  const api = useAPIClient();
  const [pct, setPct] = useState<number | null>(null);
  const [alertPct, setAlertPct] = useState(80);
  usePoll(
    async () => {
      try {
        const [settings, spend] = await Promise.all([neoaiAction(api, 'getSettings', {}), neoaiAction(api, 'spendToday', {})]);
        setAlertPct(Number(settings?.spend_alert_pct) || 80);
        const budget = Number(settings?.daily_budget_usd) || 0;
        if (!budget) {
          setPct(null);
          return;
        }
        setPct((Number(spend?.global) || 0) / budget * 100);
      } catch {
        /* best-effort */
      }
    },
    60_000,
    true,
  );
  if (pct == null || pct < alertPct) return null;
  return (
    <Alert
      type={pct >= 100 ? 'error' : 'warning'}
      showIcon
      banner
      message={
        pct >= 100
          ? `Global daily budget exhausted (${pct.toFixed(0)}% of budget) — further model calls are blocked.`
          : `Global spend today has crossed ${pct.toFixed(0)}% of the daily budget.`
      }
    />
  );
}

const CROSS_LINKS: Array<{ label: string; icon: string; href: string; hint?: string }> = [
  // NocoBase plugin-workflow admin — the business-automation layer stays there,
  // but is reachable from the NeoAI menu (one automation hub).
  { label: 'Automation', icon: 'DeploymentUnitOutlined', href: '/admin/settings/workflow', hint: 'NocoBase workflows' },
  { label: 'Admin', icon: 'HomeOutlined', href: '/admin' },
];

function activeTabFromPath(pathname: string): string {
  const m = pathname.match(/neoai\/?([a-z-]*)/i);
  const key = (m?.[1] ?? '').toLowerCase();
  return TABS.some((t) => t.key === key) ? key : 'workflows';
}

function SideItem(props: { icon: string; label: string; active?: boolean; onClick: () => void; muted?: boolean }) {
  return (
    <div
      onClick={props.onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 9,
        cursor: 'pointer',
        fontWeight: props.active ? 600 : 500,
        color: props.active ? NEOHOME_GREEN : props.muted ? '#8a8f8a' : '#3c4043',
        background: props.active ? '#eaf7ea' : 'transparent',
        fontSize: 13.5,
        userSelect: 'none',
      }}
    >
      <Icon type={props.icon as any} />
      <span>{props.label}</span>
    </div>
  );
}

/**
 * The console proper. Only ever mounted behind `ConsoleAccessGate` — see `NeoaiConsolePage` below
 * and the long note in `shared.tsx`. Keeping the gate OUTSIDE this component is what guarantees
 * that a refused caller fires no panel request at all: `SpendAlertBanner` and all seven panels are
 * children of this function, so if it never runs, none of them poll.
 */
function NeoaiConsoleBody() {
  useEffect(() => {
    ensureInterFont();
  }, []);
  const pathname = window.location.pathname;
  const embedded = pathname.startsWith('/admin');
  const prefix = embedded ? '/admin' : '';
  const active = activeTabFromPath(pathname);
  const go = (href: string) => window.location.assign(href);

  return (
    <ConfigProvider theme={NEOHOME_THEME as any} getPopupContainer={(n) => (n?.parentElement as HTMLElement) ?? document.body}>
      <div
        style={{
          display: 'flex',
          height: embedded ? 'calc(100vh - 46px)' : '100vh',
          background: '#fff',
          fontFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
          color: '#1b1e21',
        }}
      >
        <aside
          style={{
            width: 216,
            borderRight: '1px solid #ececea',
            padding: '14px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '2px 8px 12px' }}>
            <img src={NEOMODUL_FAVICON_SRC} alt="Neomodul" style={{ width: 26, height: 26, borderRadius: 7 }} />
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-.01em' }}>NeoAI</span>
          </div>
          {TABS.map((t) => (
            <SideItem key={t.key} icon={t.icon} label={t.label} active={active === t.key} onClick={() => go(`${prefix}/neoai/${t.key}`)} />
          ))}
          <div style={{ borderTop: '1px solid #ececea', margin: '10px 4px' }} />
          {CROSS_LINKS.map((l) => (
            <SideItem key={l.href} icon={l.icon} label={l.label} muted onClick={() => go(l.href)} />
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 10.5, color: '#b0b4ba', padding: '0 8px 4px' }}>Admin-only · tree workflows · Gemini via plugin-ai</div>
        </aside>
        <main style={{ flex: 1, overflow: 'auto', minWidth: 0, background: '#fff' }}>
          <SpendAlertBanner />
          {active === 'workflows' ? <WorkflowsPanel /> : null}
          {active === 'runs' ? <RunsPanel /> : null}
          {active === 'approvals' ? <ApprovalsPanel /> : null}
          {active === 'functions' ? <FunctionsPanel /> : null}
          {active === 'mcp' ? <McpServersPanel /> : null}
          {active === 'memory' ? <MemoryPanel /> : null}
          {active === 'settings' ? <SettingsPanel /> : null}
        </main>
      </div>
    </ConfigProvider>
  );
}

/**
 * What the router mounts. One access question, asked once, before anything else happens.
 *
 * Tickets b4f8730e (the console opened for every logged-in user) and 7466a838 (a 403 read as a
 * permanent "Loading…"). Both are answered here rather than eight times over in the panels.
 */
export function NeoaiConsolePage() {
  return (
    <ConsoleAccessGate area="The NeoAI console">
      <NeoaiConsoleBody />
    </ConsoleAccessGate>
  );
}
