// src/server/lib/cost.ts
// -----------------------------------------------------------------------------
// Own cost management (owner decision, scoping Q14): every model call is
// tracked per step from usage metadata and summed per run + per calendar day;
// budgets and prices are CONFIGURABLE in neoai_settings ("müssen wir testen").
// Prices are ESTIMATES (USD per 1M tokens) — they only drive budgets/labels,
// never billing. Pure module — unit-tested directly.

export type Usage = { inputTokens?: number; outputTokens?: number };
export type PriceEntry = { in: number; out: number }; // USD per 1M tokens
export type PriceTable = Record<string, PriceEntry>;

// Defaults as of 2026-07 (paid tier, google list prices) — overridable via
// neoai_settings.prices. Keys are matched by longest prefix so versioned
// model ids ("gemini-2.5-flash-preview-…") still hit.
export const DEFAULT_PRICES: PriceTable = {
  'gemini-2.5-flash': { in: 0.3, out: 2.5 },
  'gemini-2.5-pro': { in: 1.25, out: 10 },
  'gemini-3.0-pro': { in: 2, out: 12 },
  'gemini-2.0-flash': { in: 0.1, out: 0.4 },
};

/** Flat per-image estimate (USD) for image-generation nodes; settings-overridable. */
export const DEFAULT_IMAGE_PRICE_USD = 0.04;

export function priceFor(model: string, prices: PriceTable = DEFAULT_PRICES): PriceEntry | null {
  const m = String(model ?? '').toLowerCase();
  let best: { key: string; entry: PriceEntry } | null = null;
  for (const [key, entry] of Object.entries(prices)) {
    if (m.startsWith(key.toLowerCase()) && (!best || key.length > best.key.length)) {
      best = { key, entry };
    }
  }
  return best?.entry ?? null;
}

export function costOf(model: string, usage: Usage | undefined, prices?: PriceTable): number {
  if (!usage) return 0;
  const p = priceFor(model, prices ?? DEFAULT_PRICES);
  if (!p) return 0;
  const inTok = Math.max(0, usage.inputTokens ?? 0);
  const outTok = Math.max(0, usage.outputTokens ?? 0);
  return (inTok / 1_000_000) * p.in + (outTok / 1_000_000) * p.out;
}

export type BudgetCheck = { ok: boolean; reason?: string };

/**
 * Enforce the configurable daily budgets BEFORE a model call is made.
 * spentTodayUsd = global spend today, workflowSpentTodayUsd = this workflow's.
 * A limit of null/0/undefined means "no limit".
 */
export function checkBudget(opts: {
  spentTodayUsd: number;
  workflowSpentTodayUsd: number;
  globalDailyBudgetUsd?: number | null;
  workflowDailyBudgetUsd?: number | null;
}): BudgetCheck {
  const g = opts.globalDailyBudgetUsd ?? 0;
  if (g > 0 && opts.spentTodayUsd >= g) {
    return { ok: false, reason: `global daily budget exhausted (${opts.spentTodayUsd.toFixed(2)} / ${g} USD)` };
  }
  const w = opts.workflowDailyBudgetUsd ?? 0;
  if (w > 0 && opts.workflowSpentTodayUsd >= w) {
    return { ok: false, reason: `workflow daily budget exhausted (${opts.workflowSpentTodayUsd.toFixed(2)} / ${w} USD)` };
  }
  return { ok: true };
}
