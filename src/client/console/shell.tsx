// src/client/console/shell.tsx
// -----------------------------------------------------------------------------
// The NeoAI console chrome — an adaptive bottom bar as the SINGLE console
// navigation on every viewport, ported 1:1 from the CRM navigation pattern
// (neomodul-crm src/client/console/shell.tsx, NEOB-7) and adapted to NeoAI:
//
//  * NeoAI navigates by ROUTE (each area is a registered /neoai/<key> route,
//    the active area is derived from the pathname) rather than by internal
//    state — so `onSelect(key)` performs the navigation and `activeKey` comes
//    from the caller. The bar/overflow behaviour is otherwise identical.
//  * The bar is the only navigation at all widths: it shows as many area slots
//    as the measured width affords (Priority+), pushing the rest — plus the
//    cross-links (Automation / Admin) — under a trailing "Mehr" sheet.
//  * Settings is a NORMAL last area (lowest priority): last bar slot, first to
//    drop into "Mehr", and rendered dead-last there — the CRM's settings rule.
//  * No @neomodul/branding import: chrome colours come from the `--nm-*`
//    consumer tokens (tokens.ts) which fall back to a sensible default design
//    when branding is absent and are centrally themed when it is present.
//
// Icons: the client bundle must not import @ant-design/icons (AMD externals
// contract) — NocoBase's own Icon renders registry icons by NAME.
import React, { useEffect, useState } from 'react';
import { Drawer, Layout, Menu } from 'antd';
import { Icon } from '@nocobase/client';
import { NEOMODUL_FAVICON_SRC } from '../logo';
import { NEOHOME_GREEN } from '../theme';
import { NM, BRAND_GRAPHITE } from './tokens';

// Icon-by-name via the NocoBase registry; tolerate a missing export or an
// unknown name (undefined → antd Menu / the slot simply renders no icon).
const ico = (name?: string) => {
  if (!name || !Icon) return undefined;
  const AnyIcon: any = Icon;
  return <AnyIcon type={name} />;
};

export type NavItem = { key: string; label: string; icon?: string };
// A cross-link leaves the console (NocoBase workflow admin, /admin). It is
// carried through the bar/sheet as a `href:`-prefixed key and navigated
// directly, exactly like the CRM's cross-console entries.
export type CrossLink = { label: string; icon?: string; href: string };

// The narrowest a bar slot may get before an item moves into "Mehr" — sized so
// an icon + a short label stay legible (matches the CRM's SLOT_MIN).
const BOTTOM_NAV_SLOT_MIN = 76;
// Settings is the lowest-priority area and belongs dead-last in the overflow
// sheet ("config at the very bottom"). Identified by this key.
const SETTINGS_KEY = 'settings';

/**
 * A small graphite/green brand header. Shown only for the standalone `/neoai`
 * routes; nested `/admin` routes already sit under NocoBase's ProLayout topbar,
 * so we skip it there to avoid a doubled header (the CRM's rule).
 */
function NeoaiTopbar() {
  return (
    <header
      data-testid="neoai-topbar"
      style={{
        minHeight: 48,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 16px',
        background: BRAND_GRAPHITE,
        borderBottom: `3px solid ${NEOHOME_GREEN}`,
        color: '#fff',
        flexShrink: 0,
      }}
    >
      <img src={NEOMODUL_FAVICON_SRC} alt="Neomodul" style={{ width: 24, height: 24, borderRadius: 6 }} />
      <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-.01em' }}>NeoAI</span>
    </header>
  );
}

/**
 * The console's single navigation on every viewport. `items` is the ONE logical
 * order (declared by the caller, Settings last); `bottomKeys` only signals the
 * opt-in and the count to show before the first width measurement. The bar shows
 * as many slots as the width affords (>= SLOT_MIN each) and pushes the overflow —
 * together with the cross-links — under a trailing "Mehr" bottom sheet.
 */
function BottomNav(props: {
  items: NavItem[];
  bottomKeys: string[];
  crossLinks: CrossLink[];
  activeKey?: string;
  onSelect: (key: string) => void;
}) {
  const { items, bottomKeys, crossLinks, activeKey, onSelect } = props;
  const [moreOpen, setMoreOpen] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const navRef = React.useRef<HTMLDivElement | null>(null);

  // Measure the bar and publish the safe area it consumes, so any future
  // bottom-anchored chrome can subtract it (the CRM's --nm-bottom-nav-height
  // contract). Also drives the adaptive slot count off the real width.
  useEffect(() => {
    const root = document.documentElement;
    const node = navRef.current;
    if (!node) return undefined;
    const publish = () => {
      const rect = node.getBoundingClientRect();
      const height = Math.round(rect.height);
      if (height > 0) root.style.setProperty('--nm-bottom-nav-height', `${height}px`);
      root.setAttribute('data-nm-bottom-nav', '1');
      setBarWidth(Math.round(rect.width));
    };
    publish();
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(publish) : null;
    observer?.observe(node);
    return () => {
      observer?.disconnect();
      root.removeAttribute('data-nm-bottom-nav');
      root.style.removeProperty('--nm-bottom-nav-height');
    };
  }, []);

  const activate = (key: string) => {
    if (key.startsWith('href:')) window.location.href = key.slice(5);
    else onSelect(key);
  };

  // ONE logical order: exactly the areas the caller declared (Settings last).
  const ordered = items;
  // How many slots fit? Reserve one for the pinned trailing "Mehr". Before the
  // first measurement (barWidth 0) fall back to the opt-in count so the bar does
  // not flash every area on a phone.
  const fit = barWidth > 0 ? Math.max(1, Math.floor(barWidth / BOTTOM_NAV_SLOT_MIN)) : bottomKeys.length + 1;
  const visibleCount = Math.max(1, Math.min(ordered.length, fit - 1));
  const visible = ordered.slice(0, visibleCount);
  const overflow = ordered.slice(visibleCount);
  const overflowAreas = overflow.filter((it) => it.key !== SETTINGS_KEY);
  const settingsItem = ordered.find((it) => it.key === SETTINGS_KEY);
  const settingsInOverflow = overflow.some((it) => it.key === SETTINGS_KEY);
  // "Mehr" order: the areas that did not fit, then the cross-links, then
  // Settings dead last (config belongs at the very bottom).
  const rest: NavItem[] = [
    ...overflowAreas,
    ...crossLinks.map((l) => ({ key: `href:${l.href}`, label: l.label, icon: l.icon })),
    ...(settingsInOverflow && settingsItem ? [settingsItem] : []),
  ];
  // Light the "Mehr" slot when the active area is hiding inside it.
  const moreActive = moreOpen || overflowAreas.some((it) => it.key === activeKey);

  const Slot = (p: { active: boolean; icon?: string; label: string; onClick: () => void; testId?: string }) => (
    <button
      type="button"
      data-testid={p.testId}
      onClick={p.onClick}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        border: 'none',
        background: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '6px 2px',
        color: p.active ? NM.brandInk : NM.inkMuted,
        fontWeight: p.active ? 600 : 400,
        fontSize: 11,
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>{ico(p.icon)}</span>
      <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.label}</span>
    </button>
  );

  return (
    <>
      <div
        ref={navRef}
        data-testid="neoai-bottom-nav"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 950,
          display: 'flex',
          background: NM.surfaceCard,
          borderTop: `1px solid ${NM.lineChrome}`,
          boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
        }}
      >
        {visible.map((it) => (
          <Slot key={it.key} active={activeKey === it.key} icon={it.icon} label={it.label} onClick={() => activate(it.key)} />
        ))}
        <Slot active={moreActive} icon="MoreOutlined" label="More" onClick={() => setMoreOpen(true)} testId="neoai-bottom-nav-more" />
      </div>
      <Drawer
        // No title, no top-left ✕ (closable={false}): the sheet is a plain
        // reachable list; the close affordance is a slot at the BOTTOM-RIGHT,
        // where the thumb that just tapped "Mehr" already rests.
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        getContainer={false}
        placement="bottom"
        // Height follows the content (rows + the close bar's clearance), capped
        // so a long list still scrolls.
        height={`min(${rest.length * 44 + 64}px, 88vh)`}
        closable={false}
        rootStyle={{ position: 'fixed' }}
      >
        <Menu
          mode="inline"
          items={rest.map((it) => ({ key: it.key, label: it.label, icon: ico(it.icon) }))}
          selectedKeys={activeKey ? [activeKey] : []}
          onClick={(e: any) => {
            setMoreOpen(false);
            const key = String(e.key ?? '');
            if (key.startsWith('href:')) window.location.href = key.slice(5);
            else onSelect(key);
          }}
          style={{ borderInlineEnd: 'none', paddingBottom: 56 }}
        />
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1001,
            display: 'flex',
            justifyContent: 'flex-end',
            background: NM.surfaceCard,
            borderTop: `1px solid ${NM.lineChrome}`,
            boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setMoreOpen(false)}
            style={{
              flex: '0 0 25%',
              minWidth: 0,
              border: 'none',
              background: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '6px 2px',
              color: NM.inkMuted,
              fontWeight: 400,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{ico('CloseOutlined')}</span>
            <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Close</span>
          </button>
        </div>
      </Drawer>
    </>
  );
}

/**
 * The console shell: an optional graphite brand topbar (standalone only), the
 * content region with clearance for the fixed bar, and the adaptive bottom bar.
 *
 * Panels self-pad, so — unlike the CRM shell — the content region adds only the
 * bottom-bar clearance, not the console inset, to keep every existing panel
 * rendering exactly as before.
 */
export function ConsoleShell(props: {
  items: NavItem[];
  bottomKeys: string[];
  crossLinks?: CrossLink[];
  activeKey?: string;
  onSelect: (key: string) => void;
  banner?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { items, bottomKeys, crossLinks, activeKey, onSelect, banner, children } = props;
  const insideAdminShell = /^\/admin(?:\/|$)/.test(window.location.pathname);

  return (
    <Layout style={{ minHeight: '100vh', background: NM.surfaceApp }}>
      {!insideAdminShell ? <NeoaiTopbar /> : null}
      <Layout.Content
        style={{
          // Only bottom clearance for the fixed bar — panels bring their own
          // padding, so the top/side inset is intentionally left to them.
          paddingBottom: 72,
          background: NM.surfaceApp,
          position: 'relative',
          overflow: 'auto',
        }}
      >
        {banner}
        {children}
      </Layout.Content>
      <BottomNav items={items} bottomKeys={bottomKeys} crossLinks={crossLinks ?? []} activeKey={activeKey} onSelect={onSelect} />
    </Layout>
  );
}
