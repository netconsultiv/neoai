import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockFromSchema, mockLlmText, mockUsage, MOCK_LABEL, MOCK_IMAGE_DATA_URL } from '../src/server/lib/mock.ts';

test('mockFromSchema fills objects/arrays/enums/numbers', () => {
  const schema = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      count: { type: 'integer' },
      ok: { type: 'boolean' },
      severity: { enum: ['info', 'warn'] },
      constraints: {
        type: 'array',
        items: { type: 'object', properties: { title: { type: 'string' }, kind: { type: 'string' } } },
      },
    },
  };
  const m = mockFromSchema(schema);
  assert.equal(typeof m.summary, 'string');
  assert.ok(m.summary.startsWith('MOCK'));
  assert.equal(m.count, 1);
  assert.equal(m.ok, true);
  assert.equal(m.severity, 'info');
  assert.equal(m.constraints.length, 1);
  assert.ok(m.constraints[0].title.startsWith('MOCK'));
});

test('mock text is labelled and deterministic', () => {
  const t = mockLlmText('Analyse the plot at Example Street 1');
  assert.ok(t.includes(MOCK_LABEL));
  assert.equal(t, mockLlmText('Analyse the plot at Example Street 1'));
});

test('mock usage is positive and image data URL is a PNG', () => {
  const u = mockUsage('abcdefgh');
  assert.ok(u.inputTokens >= 1);
  assert.ok(u.outputTokens > 0);
  assert.ok(MOCK_IMAGE_DATA_URL.startsWith('data:image/png;base64,'));
});
