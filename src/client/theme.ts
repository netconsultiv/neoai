// src/client/theme.ts
// -----------------------------------------------------------------------------
// Neomodul brand theme — VERBATIM copy of the Konfigurator's NEOHOME_THEME
// (src/client/pages/ConfiguratorPage.tsx) so the NeoAI console is pixel-
// consistent with the Catalog Console. Brand guide: green #009900 as the 10%
// accent, graphite text, Inter, white/off-white grounds.

export const NEOHOME_GREEN = '#009900';
export const NEOHOME_GREEN_DARK = '#007a00';
export const NEOHOME_INK = '#1b1e21';
export const NEOHOME_FONT = "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif";

export const NEOHOME_THEME = {
  token: {
    colorPrimary: NEOHOME_GREEN,
    colorInfo: NEOHOME_GREEN,
    colorLink: NEOHOME_GREEN,
    colorLinkHover: NEOHOME_GREEN_DARK,
    colorTextHeading: NEOHOME_INK,
    borderRadius: 10,
    borderRadiusLG: 14,
    colorBorder: '#e7e7e3',
    colorBorderSecondary: '#f1f1ef',
    fontFamily: NEOHOME_FONT,
    fontSize: 14,
    wireframe: false,
  },
  components: {
    Button: { controlHeight: 36, borderRadius: 20, fontWeight: 600 },
    Collapse: { headerPadding: '14px 16px', contentPadding: '6px 16px 14px' },
    Card: { borderRadiusLG: 14, paddingLG: 18 },
    Tag: { borderRadiusSM: 6, defaultColor: NEOHOME_INK },
    Steps: { fontSizeLG: 15 },
    Input: { borderRadius: 10 },
    Select: { borderRadius: 10 },
    Modal: { borderRadiusLG: 14, titleFontSize: 17, titleColor: NEOHOME_INK },
    Tooltip: { borderRadius: 8, colorBgSpotlight: NEOHOME_INK },
    Popover: { borderRadiusLG: 12 },
    Table: { borderRadius: 10, headerBg: '#f7faf7', headerColor: NEOHOME_INK, rowHoverBg: '#f3fbf3' },
    Menu: { itemBorderRadius: 9, itemSelectedBg: '#eaf7ea', itemSelectedColor: NEOHOME_GREEN, itemActiveBg: '#f3fbf3' },
  },
};

// Inter kommt aus @neomodul/branding, nicht mehr von Google (2026-07-31, Ticket 5296c4aa).
//
// Hier stand bis dahin ein `<link>` auf fonts.googleapis.com, mit dem Kommentar "same URL
// the Konfigurator's V3 shell injects" — und genau das war das Problem: DREI Plugins hielten
// unabhängig voneinander eine eigene Kopie derselben Fremdreferenz, und keines wusste von den
// anderen. Gefunden wurde sie auf den anonymen Kundenflächen; diese hier liegt hinter der
// Anmeldung, ist also rechtlich entspannter — aber es ist derselbe Defekt, und ihn beim
// selben Durchgang stehen zu lassen hieße nur, ihn später ein zweites Mal zu suchen.
//
// @neomodul/branding deklariert die Schrift per @font-face aus seinem eigenen
// dist/client/fonts/ (Achse 100–900, font-display: swap) und lädt in derselben SPA wie diese
// Konsole. `ensureInterFont()` bleibt als NO-OP bestehen, damit die beiden Aufrufer
// (NeoaiConsole, KnowledgeConsole) nicht angefasst werden müssen und niemand versucht ist,
// die Einbindung "wiederherzustellen" — die Begründung steht damit an der Stelle, an der
// jemand sie suchen würde.
export function ensureInterFont() {
  // absichtlich leer, siehe oben
}
