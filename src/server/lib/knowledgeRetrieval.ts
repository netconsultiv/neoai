// src/server/lib/knowledgeRetrieval.ts
// -----------------------------------------------------------------------------
// Pure keyword retrieval over neoai_knowledge_articles — the Knowledge Hub
// (moved out of @neomodul/crm, see plugin.ts "Knowledge Hub" section).
//
// This is an intentional, ACKNOWLEDGED copy of neomodul-crm's
// src/server/lib/retrieval.ts (same term-frequency scoring, same diacritic
// folding, same snippet extraction), adapted to read use_case as a free
// string instead of a fixed enum. NocoBase plugins live in independent repos
// and can't easily share a library across them, so duplicating this small,
// dependency-free module is cheaper than standing up a shared package for
// one file — do not over-engineer that here.
//
// NocoBase-FREE on purpose: test/*.test.mjs imports this file directly
// through node's type stripping, so only ERASABLE TypeScript is allowed (no
// enums, no namespaces, no parameter properties) and no imports beyond node
// builtins (currently: none at all).

export type KnowledgeArticle = {
  title?: string;
  body?: string;
  /** Comma-separated, exactly as stored in neoai_knowledge_articles.tags. */
  tags?: string;
  /** Free string ('' / undefined = applies everywhere; 'general' also unscoped). */
  use_case?: string;
  /** Rows carry id / language / active etc. — passed through untouched. */
  [extra: string]: unknown;
};

export type SearchOptions = {
  /** Restrict to articles scoped to this use case (plus 'general'/unscoped ones). */
  useCase?: string;
  /** Max hits returned (default 5, hard cap 50). */
  limit?: number;
};

export type SearchHit = {
  article: KnowledgeArticle;
  score: number;
  snippet: string;
};

// Scoring weights. Tags beat titles beat body because tags are the most
// deliberate curation signal (an editor typed them to make the article
// findable), while body matches are the noisiest.
const TITLE_BOOST = 3;
const TAG_BOOST = 4;
// A whole-phrase match is a much stronger relevance signal than the same
// terms scattered across the text; title phrase > body phrase.
const PHRASE_BONUS_TITLE = 5;
const PHRASE_BONUS_BODY = 3;
// Exact use-case scope match nudges scoped articles above 'general' ones that
// tie on keywords. Only applied when the article matched at all (score > 0) —
// scope alone must never surface a keyword-irrelevant article.
const USE_CASE_BONUS = 2;
const SNIPPET_RADIUS = 120;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 50;

// ---- normalisation -----------------------------------------------------------

// NFD decomposition strips every combining mark we care about for German
// (ä ö ü) and Polish (ą ć ę ń ó ś ź ż), but these two have NO canonical
// decomposition and need an explicit map. ß expands to 'ss' so that 'Straße'
// and 'Strasse' tokenize identically.
const NO_DECOMPOSITION: Record<string, string> = { ß: 'ss', ł: 'l' };

// Combining-marks range U+0300-U+036F, built from char codes on purpose:
// literal combining characters in source survive some editors/diff tools
// badly, so the source stays pure ASCII here.
const COMBINING_MARKS = new RegExp(`[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, 'g');

/** Lowercase + fold German/Polish diacritics to plain a-z ('Grundstück' → 'grundstuck'). */
export function foldDiacritics(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/[ßł]/g, (ch) => NO_DECOMPOSITION[ch])
    .normalize('NFD')
    .replace(COMBINING_MARKS, '');
}

/**
 * Split into folded lowercase word tokens. Single-character tokens are
 * dropped: in a curated corpus they are pure noise ('a', 'i', German 'o.')
 * and never discriminate between articles.
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  return foldDiacritics(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

function frequencies(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  return freq;
}

// ---- scoring -----------------------------------------------------------------

/**
 * Term-frequency relevance of one article for a query. Deterministic and
 * additive: body tf ×1, title tf ×3, tag tf ×4, plus a whole-phrase bonus for
 * multi-word queries and a use-case scope bonus (see weight comments above).
 * Returns 0 when nothing overlaps — callers drop those articles entirely.
 */
export function score(query: string, article: KnowledgeArticle, useCase?: string): number {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  const titleTokens = tokenize(String(article.title ?? ''));
  const bodyTokens = tokenize(String(article.body ?? ''));
  // Comma separators fall out naturally: ',' is a token boundary.
  const tagTokens = tokenize(String(article.tags ?? ''));

  const titleFreq = frequencies(titleTokens);
  const bodyFreq = frequencies(bodyTokens);
  const tagFreq = frequencies(tagTokens);

  let total = 0;
  for (const term of new Set(queryTokens)) {
    total += (bodyFreq.get(term) ?? 0);
    total += (titleFreq.get(term) ?? 0) * TITLE_BOOST;
    total += (tagFreq.get(term) ?? 0) * TAG_BOOST;
  }

  // Phrase bonus: the query's tokens appear contiguously and in order.
  // Compare space-joined token streams PADDED with spaces so the match cannot
  // leak across word boundaries ('ice cream' must not match 'justice creamery').
  // Requires >= 2 DISTINCT tokens: a repeated single word ('plot plot') is a
  // degenerate phrase and must not outscore the plain single-word query.
  if (queryTokens.length >= 2 && new Set(queryTokens).size >= 2) {
    const phrase = ` ${queryTokens.join(' ')} `;
    if (` ${titleTokens.join(' ')} `.includes(phrase)) total += PHRASE_BONUS_TITLE;
    else if (` ${bodyTokens.join(' ')} `.includes(phrase)) total += PHRASE_BONUS_BODY;
  }

  if (total > 0 && useCase && article.use_case === useCase) total += USE_CASE_BONUS;
  return total;
}

// ---- snippet extraction --------------------------------------------------------

// Word scanner for the snippet pass. Runs over the ORIGINAL (whitespace-
// collapsed) body so match offsets stay valid for slicing; each candidate
// word is folded on the fly for comparison. The ranges deliberately exclude
// U+00D7 (×) and U+00F7 (÷), which sit inside the naive Latin-1 letter span.
const WORD_RE = /[0-9A-Za-zÀ-ÖØ-öø-ɏ]+/g;

/**
 * Extract the best matching window of ±`radius` chars around the densest
 * cluster of query-term hits (most DISTINCT terms wins, then most total hits,
 * then earliest position). Falls back to the head of the body when no term
 * occurs in it (e.g. the article matched via title/tags only). Ellipses mark
 * truncation on either side; output is single-line.
 */
export function extractSnippet(query: string, body: string, radius = SNIPPET_RADIUS): string {
  const text = String(body ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  const terms = new Set(tokenize(query));
  type Hit = { index: number; length: number; term: string };
  const hits: Hit[] = [];
  if (terms.size > 0) {
    WORD_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = WORD_RE.exec(text))) {
      const folded = foldDiacritics(m[0]);
      if (terms.has(folded)) hits.push({ index: m.index, length: m[0].length, term: folded });
    }
  }

  if (hits.length === 0) {
    // No in-body match: show the article opening so the hit is still skimmable.
    return clip(text, 0, 2 * radius);
  }

  // Anchor the window on the hit whose ±radius neighbourhood covers the most
  // distinct query terms. Strict '>' comparisons make the EARLIEST best
  // cluster win ties, keeping output deterministic.
  let best = hits[0];
  let bestDistinct = -1;
  let bestTotal = -1;
  for (const anchor of hits) {
    const near = hits.filter((h) => Math.abs(h.index - anchor.index) <= radius);
    const distinct = new Set(near.map((h) => h.term)).size;
    if (distinct > bestDistinct || (distinct === bestDistinct && near.length > bestTotal)) {
      best = anchor;
      bestDistinct = distinct;
      bestTotal = near.length;
    }
  }

  return clip(text, Math.max(0, best.index - radius), Math.min(text.length, best.index + best.length + radius), best.index, best.index + best.length);
}

/**
 * Slice [start, end) out of `text`, snapped outward-in to word boundaries so
 * no word is cut in half, with ellipses where content was dropped. `keepFrom`/
 * `keepTo` (when given) protect the anchor match from being trimmed away.
 */
function clip(text: string, start: number, end: number, keepFrom = start, keepTo = end): string {
  let s = start;
  let e = Math.min(end, text.length);
  if (s > 0) {
    const space = text.indexOf(' ', s);
    if (space !== -1 && space < keepFrom) s = space + 1;
  }
  if (e < text.length) {
    const space = text.lastIndexOf(' ', e);
    if (space > keepTo) e = space;
  }
  return (s > 0 ? '…' : '') + text.slice(s, e) + (e < text.length ? '…' : '');
}

// ---- search ------------------------------------------------------------------

/**
 * Rank `articles` for `query`. Empty/whitespace-only queries return [] (the
 * consoles browse via normal list views instead — search never means "all").
 * With `useCase` set, articles scoped to a DIFFERENT specific use case are
 * excluded; unscoped/'general' articles always remain eligible and exact
 * scope matches get the score nudge (see USE_CASE_BONUS).
 */
export function search(
  query: string,
  articles: KnowledgeArticle[],
  options: SearchOptions = {},
): SearchHit[] {
  if (tokenize(query).length === 0) return [];
  const useCase = options.useCase || undefined;
  const requested = Math.floor(Number(options.limit));
  const limit = Number.isFinite(requested) && requested > 0 ? Math.min(requested, MAX_LIMIT) : DEFAULT_LIMIT;

  const eligible = !useCase
    ? articles
    : articles.filter((a) => {
        const scope = String(a.use_case ?? '');
        return !scope || scope === 'general' || scope === useCase;
      });

  const ranked: Array<SearchHit & { order: number }> = [];
  eligible.forEach((article, order) => {
    const s = score(query, article, useCase);
    if (s > 0) {
      ranked.push({ article, score: s, snippet: extractSnippet(query, String(article.body ?? '')), order });
    }
  });
  // Stable: equal scores keep the caller's article order.
  ranked.sort((a, b) => b.score - a.score || a.order - b.order);
  return ranked.slice(0, limit).map(({ article, score: s, snippet }) => ({ article, score: s, snippet }));
}

// ---- suggestion approve/reject decision logic ---------------------------------
//
// Pure, DB-free planning helpers behind plugin.ts's approveKnowledgeSuggestion
// / knowledgeSuggestionReject actions. Kept here (not inline in plugin.ts,
// which extends @nocobase/server's Plugin and can't be imported by a plain
// node:test file) so the human-gate decision — targeted UPDATE vs. new-article
// CREATE, and the suggestion row's own status transition — has real unit test
// coverage without a database. plugin.ts executes the plan verbatim against
// this.db.getRepository(...).

export type KnowledgeSuggestionRow = {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  target_article_id?: number | null;
  proposed_title?: string;
  proposed_body?: string;
  proposed_tags?: string;
  proposed_use_case?: string;
  proposed_language?: string;
};

export type ApprovePlan =
  | { ok: false; reason: string }
  | {
      ok: true;
      articleWrite:
        | { op: 'update'; articleId: number; values: Record<string, unknown> }
        | { op: 'create'; values: Record<string, unknown> };
      suggestionUpdate: { status: 'approved'; reviewed_by: string; reviewed_at: Date };
    };

/**
 * Decide what approving `row` should do. Returns {ok:false} for a missing row
 * or one that isn't 'pending' (already reviewed) — the caller never writes
 * anything in that case. Never mutates `row`.
 */
export function planApproveSuggestion(
  row: KnowledgeSuggestionRow | null | undefined,
  reviewedBy: string,
  now: Date = new Date(),
): ApprovePlan {
  if (!row) return { ok: false, reason: 'suggestion not found' };
  if (row.status !== 'pending') return { ok: false, reason: `suggestion is already ${row.status}` };

  const proposed = {
    title: row.proposed_title ?? '',
    body: row.proposed_body ?? '',
    tags: row.proposed_tags ?? '',
    use_case: row.proposed_use_case ?? '',
    language: row.proposed_language || 'en',
  };

  const articleWrite = row.target_article_id
    ? ({ op: 'update', articleId: Number(row.target_article_id), values: proposed } as const)
    : ({ op: 'create', values: { ...proposed, active: true, source: 'ai-suggested' } } as const);

  return {
    ok: true,
    articleWrite,
    suggestionUpdate: { status: 'approved', reviewed_by: reviewedBy, reviewed_at: now },
  };
}

export type RejectPlan =
  | { ok: false; reason: string }
  | { ok: true; suggestionUpdate: { status: 'rejected'; reviewed_by: string; reviewed_at: Date } };

/** Reject never touches the article — only ever the suggestion row's status. */
export function planRejectSuggestion(
  row: KnowledgeSuggestionRow | null | undefined,
  reviewedBy: string,
  now: Date = new Date(),
): RejectPlan {
  if (!row) return { ok: false, reason: 'suggestion not found' };
  if (row.status !== 'pending') return { ok: false, reason: `suggestion is already ${row.status}` };
  return { ok: true, suggestionUpdate: { status: 'rejected', reviewed_by: reviewedBy, reviewed_at: now } };
}
