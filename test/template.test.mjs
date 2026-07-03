import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveString, resolveTemplates, getPath, evalCondition, truncateJson } from '../src/server/lib/template.ts';

const scope = {
  input: { address: 'Berlin', n: 5 },
  nodes: {
    geo: { lat: '52.5', lon: 13.4, list: [1, 2, 3], obj: { a: 1 } },
  },
  item: 'x',
};

test('whole-string placeholder returns the raw value (objects survive)', () => {
  assert.equal(resolveString('{{nodes.geo.lon}}', scope), 13.4);
  assert.deepEqual(resolveString('{{nodes.geo.obj}}', scope), { a: 1 });
  assert.deepEqual(resolveString('{{nodes.geo.list}}', scope), [1, 2, 3]);
  assert.equal(resolveString('{{missing.path}}', scope), undefined);
});

test('embedded placeholders stringify (objects as JSON)', () => {
  assert.equal(resolveString('lat={{nodes.geo.lat}}, lon={{nodes.geo.lon}}', scope), 'lat=52.5, lon=13.4');
  assert.equal(resolveString('obj: {{nodes.geo.obj}}!', scope), 'obj: {"a":1}!');
  assert.equal(resolveString('gone: {{missing}}', scope), 'gone: ');
});

test('deep resolve walks arrays and objects', () => {
  const r = resolveTemplates({ a: ['{{input.address}}'], b: { c: '{{input.n}}' } }, scope);
  assert.deepEqual(r, { a: ['Berlin'], b: { c: 5 } });
});

test('getPath supports array indices', () => {
  assert.equal(getPath(scope, 'nodes.geo.list.1'), 2);
});

test('evalCondition ops', () => {
  assert.equal(evalCondition({ left: '{{input.n}}', op: 'gt', right: 3 }, scope), true);
  assert.equal(evalCondition({ left: '{{input.n}}', op: 'lt', right: 3 }, scope), false);
  assert.equal(evalCondition({ left: '{{input.address}}', op: 'eq', right: 'Berlin' }, scope), true);
  assert.equal(evalCondition({ left: '{{nodes.geo.list}}', op: 'contains', right: 2 }, scope), true);
  assert.equal(evalCondition({ left: '{{missing}}', op: 'empty' }, scope), true);
  assert.equal(evalCondition({ left: '{{nodes.geo.lat}}', op: 'notEmpty' }, scope), true);
  assert.equal(evalCondition(undefined, scope), true);
});

test('truncateJson caps large payloads', () => {
  const big = { s: 'x'.repeat(20000) };
  const t = truncateJson(big, 100);
  assert.equal(t.__truncated, true);
  assert.equal(truncateJson({ a: 1 }, 100).a, 1);
});
