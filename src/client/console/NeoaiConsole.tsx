// src/client/console/NeoaiConsole.tsx
// -----------------------------------------------------------------------------
// The NeoAI console: the CRM navigation pattern (NEOB-7/NEOB-13) — an adaptive
// bottom bar as the single console navigation on every viewport, Priority+
// overflow into a "Mehr" sheet, cross-links (Automation / Admin) and Settings
// living in that sheet. One component serves every sub-path; the active area is
// derived from the pathname and navigation is plain route assignment, so every
// registered /neoai/<key> route keeps working (deep links, back button).
//
// The former fixed left sidebar was replaced here: the bottom bar (shell.tsx)
// is the sole navigation, themed centrally via the @neomodul/branding `--nm-*`
// contract with a graceful default when branding is absent.

import React, { useEffect, useState } from 'react';
import { Alert, ConfigProvider } from 'antd';
import { useAPIClient } from '@nocobase/client';
import { NEOHOME_THEME, ensureInterFont } from '../theme';
import { ConsoleAccessGate, neoaiAction, usePoll } from './shared';
import { ConsoleShell, NavItem, CrossLink } from './shell';
import { WorkflowsPanel } from './WorkflowsPanel';
import { RunsPanel } from './RunsPanel';
import { ApprovalsPanel } from './ApprovalsPanel';
import { FunctionsPanel } from './FunctionsPanel';
import { McpServersPanel } from './McpServersPanel';
import { SettingsPanel } from './SettingsPanel';
import { MemoryPanel } from './MemoryPanel';

// ONE logical order (NEOB-13 product decision), by click-frequency + sachliche
// Gruppen, following the CRM's logic:
//   · Daily operations (highest frequency): AI Workflows, Runs, Approvals
//   · Capabilities the workflows reference:  Functions, MCP Servers, Memory
//   · Config (lowest, always last):          Settings
// Settings stays LAST so it is the last bar slot and the first area to fall into
// "Mehr" as the viewport narrows — the CRM's settings-handling rule.
const TABS: Array<{ key: string; label: string; icon: string }> = [
  { key: 'workflows', label: 'AI Workflows', icon: 'PartitionOutlined' },
  { key: 'runs', label: 'Runs', icon: 'PlayCircleOutlined' },
  { key: 'approvals', label: 'Approvals', icon: 'CheckSquareOutlined' },
  { key: 'functions', label: 'Functions', icon: 'ApiOutlined' },
  { key: 'mcp', label: 'MCP Servers', icon: 'CloudServerOutlined' },
  { key: 'memory', label: 'Memory', icon: 'DatabaseOutlined' },
  { key: 'settings', label: 'Settings', icon: 'SettingOutlined' },
];

// The leading (highest-priority) slots — the daily-operations trio. This only
// signals the bar opt-in and the count shown before the first width measurement;
// the bar then adapts its slot count to the real width. See shell.tsx.
const BOTTOM_KEYS = ['workflows', 'runs', 'approvals'];

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

// Cross-links leave the NeoAI console; they live only in the "Mehr" sheet,
// mirroring the CRM's cross-console entries (never a primary bar slot).
const CROSS_LINKS: CrossLink[] = [
  // NocoBase plugin-workflow admin — the business-automation layer stays there,
  // but is reachable from the NeoAI navigation (one automation hub).
  { label: 'Automation', icon: 'DeploymentUnitOutlined', href: '/admin/settings/workflow' },
  { label: 'Admin', icon: 'HomeOutlined', href: '/admin' },
];

function activeTabFromPath(pathname: string): string {
  const m = pathname.match(/neoai\/?([a-z-]*)/i);
  const key = (m?.[1] ?? '').toLowerCase();
  return TABS.some((t) => t.key === key) ? key : 'workflows';
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

  const items: NavItem[] = TABS.map((t) => ({ key: t.key, label: t.label, icon: t.icon }));
  // Area keys navigate to their /neoai/<key> route; cross-links carry an
  // absolute href and are dispatched by the shell directly.
  const onSelect = (key: string) => go(`${prefix}/neoai/${key}`);

  return (
    <ConfigProvider theme={NEOHOME_THEME as any} getPopupContainer={(n) => (n?.parentElement as HTMLElement) ?? document.body}>
      <div style={{ fontFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif", color: '#1b1e21' }}>
        <ConsoleShell
          items={items}
          bottomKeys={BOTTOM_KEYS}
          crossLinks={CROSS_LINKS}
          activeKey={active}
          onSelect={onSelect}
          banner={<SpendAlertBanner />}
        >
          {active === 'workflows' ? <WorkflowsPanel /> : null}
          {active === 'runs' ? <RunsPanel /> : null}
          {active === 'approvals' ? <ApprovalsPanel /> : null}
          {active === 'functions' ? <FunctionsPanel /> : null}
          {active === 'mcp' ? <McpServersPanel /> : null}
          {active === 'memory' ? <MemoryPanel /> : null}
          {active === 'settings' ? <SettingsPanel /> : null}
        </ConsoleShell>
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
