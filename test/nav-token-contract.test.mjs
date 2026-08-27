// test/nav-token-contract.test.mjs
// -----------------------------------------------------------------------------------------------
// NEOB-18 — the NeoAI bottom bar reads the CENTRAL @neomodul/branding `--nm-*` token contract,
// with the EXACT default literals as the fallback, so it renders in its own default design WITHOUT
// branding and is centrally overridable WITH branding (graceful fallback, no hard branding dep).
//
// This is the forcing point for that contract. It is a file-reading test (the client bundle needs
// antd/react from the NocoBase host, which is not installed here) and it pins two things:
//
//   1. tokens.ts publishes EXACTLY the six roles as `var(--nm-name, <literal>)`, literals verbatim.
//      Drift of a name breaks the central override; drift of a literal breaks the no-branding look
//      and the seamless with/without-branding transition — both are silent regressions a renderer
//      test would not catch, so they are pinned here by string.
//   2. shell.tsx actually CONSUMES each role at its documented spot, and imports no @neomodul/branding
//      (the whole coupling is a CSS-variable namespace — a stray import would make it a hard dep).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const srcRoot = process.env.NEOAI_SRC ? resolve(process.env.NEOAI_SRC) : resolve(root, 'src');
const read = (rel) => readFileSync(resolve(srcRoot, rel), 'utf8');

// The contract, verbatim from the NEOB-18 issue table (Light defaults).
const CONTRACT = [
  ['--nm-brand-primary', '#009900'], // Aktiv-Ink / grünes Highlight
  ['--nm-ink-muted', '#676b64'], //     Inaktiv-Ink (bar)
  ['--nm-ink-subtle', '#8a908a'], //    Section-Header-Ink ("Mehr")
  ['--nm-nav-active', '#eef4ec'], //    Aktive-Zeile-Füllung ("Mehr")
  ['--nm-surface-card', '#fcfcfa'], //  Bar-/Sheet-Fläche
  ['--nm-line-subtle', '#ececec'], //   Bar-/Sheet-Hairline
];

test('tokens.ts reads the six shared --nm-* names with the EXACT contract literals as fallback', () => {
  const tokens = read('client/console/tokens.ts');
  for (const [name, literal] of CONTRACT) {
    const re = new RegExp(`var\\(\\s*${name}\\s*,\\s*${literal}\\s*\\)`, 'i');
    assert.match(tokens, re, `${name} must fall back to exactly ${literal}`);
  }
});

test('the plugin never imports @neomodul/branding — the coupling is a CSS-variable namespace only', () => {
  // Match an actual module edge (import/require), not the many prose mentions of branding in the
  // comments that explain WHY there is no such edge.
  const importRe = /(?:import[^;\n]*from\s*|require\(\s*)['"]@neomodul\/branding['"]/;
  for (const rel of ['client/console/tokens.ts', 'client/console/shell.tsx']) {
    assert.doesNotMatch(read(rel), importRe, `${rel} must not depend on branding at runtime`);
  }
});

test('shell.tsx consumes each contract role at its documented spot', () => {
  const shell = read('client/console/shell.tsx');
  // Bar slot: active ink = brand-primary + a 2px green top rule, inactive = ink-muted.
  assert.match(shell, /color:\s*p\.active\s*\?\s*NM\.brand\s*:\s*NM\.inkMuted/);
  assert.match(shell, /borderTop:\s*`2px solid \$\{p\.active \? NM\.brand : 'transparent'\}`/);
  // Bar/sheet surface + hairline.
  assert.match(shell, /background:\s*NM\.surfaceCard/);
  assert.match(shell, /1px solid \$\{NM\.lineSubtle\}/);
  // "Mehr" sheet rows (custom, not antd Menu): section header ink, active-row fill, active-row
  // brand ink + 2px green left rule, normal-row ink — the catalog console look, 1:1.
  assert.match(shell, /textTransform:\s*'uppercase',\s*color:\s*NM\.inkSubtle/);
  assert.match(shell, /background:\s*on\s*\?\s*NM\.navActive\s*:\s*'transparent'/);
  assert.match(shell, /color:\s*on\s*\?\s*NM\.brand\s*:\s*NM\.ink/);
  assert.match(shell, /borderLeft:\s*`2px solid \$\{on \? NM\.brand : 'transparent'\}`/);
});

test('tokens.ts maps each NM key to the right --nm-* role (names cannot silently swap)', () => {
  const tokens = read('client/console/tokens.ts');
  const pairs = [
    ['brand', '--nm-brand-primary'],
    ['inkMuted', '--nm-ink-muted'],
    ['inkSubtle', '--nm-ink-subtle'],
    ['navActive', '--nm-nav-active'],
    ['surfaceCard', '--nm-surface-card'],
    ['lineSubtle', '--nm-line-subtle'],
  ];
  for (const [key, name] of pairs) {
    const re = new RegExp(`${key}:\\s*'var\\(${name},`);
    assert.match(tokens, re, `NM.${key} must read ${name}`);
  }
});
