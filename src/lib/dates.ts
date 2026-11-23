// All date math uses calendar days, matching the "7 calendar days" policy.

/** Fixed demo date so the synthetic data always tells the same story. */
export const DEMO_TODAY = "2026-11-24";

const DAY = 86_400_000;

export function toDate(iso: string): Date {
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, n: number): string {
  const d = toDate(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toDate(toIso.slice(0, 10)).getTime() - toDate(fromIso.slice(0, 10)).getTime()) / DAY);
}

export function daysLeft(dueIso: string, today = DEMO_TODAY): number {
  return daysBetween(today, dueIso);
}

/** Monday of ISO week. */
export function isoWeekStart(year: number, week: number): string {
  const jan4 = new Date(year, 0, 4);
  const dow = (jan4.getDay() + 6) % 7; // Mon=0
  const week1Monday = new Date(year, 0, 4 - dow);
  week1Monday.setDate(week1Monday.getDate() + (week - 1) * 7);
  return isoDate(week1Monday);
}

export function isoWeekOf(iso: string): { year: number; week: number } {
  const d = toDate(iso.slice(0, 10));
  const target = new Date(d);
  const dow = (d.getDay() + 6) % 7;
  target.setDate(d.getDate() - dow + 3); // Thursday of this week
  const year = target.getFullYear();
  const firstThursday = new Date(year, 0, 4);
  const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / DAY - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return { year, week };
}

export function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return toDate(iso.slice(0, 10)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtShort(iso?: string): string {
  if (!iso) return "—";
  return toDate(iso.slice(0, 10)).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function nowStamp(): string {
  // Demo clock: today's demo date with the real time of day.
  const t = new Date();
  return `${DEMO_TODAY}T${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}:00`;
}
