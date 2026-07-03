// src/server/lib/mock.ts
// -----------------------------------------------------------------------------
// Deterministic sandbox mocks (NEOAI_SANDBOX=1 only — the env flag ALONE gates
// them, never DB state). Same philosophy as the Konfigurator's assistMock and
// CRM's MockLLMProvider: E2E flows must be walkable end-to-end without a real
// key or spend, and every mock output is UNMISSABLY labelled as such.
// Pure module — unit-tested directly.

export const MOCK_LABEL = '⚠︎ MOCK (NEOAI_SANDBOX) — no real model call';

/**
 * Produce a minimal object that plausibly satisfies a JSON schema: strings get
 * a labelled placeholder, arrays one element, enums their first value. Good
 * enough for wiring/E2E tests — never for content quality.
 */
export function mockFromSchema(schema: any, propName = ''): any {
  if (!schema || typeof schema !== 'object') return `MOCK ${propName}`.trim();
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  switch (type) {
    case 'object': {
      const out: Record<string, any> = {};
      for (const [k, sub] of Object.entries(schema.properties ?? {})) out[k] = mockFromSchema(sub, k);
      return out;
    }
    case 'array':
      return [mockFromSchema(schema.items, propName)];
    case 'number':
    case 'integer':
      return 1;
    case 'boolean':
      return true;
    case 'string':
    default:
      return `MOCK ${propName || 'value'}`;
  }
}

export function mockLlmText(prompt: string): string {
  const head = String(prompt ?? '').replace(/\s+/g, ' ').slice(0, 160);
  return `${MOCK_LABEL}\nEcho of prompt head: "${head}"`;
}

/** Rough deterministic usage numbers so cost tracking is exercised too. */
export function mockUsage(prompt: string): { inputTokens: number; outputTokens: number } {
  return { inputTokens: Math.max(1, Math.ceil(String(prompt ?? '').length / 4)), outputTokens: 64 };
}

// 1×1 Neomodul-green PNG.
export const MOCK_IMAGE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADgQF/e5IkGQAAAABJRU5ErkJggg==';
