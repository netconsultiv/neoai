import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSchedule, isDue, describeSchedule } from '../src/server/lib/schedule.ts';

test('parseSchedule accepts every-N and daily forms', () => {
  assert.deepEqual(parseSchedule('every 15m'), { kind: 'every', ms: 15 * 60_000 });
  assert.deepEqual(parseSchedule('Every 2h'), { kind: 'every', ms: 2 * 3_600_000 });
  assert.deepEqual(parseSchedule('daily 07:00'), { kind: 'daily', hour: 7, minute: 0 });
  assert.equal(parseSchedule('every 30s'), null); // sub-minute rejected
  assert.equal(parseSchedule('daily 25:00'), null);
  assert.equal(parseSchedule(''), null);
  assert.equal(parseSchedule('cron * * * * *'), null);
});

test('describeSchedule round-trips readable text', () => {
  assert.equal(describeSchedule(parseSchedule('every 90m')), 'every 90m');
  assert.equal(describeSchedule(parseSchedule('every 2h')), 'every 2h');
  assert.equal(describeSchedule(parseSchedule('daily 7:05')), 'daily 07:05');
});

test('isDue: every — first run immediately, then interval-gated', () => {
  const spec = parseSchedule('every 15m');
  const now = new Date('2026-07-03T12:00:00');
  assert.equal(isDue(spec, null, now), true);
  assert.equal(isDue(spec, new Date('2026-07-03T11:50:00'), now), false);
  assert.equal(isDue(spec, new Date('2026-07-03T11:44:59'), now), true);
});

test('isDue: daily — fires once after HH:MM', () => {
  const spec = parseSchedule('daily 07:00');
  const before = new Date('2026-07-03T06:59:00');
  const after = new Date('2026-07-03T07:00:30');
  assert.equal(isDue(spec, null, before), false);
  assert.equal(isDue(spec, null, after), true);
  // already ran today after 07:00 → not due again
  assert.equal(isDue(spec, new Date('2026-07-03T07:00:10'), new Date('2026-07-03T18:00:00')), false);
  // ran YESTERDAY → due again today after 07:00
  assert.equal(isDue(spec, new Date('2026-07-02T07:00:10'), after), true);
});
