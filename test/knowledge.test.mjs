import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  search,
  score,
  tokenize,
  foldDiacritics,
  extractSnippet,
  planApproveSuggestion,
  planRejectSuggestion,
} from '../src/server/lib/knowledgeRetrieval.ts';

// ---- retrieval (ported from CRM, adapted use_case free-string) --------------

test('tokenize drops single-char noise and folds case', () => {
  assert.deepEqual(tokenize('The Plot A B'), ['the', 'plot']);
});

test('foldDiacritics handles German and Polish, including ß/ł', () => {
  assert.equal(foldDiacritics('Grundstück'), 'grundstuck');
  assert.equal(foldDiacritics('Straße'), 'strasse');
  assert.equal(foldDiacritics('Łódź'), 'lodz');
});

test('score weights tags > title > body, plus phrase and use-case bonuses', () => {
  const tagHit = score('plot', { tags: 'plot, financing' });
  const bodyHit = score('plot', { body: 'a plot of land' });
  assert.ok(tagHit > bodyHit);

  const article = { title: 'Plot financing basics', use_case: 'lead-qualification' };
  const withUseCase = score('plot financing', article, 'lead-qualification');
  const withoutUseCase = score('plot financing', article);
  assert.ok(withUseCase > withoutUseCase); // use_case bonus only applies when scoped article matches
});

test('score returns 0 for a query with no term overlap anywhere', () => {
  assert.equal(score('xylophone', { title: 'Plot basics', body: 'plot text', tags: 'plot' }), 0);
});

test('extractSnippet centers on the densest cluster of query terms', () => {
  const body = 'Unrelated filler text. The plot and financing basics matter a lot for a plot. More filler after.';
  const snippet = extractSnippet('plot financing', body, 40);
  assert.ok(snippet.includes('plot and financing'));
});

test('extractSnippet falls back to the opening when no term is found in body', () => {
  const snippet = extractSnippet('unrelatedterm', 'Article body about something else entirely here.', 20);
  assert.ok(snippet.startsWith('Article body'));
});

test('search: empty query returns no results (never means "list everything")', () => {
  assert.deepEqual(search('', [{ title: 'Anything' }]), []);
  assert.deepEqual(search('   ', [{ title: 'Anything' }]), []);
});

test('search: ranks by score, general/unscoped articles remain eligible under a use_case filter', () => {
  const articles = [
    { title: 'Plot and financing basics', tags: 'plot, financing', use_case: 'lead-qualification', body: 'Plot ownership and financing status.' },
    { title: 'General buying process', tags: 'process', use_case: 'general', body: 'Plot financing appears once here.' },
    { title: 'Unrelated warranty article', tags: 'warranty', use_case: 'general', body: 'Nothing about the query terms.' },
  ];
  const hits = search('plot financing', articles, { useCase: 'lead-qualification', limit: 5 });
  assert.equal(hits.length, 2); // the unrelated warranty article never matches (score 0)
  assert.equal(hits[0].article.title, 'Plot and financing basics'); // scoped + tag + phrase bonus wins
});

test('search: an article scoped to a DIFFERENT specific use case is excluded even if it matches keywords', () => {
  const articles = [
    { title: 'Plot financing for project coordination', tags: 'plot, financing', use_case: 'project-coordination', body: 'plot financing details' },
  ];
  assert.deepEqual(search('plot financing', articles, { useCase: 'lead-qualification' }), []);
});

test('search: free-string use_case values beyond the old CRM enum work identically', () => {
  const articles = [
    { title: 'Catalog option pairing notes', tags: 'catalog, option', use_case: 'konfigurator.catalog-assist', body: 'Notes on pairing catalog options.' },
  ];
  const hits = search('catalog option', articles, { useCase: 'konfigurator.catalog-assist' });
  assert.equal(hits.length, 1);
});

// ---- suggestion approve/reject decision logic (human gate) ------------------

test('planApproveSuggestion: null target_article_id -> CREATE a new article, source ai-suggested', () => {
  const plan = planApproveSuggestion(
    {
      id: 1,
      status: 'pending',
      target_article_id: null,
      proposed_title: 'New article title',
      proposed_body: 'New body',
      proposed_tags: 'a, b',
      proposed_use_case: 'general',
      proposed_language: 'en',
    },
    'reviewer@example.com',
  );
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.articleWrite.op, 'create');
  assert.deepEqual(plan.articleWrite.values, {
    title: 'New article title',
    body: 'New body',
    tags: 'a, b',
    use_case: 'general',
    language: 'en',
    active: true,
    source: 'ai-suggested',
  });
  assert.equal(plan.suggestionUpdate.status, 'approved');
  assert.equal(plan.suggestionUpdate.reviewed_by, 'reviewer@example.com');
});

test('planApproveSuggestion: set target_article_id -> UPDATE that existing article', () => {
  const plan = planApproveSuggestion(
    {
      id: 2,
      status: 'pending',
      target_article_id: 42,
      proposed_title: 'Revised title',
      proposed_body: 'Revised body',
      proposed_tags: '',
      proposed_use_case: '',
      proposed_language: 'de',
    },
    'reviewer@example.com',
  );
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.articleWrite.op, 'update');
  assert.equal(plan.articleWrite.articleId, 42);
  assert.equal(plan.articleWrite.values.title, 'Revised title');
  assert.equal(plan.articleWrite.values.language, 'de');
  // update path never stamps source/active — those are unrelated to an edit.
  assert.equal('source' in plan.articleWrite.values, false);
});

test('planApproveSuggestion: refuses a suggestion that is not pending (no double-approve)', () => {
  const plan = planApproveSuggestion({ id: 3, status: 'approved', target_article_id: null }, 'reviewer');
  assert.equal(plan.ok, false);
  if (plan.ok) return;
  assert.match(plan.reason, /already approved/);
});

test('planApproveSuggestion: refuses a missing row', () => {
  const plan = planApproveSuggestion(null, 'reviewer');
  assert.equal(plan.ok, false);
});

test('planRejectSuggestion: marks rejected + reviewer/timestamp, never touches an article', () => {
  const now = new Date('2026-07-04T10:00:00Z');
  const plan = planRejectSuggestion({ id: 4, status: 'pending', target_article_id: 7 }, 'reviewer@example.com', now);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.deepEqual(plan.suggestionUpdate, { status: 'rejected', reviewed_by: 'reviewer@example.com', reviewed_at: now });
  // The plan type itself carries no articleWrite field at all for reject.
  assert.equal('articleWrite' in plan, false);
});

test('planRejectSuggestion: refuses a suggestion that is not pending', () => {
  const plan = planRejectSuggestion({ id: 5, status: 'rejected', target_article_id: null }, 'reviewer');
  assert.equal(plan.ok, false);
});

test('planRejectSuggestion: refuses a missing row', () => {
  const plan = planRejectSuggestion(undefined, 'reviewer');
  assert.equal(plan.ok, false);
});
