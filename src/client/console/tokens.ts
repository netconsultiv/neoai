// src/client/console/tokens.ts
// -----------------------------------------------------------------------------
// NeoAI console design tokens — the CONSUMER side of the @neomodul/branding
// `--nm-*` custom-property contract (NEOB-13/NEOB-14), shared 1:1 with the CRM
// (neomodul-crm src/client/console/tokens.ts, NEOB-7) so both consoles read the
// SAME token namespace and a central branding change themes them identically.
//
// WHY THIS IS SAFE WITHOUT BRANDING (graceful fallback, the hard requirement)
// --------------------------------------------------------------------------
// Every entry is `var(--nm-x, <literal>)`. When @neomodul/branding is absent the
// custom property is undefined, so the literal fallback wins and the console
// renders with its own sensible default design — no import of, and no runtime
// dependency on, branding. When branding IS present it stamps the `--nm-*` set
// (and `data-nm-tokens="dark|light"`) on <html> and every surface below follows
// automatically. That is the whole coupling: a CSS-variable namespace, no code
// branch, no `@neomodul/branding` import anywhere in this plugin.
//
// These constants must NEVER be "cleaned up" into bare hex again — the fallback
// is what keeps the no-branding default working.

/** Inline-style / CSS-string tokens. Safe anywhere a CSS value is accepted. */
export const NM = {
  /** Page ground behind the console content. */
  surfaceApp: 'var(--nm-surface-app, #f7f8f4)',
  /** Card / bar ground (the bottom bar and the "Mehr" sheet sit on this). */
  surfaceCard: 'var(--nm-surface-card, #ffffff)',
  /** Standard hairline. */
  line: 'var(--nm-line, #e7e7e3)',
  /** The shell chrome divider — the bottom bar's top border (matches the old
   *  sidebar's #ececea rule for a byte-identical light default). */
  lineChrome: 'var(--nm-line-subtle, #ececea)',
  /** Primary ink. */
  ink: 'var(--nm-ink, #1b1e21)',
  /** Secondary/meta ink — the inactive bottom-bar slot. */
  inkMuted: 'var(--nm-ink-muted, #595959)',
  /** Brand green as a fill/accent. */
  brand: 'var(--nm-brand-primary, #009900)',
  /** Brand green as TEXT on the light card (active bottom-bar slot). A plain
   *  #009900 is only ~2.4:1 on white; the darker default clears AA, and branding
   *  substitutes its own dark-mode brand ink via the same variable. */
  brandInk: 'var(--nm-brand-primary, #007a00)',
} as const;

/** Graphite topbar ground — the fixed brand primitive (never theme-swapped),
 *  same value the CRM/Neomodul brand topbar uses (#191A19). */
export const BRAND_GRAPHITE = '#191A19';
