// src/server/lib/template.ts
// -----------------------------------------------------------------------------
// Tiny, safe template + condition evaluation for workflow node configs.
// NO eval / new Function — placeholders are dotted paths into the run scope:
//   {{input.address}}        the run input
//   {{nodes.geo.body.0.lat}} a previous node's output (by node id)
//   {{item}} / {{index}}     current loop item / index
//   {{run.id}}               run metadata
// A string that is EXACTLY one placeholder resolves to the raw value (objects,
// arrays and numbers survive untouched); placeholders embedded in longer text
// are stringified (objects as JSON). Pure module — unit-tested directly.

export type Scope = Record<string, any>;

const WHOLE_RE = /^\{\{\s*([^{}]+?)\s*\}\}$/;
const PART_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function getPath(obj: any, path: string): any {
  if (!path) return undefined;
  let cur = obj;
  for (const raw of path.split('.')) {
    const key = raw.trim();
    if (cur == null) return undefined;
    cur = cur[key as any];
  }
  return cur;
}

function toText(v: any): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Resolve templates in a string. */
export function resolveString(s: string, scope: Scope): any {
  const whole = s.match(WHOLE_RE);
  if (whole) return getPath(scope, whole[1]);
  return s.replace(PART_RE, (_m, p1) => toText(getPath(scope, String(p1))));
}

/** Deep-resolve templates in any JSON-ish value (strings inside objects/arrays). */
export function resolveTemplates(value: any, scope: Scope): any {
  if (typeof value === 'string') return resolveString(value, scope);
  if (Array.isArray(value)) return value.map((v) => resolveTemplates(v, scope));
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveTemplates(v, scope);
    return out;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Condition node evaluation: { left, op, right } with templated sides.

export type ConditionConfig = { left?: any; op?: string; right?: any };

function asNumber(v: any): number | null {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

export function evalCondition(cfg: ConditionConfig | undefined, scope: Scope): boolean {
  if (!cfg) return true;
  const left = resolveTemplates(cfg.left, scope);
  const right = resolveTemplates(cfg.right, scope);
  const op = String(cfg.op ?? 'truthy');
  switch (op) {
    case 'eq':
      return String(left ?? '') === String(right ?? '');
    case 'ne':
      return String(left ?? '') !== String(right ?? '');
    case 'gt': {
      const l = asNumber(left);
      const r = asNumber(right);
      return l != null && r != null && l > r;
    }
    case 'gte': {
      const l = asNumber(left);
      const r = asNumber(right);
      return l != null && r != null && l >= r;
    }
    case 'lt': {
      const l = asNumber(left);
      const r = asNumber(right);
      return l != null && r != null && l < r;
    }
    case 'lte': {
      const l = asNumber(left);
      const r = asNumber(right);
      return l != null && r != null && l <= r;
    }
    case 'contains': {
      if (Array.isArray(left)) return left.map((x) => String(x)).includes(String(right ?? ''));
      return String(left ?? '').includes(String(right ?? ''));
    }
    case 'empty':
      return left == null || String(left) === '' || (Array.isArray(left) && left.length === 0);
    case 'notEmpty':
      return !(left == null || String(left) === '' || (Array.isArray(left) && left.length === 0));
    case 'truthy':
    default:
      return !!left;
  }
}

/** Truncate a JSON-ish value for step persistence (keeps rows small). */
export function truncateJson(value: any, maxChars = 8000): any {
  if (value === undefined) return null;
  let s: string;
  try {
    s = JSON.stringify(value);
  } catch {
    s = String(value);
  }
  if (s == null) return null;
  if (s.length <= maxChars) return value;
  return { __truncated: true, preview: s.slice(0, maxChars) };
}
