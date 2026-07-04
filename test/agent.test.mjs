import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Runner, validateDefinition } from '../src/server/lib/runner.ts';
import { resolveTemplates } from '../src/server/lib/template.ts';

// Fake runtime for the agent node (item 20). 'agent_decide' is the synthetic
// node type runner.ts's drive() emits per turn — these tests drive it exactly
// the way plugin.ts's real execLeafFactory would, but with fakes so the
// runner core stays testable in isolation (same convention as runner.test.mjs).
function makeAgentRuntime({ decisions, guardModelCall, mcpResults, subworkflows } = {}) {
  const steps = [];
  let decideCalls = 0;
  const rt = {
    execLeaf: async (node, scope) => {
      if (node.type === 'agent_decide') {
        decideCalls += 1;
        if (guardModelCall) await guardModelCall();
        const d = decisions[Math.min(decideCalls - 1, decisions.length - 1)];
        return { output: { json: d }, usage: { inputTokens: 5, outputTokens: 5 } };
      }
      if (node.type === 'mcp_tool') {
        const key = node.config?.toolName;
        return { output: (mcpResults && mcpResults[key]) ?? { ok: true } };
      }
      if (node.type === 'output') {
        // Mirrors nodes.ts's execOutput: resolve {{nodes.<id>.<path>}}
        // placeholders against the already-recorded vars (the real scope, as
        // built by runner.ts's drive() for this frame).
        return { output: resolveTemplates(node.config?.map ?? {}, scope), end: node.config?.end === true };
      }
      if (node.type === 'human_gate') {
        return { suspend: true, output: { message: node.config?.message ?? 'Approval required' } };
      }
      throw new Error(`unexpected leaf exec for type ${node.type}`);
    },
    onStep: (evt) => {
      steps.push(evt);
    },
    isCancelled: () => false,
    loadWorkflow: async (key) => (subworkflows ? subworkflows[key] ?? null : null),
  };
  return { rt, steps, getDecideCalls: () => decideCalls };
}

test('validateDefinition requires >=1 tools and a non-empty goal for agent nodes', () => {
  const errs = validateDefinition({
    nodes: [{ id: 'a', type: 'agent', config: { tools: [], goal: '' } }],
  });
  assert.ok(errs.some((e) => e.nodeId === 'a' && e.message.includes('tool')));
  assert.ok(errs.some((e) => e.nodeId === 'a' && e.message.includes('goal')));

  const ok = validateDefinition({
    nodes: [{ id: 'a', type: 'agent', config: { tools: [{ name: 'x', type: 'mcp' }], goal: 'do the thing' } }],
  });
  assert.equal(ok.length, 0);
});

test('agent finishes after the model decides action:finish, recording turnCount/finalOutput', async () => {
  const { rt } = makeAgentRuntime({
    decisions: [{ action: 'finish', reasoning: 'done', finalOutput: { answer: 42 } }],
  });
  const def = {
    nodes: [
      {
        id: 'agent1',
        type: 'agent',
        config: { goal: 'answer the question', tools: [{ name: 'lookup', type: 'mcp', serverId: 1 }], maxTurns: 5 },
      },
      { id: 'o', type: 'output', config: { map: { turnCount: '{{nodes.agent1.turnCount}}', finished: '{{nodes.agent1.finished}}', out: '{{nodes.agent1.finalOutput}}' } } },
    ],
  };
  const out = await new Runner(rt).run(def, {});
  assert.equal(out.status, 'succeeded');
  assert.equal(out.output.turnCount, 1);
  assert.equal(out.output.finished, true);
  assert.deepEqual(out.output.out, { answer: 42 });
});

test('agent dispatches an MCP-based tool call and feeds the result into the next turn', async () => {
  const { rt } = makeAgentRuntime({
    decisions: [
      { action: 'call_tool', tool: 'lookup', args: { q: 'hello' }, reasoning: 'need data' },
      { action: 'finish', reasoning: 'got it', finalOutput: { found: true } },
    ],
    mcpResults: { lookup: { result: { content: [{ type: 'text', text: 'found: hello' }] } } },
  });
  const def = {
    nodes: [
      {
        id: 'agent1',
        type: 'agent',
        config: { goal: 'look something up', tools: [{ name: 'lookup', type: 'mcp', serverId: 1 }], maxTurns: 5 },
      },
    ],
  };
  const out = await new Runner(rt).run(def, {});
  assert.equal(out.status, 'succeeded');
  assert.equal(out.vars['agent1'].turnCount, 2);
  assert.equal(out.vars['agent1'].finished, true);
  // The tool step's output is individually addressable in vars — full
  // per-turn observability, not a single bundled JSON blob.
  const toolKey = Object.keys(out.vars).find((k) => k.includes('::tool::lookup'));
  assert.ok(toolKey, 'expected an individually addressable tool step var');
});

test('budget guard (guardModelCall) is invoked exactly once per turn, not once per run', async () => {
  let guardCalls = 0;
  const { rt, getDecideCalls } = makeAgentRuntime({
    decisions: [
      { action: 'call_tool', tool: 'lookup', args: {}, reasoning: 'turn 1' },
      { action: 'call_tool', tool: 'lookup', args: {}, reasoning: 'turn 2' },
      { action: 'finish', reasoning: 'turn 3', finalOutput: {} },
    ],
    guardModelCall: async () => {
      guardCalls += 1;
    },
    mcpResults: { lookup: { ok: true } },
  });
  const def = {
    nodes: [
      { id: 'agent1', type: 'agent', config: { goal: 'g', tools: [{ name: 'lookup', type: 'mcp', serverId: 1 }], maxTurns: 10 } },
    ],
  };
  const out = await new Runner(rt).run(def, {});
  assert.equal(out.status, 'succeeded');
  assert.equal(guardCalls, 3, 'guardModelCall must be invoked exactly turns.length times');
  assert.equal(getDecideCalls(), 3);
  assert.equal(out.vars['agent1'].turnCount, 3);
});

test('hitting the turn cap without finishing terminates cleanly with finished:false (no crash/hang)', async () => {
  // The model NEVER decides to finish — every decision calls the tool again.
  const { rt } = makeAgentRuntime({
    decisions: [{ action: 'call_tool', tool: 'lookup', args: {}, reasoning: 'again' }],
    mcpResults: { lookup: { ok: true } },
  });
  const def = {
    nodes: [{ id: 'agent1', type: 'agent', config: { goal: 'g', tools: [{ name: 'lookup', type: 'mcp', serverId: 1 }], maxTurns: 3 } }],
  };
  const out = await new Runner(rt).run(def, {});
  assert.equal(out.status, 'succeeded'); // the RUN succeeds; the agent's own summary says unfinished
  assert.equal(out.vars['agent1'].turnCount, 3);
  assert.equal(out.vars['agent1'].finished, false);
  assert.equal(out.vars['agent1'].finalOutput, null);
});

test('config.maxTurns beyond the hard ceiling is clamped to 25, not honored verbatim', async () => {
  const { rt, getDecideCalls } = makeAgentRuntime({
    decisions: [{ action: 'call_tool', tool: 'lookup', args: {}, reasoning: 'again' }],
    mcpResults: { lookup: { ok: true } },
  });
  const def = {
    nodes: [{ id: 'agent1', type: 'agent', config: { goal: 'g', tools: [{ name: 'lookup', type: 'mcp', serverId: 1 }], maxTurns: 999 } }],
  };
  const out = await new Runner(rt).run(def, {});
  assert.equal(out.status, 'succeeded');
  assert.equal(out.vars['agent1'].turnCount, 25, 'must hard-ceiling at 25 regardless of authored maxTurns');
  assert.equal(getDecideCalls(), 25);
});

test('a subworkflow-tool call that fails at the budget guard fails the whole agent/run at that turn', async () => {
  let guardCalls = 0;
  const { rt } = makeAgentRuntime({
    decisions: [
      { action: 'call_tool', tool: 'lookup', args: {}, reasoning: 'turn 1' },
      { action: 'call_tool', tool: 'lookup', args: {}, reasoning: 'turn 2 — should not be reached' },
    ],
    guardModelCall: async () => {
      guardCalls += 1;
      if (guardCalls >= 2) throw new Error('budget: daily budget exceeded');
    },
    mcpResults: { lookup: { ok: true } },
  });
  const def = {
    nodes: [{ id: 'agent1', type: 'agent', config: { goal: 'g', tools: [{ name: 'lookup', type: 'mcp', serverId: 1 }], maxTurns: 10 } }],
  };
  const out = await new Runner(rt).run(def, {});
  assert.equal(out.status, 'failed');
  assert.match(out.error, /budget: daily budget exceeded/);
  assert.equal(guardCalls, 2, 'must fail exactly at the turn that crosses the budget, like a plain llm node would');
});

test('an agent tool pointed at a subworkflow containing a human_gate is REJECTED, not silently allowed', async () => {
  const gatedSubworkflow = {
    nodes: [
      { id: 'g', type: 'human_gate', config: { message: 'approve me' } },
      { id: 'o', type: 'output', config: { map: { ok: true } } },
    ],
  };
  const { rt } = makeAgentRuntime({
    decisions: [{ action: 'call_tool', tool: 'gated', args: {}, reasoning: 'try the gated subworkflow' }],
    subworkflows: { gatedFlow: gatedSubworkflow },
  });
  const def = {
    nodes: [
      {
        id: 'agent1',
        type: 'agent',
        config: { goal: 'g', tools: [{ name: 'gated', type: 'subworkflow', workflowKey: 'gatedFlow' }], maxTurns: 5 },
      },
    ],
  };
  const out = await new Runner(rt).run(def, {});
  assert.equal(out.status, 'failed');
  assert.match(out.error, /human_gate inside subworkflow is not supported/);
});

test('an agent tool pointed at a NON-gated subworkflow succeeds normally', async () => {
  const plainSubworkflow = {
    nodes: [{ id: 'o', type: 'output', config: { map: { computed: 7 } } }],
  };
  const { rt } = makeAgentRuntime({
    decisions: [
      { action: 'call_tool', tool: 'calc', args: {}, reasoning: 'run the calc subworkflow' },
      { action: 'finish', reasoning: 'done', finalOutput: { ok: true } },
    ],
    subworkflows: { calcFlow: plainSubworkflow },
  });
  const def = {
    nodes: [
      {
        id: 'agent1',
        type: 'agent',
        config: { goal: 'g', tools: [{ name: 'calc', type: 'subworkflow', workflowKey: 'calcFlow' }], maxTurns: 5 },
      },
    ],
  };
  const out = await new Runner(rt).run(def, {});
  assert.equal(out.status, 'succeeded');
  assert.equal(out.vars['agent1'].finished, true);
});

test('agent decides a tool name not present in config.tools — fails the run rather than guessing', async () => {
  const { rt } = makeAgentRuntime({
    decisions: [{ action: 'call_tool', tool: 'not_a_real_tool', args: {}, reasoning: 'oops' }],
  });
  const def = {
    nodes: [{ id: 'agent1', type: 'agent', config: { goal: 'g', tools: [{ name: 'lookup', type: 'mcp', serverId: 1 }], maxTurns: 5 } }],
  };
  const out = await new Runner(rt).run(def, {});
  assert.equal(out.status, 'failed');
  assert.match(out.error, /not in config\.tools/);
});

test('each turn persists its OWN step rows (decide + tool), not one bundled JSON blob', async () => {
  const { rt, steps } = makeAgentRuntime({
    decisions: [
      { action: 'call_tool', tool: 'lookup', args: { q: 1 }, reasoning: 't1' },
      { action: 'finish', reasoning: 't2', finalOutput: { x: 1 } },
    ],
    mcpResults: { lookup: { ok: true } },
  });
  const def = {
    nodes: [{ id: 'agent1', type: 'agent', config: { goal: 'g', tools: [{ name: 'lookup', type: 'mcp', serverId: 1 }], maxTurns: 5 } }],
  };
  await new Runner(rt).run(def, {});
  const decideSteps = steps.filter((s) => s.nodeType === 'agent_decide' && s.phase === 'done');
  const toolSteps = steps.filter((s) => s.nodeType === 'mcp_tool' && s.phase === 'done');
  const summarySteps = steps.filter((s) => s.nodeId === 'agent1' && s.phase === 'done');
  assert.equal(decideSteps.length, 2, 'one decide step per turn');
  assert.equal(toolSteps.length, 1, 'one tool step for the single tool call made');
  assert.equal(summarySteps.length, 1, 'exactly one roll-up summary row for the outer agent node');
  // distinct node ids per turn (no collisions/overwrites)
  const decideIds = new Set(decideSteps.map((s) => s.nodeId));
  assert.equal(decideIds.size, 2);
});
