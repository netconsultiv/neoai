// src/client/console/SettingsPanel.tsx
// -----------------------------------------------------------------------------
// NeoAI settings: model defaults, cost management knobs (owner: configurable
// budgets/prices — "müssen wir testen"), Gemini fallback key (write-only) and
// a plugin health card (ping).

import React, { useState } from 'react';
import { Button, Input, InputNumber, Switch, Tag, message } from 'antd';
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

export function SettingsPanel() {
  const api = useAPIClient();
  const [s, setS] = useState<any>(null);
  const [key, setKey] = useState('');
  const [pricesText, setPricesText] = useState('');
  const [ping, setPing] = useState<any>(null);
  const [spend, setSpend] = useState<any>(null);

  usePoll(
    async () => {
      try {
        const got = await neoaiAction(api, 'getSettings', {});
        setS((prev: any) => prev ?? got);
        setPricesText((prev) => (prev ? prev : got.prices ? JSON.stringify(got.prices, null, 2) : ''));
        setPing(await neoaiAction(api, 'ping', {}));
        setSpend(await neoaiAction(api, 'spendToday', {}));
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
      </Section>

      <Button type="primary" onClick={save}>
        Save settings
      </Button>

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
    </div>
  );
}
