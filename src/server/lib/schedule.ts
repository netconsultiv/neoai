// src/server/lib/schedule.ts
// -----------------------------------------------------------------------------
// Dependency-free time triggers (scoping Q21: "Beides" — manual/function AND
// time/event-driven). Leaf plugins ship with ZERO runtime npm deps (node-cron
// belongs to the Konfigurator's own node_modules, not resolvable from here),
// so instead of cron expressions we support two honest, readable forms:
//
//   "every 15m" / "every 2h"      interval, anchored to the last run
//   "daily 07:00"                 once per calendar day at HH:MM (server time)
//
// parseSchedule() → spec | null (null = invalid/empty).
// isDue(spec, lastRunAt, now) → boolean. Pure module — unit-tested directly.

export type ScheduleSpec =
  | { kind: 'every'; ms: number }
  | { kind: 'daily'; hour: number; minute: number };

const EVERY_RE = /^every\s+(\d+)\s*(m|min|minutes?|h|hours?)$/i;
const DAILY_RE = /^daily\s+(\d{1,2}):(\d{2})$/i;

export function parseSchedule(text: string | null | undefined): ScheduleSpec | null {
  const s = String(text ?? '').trim();
  if (!s) return null;
  const every = s.match(EVERY_RE);
  if (every) {
    const n = parseInt(every[1], 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    const unit = every[2].toLowerCase().startsWith('h') ? 3_600_000 : 60_000;
    const ms = n * unit;
    // guard rail: nothing more frequent than once a minute
    return ms >= 60_000 ? { kind: 'every', ms } : null;
  }
  const daily = s.match(DAILY_RE);
  if (daily) {
    const hour = parseInt(daily[1], 10);
    const minute = parseInt(daily[2], 10);
    if (hour > 23 || minute > 59) return null;
    return { kind: 'daily', hour, minute };
  }
  return null;
}

export function describeSchedule(spec: ScheduleSpec | null): string {
  if (!spec) return '';
  if (spec.kind === 'every') {
    const mins = Math.round(spec.ms / 60_000);
    return mins % 60 === 0 ? `every ${mins / 60}h` : `every ${mins}m`;
  }
  return `daily ${String(spec.hour).padStart(2, '0')}:${String(spec.minute).padStart(2, '0')}`;
}

/**
 * Due check, driven by the scheduler tick (~30s granularity).
 *   every: due when now - lastRun >= interval (first run = immediately).
 *   daily: due when today's HH:MM has passed AND the last run was before it.
 */
export function isDue(spec: ScheduleSpec, lastRunAt: Date | null, now: Date): boolean {
  if (spec.kind === 'every') {
    if (!lastRunAt) return true;
    return now.getTime() - lastRunAt.getTime() >= spec.ms;
  }
  const todayAt = new Date(now);
  todayAt.setHours(spec.hour, spec.minute, 0, 0);
  if (now < todayAt) return false;
  return !lastRunAt || lastRunAt < todayAt;
}
