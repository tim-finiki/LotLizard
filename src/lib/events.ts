import type { VenueEvent } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "20:20" → "8:20 PM". Pure string math so prerendered output never depends on the server clock or timezone. */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "2026-11-26" → "Thu, Nov 26". */
export function formatEventDate(date: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return `${WEEKDAYS[weekday]}, ${MONTHS[mo - 1]} ${d}`;
}

export function eventLabel(e: VenueEvent): string {
  return `${e.name} · ${formatEventDate(e.date)}${e.startLocal ? ` · ${formatClock(e.startLocal)}` : ""}`;
}

/** Compact label for tight controls: "vs. Chiefs (Thanksgiving) · Nov 26". */
export function eventShortLabel(e: VenueEvent): string {
  const [, mo, d] = e.date.split("-").map(Number);
  return `${e.name.replace(/^.*?\bvs\.\s*/, "vs. ")} · ${MONTHS[mo - 1]} ${d}`;
}

/** Local clock time lots open, given start time and hours-before. Undefined when start time is unknown. */
export function lotOpenTime(e: VenueEvent, hoursBefore: number): string | undefined {
  if (!e.startLocal) return undefined;
  const [h, m] = e.startLocal.split(":").map(Number);
  const minutes = (((h * 60 + m - hoursBefore * 60) % 1440) + 1440) % 1440;
  return formatClock(`${Math.floor(minutes / 60)}:${minutes % 60}`);
}

/** Events on or after `today` (YYYY-MM-DD), soonest first. */
export function upcomingEvents(events: VenueEvent[], today: string): VenueEvent[] {
  return events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}
