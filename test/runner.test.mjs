import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Runner, validateDefinition } from '../src/server/lib/runner.ts';
import { resolveTemplates } from '../src/server/lib/template.ts';

// Minimal fake leaf executor: 'val' returns config.value (templated), 'boom'
// throws, 'gate' suspends, 'out' maps to run output.
function makeRuntime(overrides = {}) {
  const steps = [];
  const rt = {
    execLeaf: async (node, scope) => {
      switch (node.type) {
        case 'val':
          return { output: resolveTemplates(node.config?.value, scope) };
        case 'boom': {
          rt._boomCount = (rt._boomCount ?? 0) + 1;
          if (rt._boomCount <= (node.config?.failTimes ?? Infinity)) throw new Error('boom');
          return { output: { ok: true, attempts: rt._boomCount } };
        }
        case 'gate':
          return { suspend: true, output: { message: 'approve me' } };
        case 'output':
          return { output: resolveTemplates(node.config?.map, scope), end: node.config?.end === true };
        default:
          throw new Error(`unknown ${node.type}`);
      }
    },
    onStep: (evt) => {
      steps.push(evt);
    },
    isCancelled: () => false,
    ...overrides,
  };
  return { rt, steps };
}

test('sequence + output', async () => {
  const { rt } = makeRuntime();
  const def = {
    nodes: [
      { id: 'a', type: 'val', config: { value: { x: 1 } } },
      { id: 'b', type: 'val', config: { value: '{{nodes.a.x}}' } },
      { id: 'o', type: 'output', config: { map: { got: '{{nodes.b}}' } } },
    ],
  };
  const out = await new Runner(rt).run(def, {});
  assert.equal(out.status, 'succeeded');
  assert.equal(out.output.got, 1);
});

test('condition picks the right branch', async () => {
  const { rt } = makeRuntime();
  const def = {
    nodes: [
      {
        id: 'c',
        type: 'condition',
        config: { left: '{{input.flag}}', op: 'truthy' },
        branches: [
          [{ id: 't', type: 'output', config: { map: { branch: 'true' } } }],
          [{ id: 'f', type: 'output', config: { map: { branch: 'false' } } }],
        ],
      },
    ],
  };
  const a = await new Runner(rt).run(def, { flag: true });
  assert.equal(a.output.branch, 'true');
  const b = await new Runner(rt).run(def, { flag: false });
  assert.equal(b.output.branch, 'false');
});

test('parallel branches share vars downstream', async () => {
  const { rt } = makeRuntime();
  const def = {
    nodes: [
      {
        id: 'p',
        type: 'parallel',
        branches: [
          [{ id: 'x', type: 'val', config: { value: 10 } }],
          [{ id: 'y', type: 'val', config: { value: 20 } }],
        ],
      },
      { id: 'o', type: 'output', config: { map: { x: '{{nodes.x}}', y: '{{nodes.y}}' } } },
    ],
  };
  const out = await new Runner(rt).run(def, {});
  assert.equal(out.status, 'succeeded');
  assert.equal(out.output.x, 10);
  assert.equal(out.output.y, 20);
});

test('loop iterates items with scope.item', async () => {
  const seen = [];
  const { rt } = makeRuntime({
    execLeaf: async (node, scope) => {
      if (node.type === 'collect') {
        seen.push(scope.item);
        return { output: scope.item };
      }
      return { output: {} };
    },
  });
  const def = {
    nodes: [
      {
        id: 'l',
        type: 'loop',
        config: { items: '{{input.list}}' },
        branches: [[{ id: 'c1', type: 'collect' }]],
      },
    ],
  };
  const out = await new Runner(rt).run(def, { list: ['a', 'b', 'c'] });
  assert.equal(out.status, 'succeeded');
  assert.deepEqual(seen, ['a', 'b', 'c']);
});

test('human gate suspends, resume continues after approval', async () => {
  const { rt } = makeRuntime();
  const def = {
    nodes: [
      { id: 'a', type: 'val', config: { value: 'before' } },
      { id: 'g', type: 'gate' },
      { id: 'o', type: 'output', config: { map: { approval: '{{nodes.g.comment}}', a: '{{nodes.a}}' } } },
    ],
  };
  const runner = new Runner(rt);
  const first = await runner.run(def, {});
  assert.equal(first.status, 'waiting');
  assert.equal(first.state.waitingNodeId, 'g');
  // simulate DB round-trip
  const state = JSON.parse(JSON.stringify(first.state));
  const resumed = await runner.resume(def, {}, state, { approved: true, comment: 'ok!' });
  assert.equal(resumed.status, 'succeeded');
  assert.equal(resumed.output.approval, 'ok!');
  assert.equal(resumed.output.a, 'before');
});

test('rejection fails the run at the gate', async () => {
  const { rt } = makeRuntime();
  const def = { nodes: [{ id: 'g', type: 'gate' }, { id: 'o', type: 'output', config: { map: { x: 1 } } }] };
  const runner = new Runner(rt);
  const first = await runner.run(def, {});
  const resumed = await runner.resume(def, {}, first.state, { approved: false });
  assert.equal(resumed.status, 'failed');
  assert.match(resumed.error, /rejected/);
});

test('node retries per config', async () => {
  const { rt } = makeRuntime();
  const def = { nodes: [{ id: 'b', type: 'boom', config: { failTimes: 2, retries: 2 } }] };
  const out = await new Runner(rt).run(def, {});
  assert.equal(out.status, 'succeeded');
});

test('failure without retries fails the run with node id', async () => {
  const { rt } = makeRuntime();
  const def = { nodes: [{ id: 'b', type: 'boom', config: {} }] };
  const out = await new Runner(rt).run(def, {});
  assert.equal(out.status, 'failed');
  assert.equal(out.nodeId, 'b');
});

test('cancellation stops the walk', async () => {
  let calls = 0;
  const { rt } = makeRuntime({
    execLeaf: async () => {
      calls += 1;
      return { output: {} };
    },
    isCancelled: () => calls >= 1,
  });
  const def = {
    nodes: [
      { id: 'a', type: 'val', config: { value: 1 } },
      { id: 'b', type: 'val', config: { value: 2 } },
    ],
  };
  const out = await new Runner(rt).run(def, {});
  assert.equal(out.status, 'cancelled');
});

test('validateDefinition catches structural errors', () => {
  const errs = validateDefinition({
    nodes: [
      { id: 'p', type: 'parallel', branches: [[{ id: 'g', type: 'human_gate' }]] },
      { id: 'p', type: 'val' },
      { id: 'c', type: 'condition' },
    ],
  });
  assert.ok(errs.some((e) => e.message.includes('human_gate')));
  assert.ok(errs.some((e) => e.message.includes('duplicate')));
  assert.ok(errs.some((e) => e.message.includes('condition')));
  assert.ok(errs.some((e) => e.nodeId === 'g'));
});

test('gate inside a loop suspends and resumes mid-iteration', async () => {
  const seen = [];
  const { rt } = makeRuntime({
    execLeaf: async (node, scope) => {
      if (node.type === 'collect') {
        seen.push(scope.item);
        return { output: scope.item };
      }
      if (node.type === 'gate') return { suspend: true, output: { message: `approve item ${scope.item}` } };
      if (node.type === 'output') return { output: { items: seen.slice() } };
      return { output: {} };
    },
  });
  const def = {
    nodes: [
      {
        id: 'l',
        type: 'loop',
        config: { items: '{{input.list}}' },
        branches: [[{ id: 'c1', type: 'collect' }, { id: 'g1', type: 'gate' }]],
      },
      { id: 'o', type: 'output', config: {} },
    ],
  };
  const runner = new Runner(rt);
  // iteration 0: collect 'a', then suspend at the gate
  let out = await runner.run(def, { list: ['a', 'b'] });
  assert.equal(out.status, 'waiting');
  assert.deepEqual(seen, ['a']);
  // resume → iteration 1: collect 'b', suspend again
  out = await runner.resume(def, { list: ['a', 'b'] }, JSON.parse(JSON.stringify(out.state)), { approved: true });
  assert.equal(out.status, 'waiting');
  assert.deepEqual(seen, ['a', 'b']);
  // final resume → loop done, output reached
  out = await runner.resume(def, { list: ['a', 'b'] }, JSON.parse(JSON.stringify(out.state)), { approved: true });
  assert.equal(out.status, 'succeeded');
  assert.deepEqual(out.output.items, ['a', 'b']);
});

test('gate inside a condition branch resumes into the branch remainder', async () => {
  const { rt } = makeRuntime();
  const def = {
    nodes: [
      {
        id: 'c',
        type: 'condition',
        config: { left: '{{input.flag}}', op: 'truthy' },
        branches: [
          [
            { id: 'g', type: 'gate' },
            { id: 'after', type: 'val', config: { value: 'branch-tail' } },
          ],
          [],
        ],
      },
      { id: 'o', type: 'output', config: { map: { tail: '{{nodes.after}}', gateComment: '{{nodes.g.comment}}' } } },
    ],
  };
  const runner = new Runner(rt);
  const first = await runner.run(def, { flag: true });
  assert.equal(first.status, 'waiting');
  const resumed = await runner.resume(def, { flag: true }, JSON.parse(JSON.stringify(first.state)), {
    approved: true,
    comment: 'go on',
  });
  assert.equal(resumed.status, 'succeeded');
  assert.equal(resumed.output.tail, 'branch-tail');
  assert.equal(resumed.output.gateComment, 'go on');
});

test('output with end stops early', async () => {
  const { rt } = makeRuntime();
  const def = {
    nodes: [
      { id: 'o1', type: 'output', config: { map: { early: true }, end: true } },
      { id: 'never', type: 'boom', config: {} },
    ],
  };
  const out = await new Runner(rt).run(def, {});
  assert.equal(out.status, 'succeeded');
  assert.equal(out.output.early, true);
});
