// src/client/console/tokens.ts
// -----------------------------------------------------------------------------
// NeoAI bottom-bar design tokens — the CONSUMER side of the @neomodul/branding
// `--nm-*` custom-property contract (NEOB-14/NEOB-18). branding publishes this
// exact token set centrally (src/client/navTokens.ts on :root for Light,
// designTokens.ts inline on <html> for Dark); the CRM bottom bar reads the same
// namespace, so a single central branding change themes both consoles.
//
// THE NEOB-18 CONTRACT — the six roles the bottom bar reads, verbatim
// --------------------------------------------------------------------------
//   Role                          Token               Light      Dark
//   Aktiv-Ink / grünes Highlight  --nm-brand-primary  #009900    #37b437
//   Inaktiv-Ink (bar)             --nm-ink-muted      #676b64    #b8b8b8
//   Section-Header-Ink ("Mehr")   --nm-ink-subtle     #8a908a    #949494
//   Aktive-Zeile-Füllung ("Mehr") --nm-nav-active     #eef4ec    #213021
//   Bar-/Sheet-Fläche             --nm-surface-card   #fcfcfa    #1d1d1d
//   Bar-/Sheet-Hairline           --nm-line-subtle    #ececec    #2e2e2e
//
// WHY THIS IS SAFE WITHOUT BRANDING (graceful fallback, the hard requirement)
// --------------------------------------------------------------------------
// Every entry is `var(--nm-x, <literal>)` and the literal is EXACTLY the Light
// default above. When @neomodul/branding is absent the custom property is
// undefined, so the literal wins and the bar renders in its own default design —
// no import of, and no runtime dependency on, branding. When branding IS present
// it stamps the `--nm-*` set (and `data-nm-tokens="dark|light"`) on <html> and
// every surface below follows automatically, Dark included. That is the whole
// coupling: a CSS-variable namespace, no code branch, no `@neomodul/branding`
// import anywhere in this plugin.
//
// These literals are the CONTRACT DEFAULTS, not decoration — they must never be
// "cleaned up" or drifted: the fallback is what keeps the no-branding default
// looking right, and matching branding's own Light values is what makes the
// with/without-branding transition seamless.

/** Inline-style / CSS-string tokens. Safe anywhere a CSS value is accepted. */
export const NM = {
  /** Page ground behind the console content (branding: --nm-surface-app). Not
   *  part of the six-role bar contract, but flips with branding in Dark. */
  surfaceApp: 'var(--nm-surface-app, #f7f8f4)',
  /** Bar-/Sheet-Fläche — the bottom bar and the "Mehr" sheet sit on this. */
  surfaceCard: 'var(--nm-surface-card, #fcfcfa)',
  /** Bar-/Sheet-Hairline — the bar's top border and the sheet's close-bar rule. */
  lineSubtle: 'var(--nm-line-subtle, #ececec)',
  /** Primary ink — normal "Mehr"-sheet row text (branding: --nm-ink). */
  ink: 'var(--nm-ink, #1b1e21)',
  /** Inaktiv-Ink — the inactive bottom-bar slot. */
  inkMuted: 'var(--nm-ink-muted, #676b64)',
  /** Section-Header-Ink — the "Mehr"-sheet group titles. */
  inkSubtle: 'var(--nm-ink-subtle, #8a908a)',
  /** Aktive-Zeile-Füllung — the active row's fill inside the "Mehr" sheet. */
  navActive: 'var(--nm-nav-active, #eef4ec)',
  /** Aktiv-Ink / grünes Highlight — the active bottom-bar slot and the active
   *  "Mehr"-sheet row's ink. */
  brand: 'var(--nm-brand-primary, #009900)',
} as const;

/** Graphite topbar ground — the fixed brand primitive (never theme-swapped),
 *  same value the CRM/Neomodul brand topbar uses (#191A19). */
export const BRAND_GRAPHITE = '#191A19';
