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

// Inter webfont (same URL the Konfigurator's V3 shell injects). The antd theme
// falls back to system fonts until it loads.
export const INTER_FONT_LINK =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';

export function ensureInterFont() {
  const id = 'neoai-inter-font';
  if (typeof document === 'undefined' || document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = INTER_FONT_LINK;
  document.head.appendChild(link);
}
