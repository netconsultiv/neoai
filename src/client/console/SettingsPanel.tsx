// src/client/console/SettingsPanel.tsx
// -----------------------------------------------------------------------------
// NeoAI settings: model defaults, cost management knobs (owner: configurable
// budgets/prices — "müssen wir testen"), Gemini fallback key (write-only) and
// a plugin health card (ping).

import React, { useState } from 'react';
import { Button, Input, InputNumber, Modal, Switch, Table, Tag, message, Space } from 'antd';
import { useAPIClient } from '@nocobase/client';
import { JsonBox, neoaiAction, usePoll } from './shared';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 14, maxWidth: 560 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#8a8f8a', marginBottom: 4 }}>
        {label}
      </div>
      {children}
      {hint ? <div style={{ fontSize: 12, color: '#8a8f8a', marginTop: 4 }}>{hint}</div> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #ececea', borderRadius: 10, padding: '16px 18px', marginBottom: 16, maxWidth: 620 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#191a19', marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

/** Plain CSS-bar sparkline — no charting library exists in this codebase; keep it that way for one panel. */
function Sparkline({ data }: { data: Array<{ label: string; value: number }> }) {
  const max = Math.max(1e-9, ...data.map((d) => d.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
      {data.map((d) => (
        <div key={d.label} title={`${d.label}: $${d.value.toFixed(2)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', height: Math.max(2, (d.value / max) * 52), background: '#009900', borderRadius: '2px 2px 0 0' }} />
        </div>
      ))}
    </div>
  );
}

/**
 * Encrypted secrets vault (item 13) — sub-section, not a new top-level tab.
 * The list only ever shows name + "configured"; values are write-only
 * (Input.Password), matching the gemini_api_key precedent but with real
 * AES-256-GCM encryption underneath (src/server/lib/secrets.ts) instead of
 * masking-only.
 */
function SecretsSection() {
  const api = useAPIClient();
  const [rows, setRows] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await neoaiAction(api, 'secretsList', {});
      setRows(res.rows ?? []);
    } catch (err: any) {
      message.error(`Load failed: ${err?.message ?? err}`);
    }
  };
  usePoll(load, 3_600_000, true);

  const save = async () => {
    if (!name.trim() || !value) {
      message.error('Name and value are required');
      return;
    }
    setBusy(true);
    try {
      await neoaiAction(api, 'secretsSave', { name: name.trim(), value });
      setName('');
      setValue('');
      message.success('Secret saved');
      await load();
    } catch (err: any) {
      message.error(`Save failed: ${err?.message ?? err}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = (row: any) => {
    Modal.confirm({
      title: `Delete secret "${row.name}"?`,
      content: 'Any MCP server or workflow referencing this secret will lose its auth value.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        await neoaiAction(api, 'secretsDelete', { id: row.id });
        message.success('Secret deleted');
        await load();
      },
    });
  };

  return (
    <Section title="Secrets vault">
      <p style={{ fontSize: 12.5, color: '#8a8f8a', margin: '0 0 12px', maxWidth: 560 }}>
        Encrypted at rest (AES-256-GCM, key derived from APP_KEY) — used via <code>{'{{secrets.name}}'}</code> in workflow
        templates, and by MCP servers as an auth-header value. Values are write-only: this list never shows a decrypted or
        even encrypted value, only whether one is configured.
      </p>
      <Table
        rowKey="id"
        size="small"
        dataSource={rows}
        pagination={false}
        style={{ marginBottom: 14 }}
        columns={[
          { title: 'Name', dataIndex: 'name', render: (v: string) => <code>{v}</code> },
          { title: 'Status', dataIndex: 'configured', width: 120, render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'configured' : 'empty'}</Tag> },
          {
            title: '',
            key: 'act',
            width: 90,
            render: (_: any, r: any) => (
              <Button size="small" danger onClick={() => remove(r)}>
                Delete
              </Button>
            ),
          },
        ]}
      />
      <Space.Compact style={{ width: '100%', maxWidth: 560 }}>
        <Input placeholder="name (e.g. jira_api_key)" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '35%' }} />
        <Input.Password placeholder="value" value={value} onChange={(e) => setValue(e.target.value)} style={{ width: '45%' }} />
        <Button type="primary" loading={busy} onClick={save} style={{ width: '20%' }}>
          Save
        </Button>
      </Space.Compact>
    </Section>
  );
}

export function SettingsPanel() {
  const api = useAPIClient();
  const [s, setS] = useState<any>(null);
  const [key, setKey] = useState('');
  const [pricesText, setPricesText] = useState('');
  const [ping, setPing] = useState<any>(null);
  const [spend, setSpend] = useState<any>(null);
  const [trend, setTrend] = useState<any>(null);

  usePoll(
    async () => {
      try {
        const got = await neoaiAction(api, 'getSettings', {});
        setS((prev: any) => prev ?? got);
        setPricesText((prev) => (prev ? prev : got.prices ? JSON.stringify(got.prices, null, 2) : ''));
        setPing(await neoaiAction(api, 'ping', {}));
        setSpend(await neoaiAction(api, 'spendToday', {}));
        setTrend(await neoaiAction(api, 'spendTrend', {}));
      } catch (err: any) {
        message.error(`Load failed: ${err?.message ?? err}`);
      }
    },
    3_600_000,
    s == null,
  );

  if (!s) return <div style={{ padding: 20 }}>Loading…</div>;

  const save = async () => {
    let prices: any;
    if (pricesText.trim()) {
      try {
        prices = JSON.parse(pricesText);
      } catch {
        message.error('Price table is not valid JSON');
        return;
      }
    }
    try {
      await neoaiAction(api, 'saveSettings', {
        force_mock: s.force_mock === true,
        default_llm_service: s.default_llm_service ?? '',
        default_model: s.default_model ?? 'gemini-2.5-flash',
        daily_budget_usd: Number(s.daily_budget_usd) || 0,
        image_price_usd: Number(s.image_price_usd) || 0.04,
        spend_alert_pct: Number(s.spend_alert_pct) || 80,
        ...(prices !== undefined ? { prices } : {}),
        ...(key ? { gemini_api_key: key } : {}),
      });
      setKey('');
      message.success('Settings saved');
    } catch (err: any) {
      message.error(`Save failed: ${err?.message ?? err}`);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Settings</div>

      <Section title="Mode">
        <Field
          label="Force mock mode"
          hint="ON: every LLM/image node returns a labelled deterministic mock — zero spend, even though a real key is configured. For test rounds; turn OFF for real model calls."
        >
          <Switch checked={s.force_mock === true} onChange={(v) => setS({ ...s, force_mock: v })} />
          {s.force_mock === true ? <Tag color="orange" style={{ marginLeft: 10 }}>mock mode active</Tag> : null}
        </Field>
      </Section>

      <Section title="Model & provider">
        <Field label="Default plugin-ai LLM service" hint="Name of an llmService configured under Settings → AI. Empty = plugin-ai default / raw Gemini fallback.">
          <Input value={s.default_llm_service} onChange={(e) => setS({ ...s, default_llm_service: e.target.value })} />
        </Field>
        <Field label="Default model">
          <Input value={s.default_model} placeholder="gemini-2.5-flash" onChange={(e) => setS({ ...s, default_model: e.target.value })} />
        </Field>
        <Field
          label="Gemini API key (raw-path fallback + image nodes)"
          hint={
            s.geminiKeyFromEnv
              ? 'GEMINI_API_KEY env var is set and wins — this field is a fallback.'
              : s.geminiKeyConfigured
                ? 'A key is configured. Leave empty to keep it; enter a new value to replace.'
                : 'No key configured yet.'
          }
        >
          <Input.Password value={key} placeholder={s.geminiKeyConfigured ? '••••••••  (configured)' : 'AIza…'} onChange={(e) => setKey(e.target.value)} />
        </Field>
      </Section>

      <Section title="Cost management">
        <Field label="Global daily budget (USD, 0 = unlimited)" hint="Blocks further model calls once today's estimated spend across ALL workflows exceeds this.">
          <InputNumber min={0} step={0.5} value={Number(s.daily_budget_usd) || 0} onChange={(v) => setS({ ...s, daily_budget_usd: v ?? 0 })} />
        </Field>
        <Field label="Estimated price per generated image (USD)">
          <InputNumber min={0} step={0.01} value={Number(s.image_price_usd) || 0.04} onChange={(v) => setS({ ...s, image_price_usd: v ?? 0.04 })} />
        </Field>
        <Field label="Price table override (JSON, USD per 1M tokens)" hint='Example: { "gemini-2.5-flash": { "in": 0.3, "out": 2.5 } }'>
          <Input.TextArea
            rows={5}
            value={pricesText}
            onChange={(e) => setPricesText(e.target.value)}
            style={{ fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12 }}
          />
        </Field>
        <Field label="Proactive spend alert threshold (% of daily budget)" hint="Shows a warning banner in the console once today's global spend crosses this — the hard block still only ever fires at 100% via the budget itself.">
          <InputNumber min={1} max={100} value={Number(s.spend_alert_pct) || 80} onChange={(v) => setS({ ...s, spend_alert_pct: v ?? 80 })} />
        </Field>
      </Section>

      <Button type="primary" onClick={save}>
        Save settings
      </Button>

      <div style={{ borderTop: '1px solid #ececea', margin: '24px 0 16px', maxWidth: 620 }} />
      <SecretsSection />

      <div style={{ borderTop: '1px solid #ececea', margin: '24px 0 16px', maxWidth: 620 }} />
      <Section title="Plugin health">
        {ping ? (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: spend ? 14 : 0 }}>
            <Tag color="green">
              {ping.plugin} v{ping.version}
            </Tag>
            <Tag color={ping.pluginAi ? 'green' : 'orange'}>{ping.pluginAi ? 'plugin-ai available' : 'plugin-ai NOT available (raw Gemini fallback)'}</Tag>
            {ping.sandbox ? <Tag color="orange">sandbox</Tag> : null}
            <Tag>{(ping.collections ?? []).length} collections</Tag>
          </div>
        ) : null}
        {spend ? (
          <div>
            <div style={{ fontSize: 12, color: '#8a8f8a', marginBottom: 4 }}>Spend today (estimated)</div>
            <JsonBox value={spend} maxHeight={140} />
          </div>
        ) : null}
      </Section>

      <Section title="Spend trend (last 30 days)">
        {trend ? (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#8a8f8a', marginBottom: 6 }}>
              By day
            </div>
            <Sparkline
              data={Object.entries(trend.byDay ?? {})
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([day, v]) => ({ label: day, value: Number(v) }))}
            />
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#8a8f8a', margin: '16px 0 6px' }}>
              Top workflows
            </div>
            {(trend.byWorkflow ?? []).length === 0 ? (
              <div style={{ fontSize: 12.5, color: '#8a8f8a' }}>No spend recorded yet.</div>
            ) : (
              (trend.byWorkflow ?? []).slice(0, 8).map((w: any) => (
                <div key={w.workflowId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0' }}>
                  <span>{w.name}</span>
                  <b>${w.totalUsd.toFixed(2)}</b>
                </div>
              ))
            )}
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: '#8a8f8a', margin: '16px 0 6px' }}>
              Top functions
            </div>
            {(trend.byFunction ?? []).length === 0 ? (
              <div style={{ fontSize: 12.5, color: '#8a8f8a' }}>No spend recorded yet.</div>
            ) : (
              (trend.byFunction ?? []).slice(0, 8).map((f: any) => (
                <div key={f.functionKey} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '3px 0' }}>
                  <code>{f.functionKey}</code>
                  <b>${f.totalUsd.toFixed(2)}</b>
                </div>
              ))
            )}
          </>
        ) : null}
      </Section>
    </div>
  );
}
