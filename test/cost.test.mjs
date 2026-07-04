import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBudget, costOf, priceFor } from '../src/server/lib/cost.ts';

test('priceFor matches by longest prefix', () => {
  const table = { 'gemini-2.5-flash': { in: 0.3, out: 2.5 }, 'gemini-2.5-flash-lite': { in: 0.1, out: 0.4 } };
  assert.deepEqual(priceFor('gemini-2.5-flash-lite-preview', table), { in: 0.1, out: 0.4 });
  assert.deepEqual(priceFor('gemini-2.5-flash-8b', table), { in: 0.3, out: 2.5 });
  assert.equal(priceFor('unknown-model', table), null);
});

test('costOf computes USD from token usage', () => {
  const table = { 'gemini-2.5-flash': { in: 1, out: 2 } };
  const cost = costOf('gemini-2.5-flash', { inputTokens: 1_000_000, outputTokens: 500_000 }, table);
  assert.equal(cost, 2); // 1*1 + 0.5*2
});

test('checkBudget: no limits set never blocks', () => {
  const res = checkBudget({ spentTodayUsd: 1000, workflowSpentTodayUsd: 1000 });
  assert.equal(res.ok, true);
});

test('checkBudget: global limit blocks first', () => {
  const res = checkBudget({ spentTodayUsd: 10, workflowSpentTodayUsd: 0, globalDailyBudgetUsd: 5 });
  assert.equal(res.ok, false);
  assert.match(res.reason, /global/);
});

test('checkBudget: workflow limit blocks independently of global', () => {
  const res = checkBudget({ spentTodayUsd: 1, workflowSpentTodayUsd: 10, globalDailyBudgetUsd: 100, workflowDailyBudgetUsd: 5 });
  assert.equal(res.ok, false);
  assert.match(res.reason, /workflow/);
});

test('checkBudget: function-level budget (item 14) blocks even when workflow/global have room', () => {
  const res = checkBudget({
    spentTodayUsd: 1,
    workflowSpentTodayUsd: 1,
    globalDailyBudgetUsd: 100,
    workflowDailyBudgetUsd: 100,
    functionSpentTodayUsd: 5,
    functionDailyBudgetUsd: 5,
  });
  assert.equal(res.ok, false);
  assert.match(res.reason, /function/);
});

test('checkBudget: function budget of 0 means unlimited (no block)', () => {
  const res = checkBudget({
    spentTodayUsd: 0,
    workflowSpentTodayUsd: 0,
    functionSpentTodayUsd: 1000,
    functionDailyBudgetUsd: 0,
  });
  assert.equal(res.ok, true);
});
