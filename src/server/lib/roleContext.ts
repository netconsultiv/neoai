// src/server/lib/roleContext.ts
// -----------------------------------------------------------------------------
// Who is on this request, and may they operate NeoAI?
//
// Lived in `env.ts` until ticket 13c027fa. It never belonged there: `env.ts` answers "what did the
// operator put in the environment", this answers "what did the ACL decide about this caller" —
// and the two were sharing a file only because both were one-liners. Its own module also means it
// imports NOTHING, so `node --test` exercises the real gate instead of a copy of it.
//
// ── TWO DEFECTS ARE CLOSED HERE (ticket 13c027fa) ────────────────────────────────────────────────
//
// 1. ROLE SWITCHING DID NOT WORK. The old gate was:
//
//        const role = String(ctx?.state?.currentRole ?? '');
//        if (ADMIN_ROLES.has(role)) return true;
//        // Fallback: some auth paths populate roles on the user instead.
//        const roles: any[] = ctx?.state?.currentUser?.roles ?? [];
//        return roles.some((r) => ADMIN_ROLES.has(String(r?.name ?? r)));
//
//    The comment's premise is false. `@nocobase/plugin-acl`'s `setCurrentRole.js:75` sets
//    `ctx.state.currentUser.roles = userRoles` on EVERY authenticated request — it is not a
//    fallback for exotic auth paths, it is the account's full MEMBERSHIP LIST, written
//    unconditionally and independently of `X-Role`. So the second line always ran, and it always
//    saw every role the account holds. Measured on :13000, one account, one token, 2026-07-31:
//
//        user 1 holds root,admin,pdf_operator,architect,member
//        X-Role: member    → neoai:secretsList 200   ← switched to a non-admin role, still admin
//        X-Role: architect → neoai:secretsList 200
//        control account holding eight NON-admin roles, any of them → 403
//
//    The control is the proof: it was account membership, never the active role.
//
// 2. THE ADMIN LIST WAS HARDCODED. `ADMIN_ROLES = new Set(['root', 'admin'])` decides policy in
//    code that a deployment cannot see or change, and it silently disagrees with the ACL — the
//    plugin already registers the snippet `pm.neoai.settings`, so the deployment had ALREADY said
//    who may operate NeoAI, in the place built for saying it, and the code ignored the answer.
//    "admin" is not a magic word; it is whichever roles carry the grant. Now the ACL is asked.

/** The snippet that owns NeoAI's admin surface. Must stay identical to the name `plugin.ts` hands
 *  to `acl.registerSnippet` — that registration is what defines the snippet, this constant is what
 *  the gate below asks about, and a typo in either makes the gate answer about a snippet nobody
 *  holds (i.e. refuse everyone). There is deliberately no client-side counterpart: NeoAI's console
 *  is mounted as nested admin routes rather than through `pluginSettingsManager`, so it has no
 *  `aclSnippet` to keep in step. */
export const NEOAI_ADMIN_SNIPPET = 'pm.neoai.settings';

// ── ROLLEN-SAMMLER · KANONISCH v1 — ZEICHENGLEICH IN NEUN PLUGIN-REPOS ──────────────────────────
//
// Diese Funktion beantwortet die eine Frage "welche Rollen trägt DIESER Aufruf?" und ist in
// konfigurator, crm, pdf-generator, design-studio, neoai, unified-search, cloudflare,
// saved-filters und table-views zeichengleich. Sie wird NICHT lokal angepasst.
//
// WARUM ZEICHENGLEICH UND NICHT "SINNGEMAESS GLEICH": neun eigene Antworten auf dieselbe Frage
// sind die Bauform, ueber die die Fehlerklasse aus Ticket 13c027fa ein Plugin nach dem anderen
// zurueckkommt. Dort las ein Plugin `ctx.state.currentUser.roles` — die MITGLIEDSCHAFTSLISTE des
// Kontos, die `@nocobase/plugin-acl`'s `setCurrentRole` auf JEDER Anfrage schreibt, unabhaengig von
// `X-Role` — statt der aktiven Rolle. Rollenumschaltung wirkte damit gar nicht: gemessen bekam ein
// Konto mit `member,root,admin,pdf_operator,architect` unter `X-Role: member` weiterhin 200,
// waehrend ein Konto, das NUR `architect` haelt, 403 bekam. Der Ein-Rollen-Vergleich ist der Beleg,
// dass Konto-MITGLIEDSCHAFT gewertet wurde und nicht die Rolle.
//
// DIE QUELLE: `ctx.state.currentRoles`, mit `[ctx.state.currentRole]` nur als Rueckfall. Das
// spiegelt `@nocobase/acl/lib/acl.js:302` — `const roles = ctx.state.currentRoles || [roleName]` —
// wortgleich, kann also nie von der Ableitung abweichen, die die ACL-Schicht einen Moment vorher
// selbst gefahren hat. `currentUser.roles` ist wer man IST, `currentRoles` ist als wen man
// HANDELT; Autorisierung ist das Zweite. `X-Role` ist Client-Eingabe und wird hier nie gelesen.
//
// EINE EINZIGE BEWUSSTE ABWEICHUNG VON acl.js:302, und sie gehoert benannt statt verschwiegen:
// dort ist `roleName` selbst `ctx.state.currentRole || 'anonymous'`, die ACL faellt also auf die
// REGISTRIERTE Rolle `anonymous` zurueck. Hier nicht. Diese Funktion versorgt Privilegien-Tore,
// und ein Aufrufer, dessen Rolle der Server nicht aufloesen konnte, darf nicht mit einem
// Rollennamen weitergereicht werden, dem eine Installation etwas zugeteilt haben kann. Die Folge
// ist strikt ENGER — leere Liste statt `['anonymous']`, also nie MEHR Rechte, hoechstens ein
// ehrliches Nein. Wer eine Ressource absichtlich fuer Anonyme oeffnet, tut das ueber die ACL
// (`acl.allow`) oder eine ausdrueckliche Entscheidung in der Fachschicht — nicht dadurch, dass
// dieser Sammler einen Namen erfindet, den der Server nicht bestaetigt hat. crm trug den
// Rueckfall bis 2026-08-03 als einziges der neun Repos; gemessen hing dort kein Aufrufer daran
// (`decideCrmAccess` erreicht den Rollen-Zweig erst nach `if (!q.authenticated) return {…false}`).
//
// `__union__` WIRD VERWORFEN — gemessen, nicht vermutet. Unter `roleMode = onlyUseUnion` setzt
// NocoBase `currentRole` auf das Pseudo `__union__` und `currentRoles` auf ALLE Rollen des Kontos;
// die Union IST dort die aktive Rolle, `currentRoles` bleibt also in beiden Modi die richtige
// Quelle. Das Pseudo selbst ist serverseitig NIE eine registrierte ACL-Rolle: `getCanByRole()`
// schlaegt mit `this.roles.get(role)` nach und liefert `null` fuer jeden unbekannten Namen, und
// `__union__` kommt im Serverbaum nur in `helper.js` als Variablen-Marker vor. Es stehenzulassen
// kann daher nie etwas GEWAEHREN — aber es kann jeden Verbraucher irrefuehren, der die Liste fuer
// etwas anderes als eine `can()`-Abfrage nutzt (Stufen-Zuordnung, Eigentum, Namensvergleich,
// Protokoll). Verwerfen ist strikt enger und verliert nachweislich keine Berechtigung.
//
// KEINE KLEINSCHREIBUNG hier: die ACL vergleicht Rollennamen zeichengenau (`this.roles.get(role)`),
// eine Rolle namens `Admin` waere durch Kleinschreibung unauffindbar. Fachschichten, die gegen
// eine eigene Tabelle von Rollennamen vergleichen (design-studio, konfigurator), normalisieren
// darueber — nie hier drin.
//
// SCHEITERT GESCHLOSSEN: kein State, keine Rollen, nichts aufloesbar ⇒ leere Liste ⇒ nicht
// privilegiert. Ein Aufrufer, dessen Rollen nicht bestimmbar sind, ist kein Administrator.
//
// ⚠️ AENDERUNGEN NUR IN ALLEN NEUN REPOS GLEICHZEITIG. Der Waechter
// `test/role-collector-canonical.test.mjs` zaehlt in jedem Repo die Fundstellen dieses Blocks und
// vergleicht sie zeichenweise gegen die dort hinterlegte Pruefsumme; `./sandbox.sh role-collector`
// im neobase-Superprojekt vergleicht diese Pruefsumme ueber alle neun Repos hinweg. Ein einzelnes
// Repo anzupassen macht beide rot.
export function rolesOfContext(ctx: any): string[] {
  const raw = ctx?.state?.currentRoles;
  // `|| [Einzahl]` und nicht "beide verschmelzen": der Rueckfall greift nur, wenn die Mehrzahl
  // fehlt oder leer ist — die eine Gestalt, die `setCurrentRole` auf seinem fruehen Ausstieg fuer
  // `X-Role: anonymous` hinterlaesst. Verschmelzen waere auf jeder Gestalt, die jene Schicht
  // erzeugt, gleichwertig (sie setzt `currentRole` nie auf eine in `currentRoles` fehlende Rolle) —
  // aber "enger oder gleich dem, was die ACL gewertet hat" ist die Eigenschaft, die zaehlt, nicht
  // "heute gleichwertig".
  const list: any[] = Array.isArray(raw) && raw.length ? raw : [ctx?.state?.currentRole];
  const names: string[] = [];
  for (const entry of list) {
    // Eine Rolle kommt als blanker Name, als Zeile/Modell mit `name`/`role`, oder als
    // Sequelize-Modell, das nur ueber `get('name')` herausrueckt. Alle drei Gestalten sind auf
    // diesem Stapel gesehen worden; eine Rolle, welche die ACL gewertet hat, hier fallen zu
    // lassen waere eine falsche Ablehnung, keine sichere.
    const entryAny = entry as any;
    const name =
      typeof entry === 'string' ? entry : entryAny?.name ?? entryAny?.role ?? entryAny?.get?.('name');
    const trimmed = typeof name === 'string' ? name.trim() : '';
    if (!trimmed || trimmed === '__union__') continue;
    if (!names.includes(trimmed)) names.push(trimmed);
  }
  return names;
}
// ── ENDE ROLLEN-SAMMLER · KANONISCH v1 ─────────────────────────────────────────────────────────

/** The action this request is really asking for, as the ACL spells it. Falls back to the wildcard
 *  the snippet is registered with, so a call made outside an action context is still answerable
 *  (and still answered by the snippet, not by a guess). */
export function neoaiActionPath(ctx: any): string {
  const action = ctx?.action?.actionName;
  return `neoai:${typeof action === 'string' && action.trim() ? action.trim() : '*'}`;
}

/**
 * May this caller operate NeoAI?
 *
 * Asked of the SNIPPET rather than of `acl.can()`, for the reason design-studio's `isOperator`
 * documents: `snippetAllowed()` answers `true` only for a role that really carries the grant,
 * `false` for one that rejects it (`!pm.*`), and `null` for one that mentions neither — and `null`
 * must not pass. `can()` would additionally consult the role's blanket STRATEGY, and a strategy
 * carrying `["view","create","update"]` (which `sales`, `partner_success` and `project_lead` are
 * shipped with) is exactly the widening this gate exists to refuse.
 *
 * `root` is short-circuited the way the framework does it itself — `@nocobase/acl/lib/acl.js`
 * `getCanByRole()` returns a grant for `root` before consulting anything else — so this gate
 * agrees with `can()` even on a deployment whose `root` row carries no snippets. That is the one
 * role name in this file, and it is a framework invariant being mirrored, not a policy decision
 * being taken.
 *
 * Fails CLOSED on every uncertainty: no ACL, no roles, no explicit `true` ⇒ not an admin.
 */
export function isAdminCtx(acl: any, ctx: any): boolean {
  if (!acl || typeof acl.getRole !== 'function') return false;
  const actionPath = neoaiActionPath(ctx);
  for (const role of rolesOfContext(ctx)) {
    if (role === 'root') return true;
    let verdict: unknown = null;
    try {
      verdict = acl.getRole(role)?.snippetAllowed?.(actionPath);
    } catch {
      verdict = null;
    }
    if (verdict === true) return true;
  }
  return false;
}

// ── The gate, as a layer instead of 23 first lines (tickets b4f8730e / 7466a838) ────────────────
//
// Until now every one of the 23 handlers opened with `requireAdmin(ctx)` and the ACL layer let
// EVERYTHING through (`acl.allow('neoai', '*', 'loggedIn')` sets `permission.skip`, which
// short-circuits `can()` entirely — project memory `nocobase-acl-snippets-und-strategy` §1). That
// held, because all 23 really did call it. It held by COUNTING, though: action #24 written on a
// Friday is open, and nothing says so.
//
// design-studio hit exactly this and answered it with two layers (§12). NeoAI now has the same
// shape: the blanket grant is gone, so the SNIPPET is the gate; and this middleware is the second
// layer that does not care whether `strategyResources` happens to be a Set or `null`. The
// per-handler `requireAdmin` stays as well — three cheap lines of defence in depth, so dropping the
// middleware registration by accident cannot silently open the surface.

/**
 * The actions that are open to every logged-in caller, and the ONLY ones.
 *
 * `access` publishes this plugin's own verdict about the CALLER — one boolean, nothing else. It
 * exists because a surface that cannot ask "may I?" has to guess, and NeoAI's console guessed by
 * rendering itself for everyone and then showing "Loading…" forever when the answer turned out to
 * be 403 (ticket 7466a838).
 *
 * Anything not on this list is gated. That default is the point: a new action is refused unless
 * someone deliberately writes its name here.
 */
export const NEOAI_OPEN_ACTIONS = ['access'] as const;

export function isOpenNeoaiAction(action: unknown): boolean {
  return typeof action === 'string' && (NEOAI_OPEN_ACTIONS as readonly string[]).includes(action);
}

/**
 * May this caller operate the NeoAI console AT ALL?
 *
 * The same question `isAdminCtx` answers, asked about the snippet's own wildcard rather than about
 * whichever action happens to be in flight — because the caller of THIS one is `access`, and
 * "may I open the console" is not "may I call access".
 */
export function mayOperateNeoai(acl: any, ctx: any): boolean {
  return isAdminCtx(acl, { ...ctx, state: ctx?.state, action: { actionName: '*' } });
}

/**
 * Refuse every gated `neoai:` action that this caller does not carry the snippet for.
 *
 * Register with `{ after: 'acl' }` — `ctx.state.currentRoles` is written by the ACL middleware, and
 * a `before` middleware would see no roles at all and therefore refuse everyone (§5).
 */
export function neoaiGateMiddleware(acl: any) {
  return async function neoaiAdminGate(ctx: any, next: any) {
    if (ctx?.action?.resourceName !== 'neoai') return next();
    if (isOpenNeoaiAction(ctx?.action?.actionName)) return next();
    if (!isAdminCtx(acl, ctx)) ctx.throw(403, 'NeoAI is admin-only for now');
    return next();
  };
}

/**
 * The boot guard: which `neoai` actions has someone waved past the ACL?
 *
 * `acl.allowManager.skipActions` is a `Map<resource, Map<action, condition>>`, and an entry in it
 * means `permission.skip` — `can()` is never consulted for that action. This reads the map back and
 * returns every `neoai` entry beyond `NEOAI_OPEN_ACTIONS`, which is exactly how the hole looked
 * before this ticket (`neoai:*`).
 *
 * Returning a list rather than throwing keeps the module import-free and testable; `plugin.ts`
 * turns a non-empty list into a refusal to start. A surface that quietly reopens is worse than a
 * plugin that will not boot — the same call design-studio made for its token surface.
 *
 * ⚠ IT LOOKS AT THE `neoai` RESOURCE ONLY, AND THAT IS NOT AN OVERSIGHT.
 *
 * The first version of this function also treated the `'*'` resource as a finding, on the
 * reasoning that `getAllowedConditions` consults `['*', resource]` and so a global grant covers
 * `neoai` too. That reasoning is correct and the guard would still have been WRONG — measured in
 * the running container before it ever shipped:
 *
 *     @nocobase/plugin-acl/dist/server/server.js:456
 *       this.app.acl.allow("*", "*", (ctx) => ctx.state.currentRoles?.includes("root"));
 *     @nocobase/plugin-action-import/dist/server/index.js:81
 *       dataSource.acl.allow("*", "downloadXlsxTemplate", "loggedIn");
 *
 * The framework registers `*:*` on EVERY boot — it is how `root` short-circuits — so a guard that
 * called that a finding would have thrown on every start and taken the whole application down. A
 * plugin may refuse to boot over ITS OWN surface being reopened; it may not refuse to boot over the
 * framework doing its job, and it has no business policing another plugin's grants. Those entries
 * carry a function condition, not a blanket `loggedIn`, and the root short-circuit is the same one
 * `isAdminCtx` mirrors deliberately.
 */
export function blanketNeoaiGrants(acl: any): string[] {
  const actions = acl?.allowManager?.skipActions?.get?.('neoai');
  if (!actions || typeof actions.forEach !== 'function') return [];
  const found: string[] = [];
  actions.forEach((_condition: unknown, action: string) => {
    if (isOpenNeoaiAction(action)) return;
    found.push(`neoai:${action}`);
  });
  return found;
}
