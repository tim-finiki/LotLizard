import { describe, expect, it } from "vitest";
import { eventLabel, eventShortLabel, formatClock, formatEventDate, lotOpenTime, upcomingEvents } from "@/lib/events";
import { EVENTS } from "@/lib/data/events";
import { attr } from "@/lib/data/attr";
import type { VenueEvent } from "@/lib/types";

const ev = (o: Partial<VenueEvent>): VenueEvent => ({ id: "e", venueId: "v", name: "Game", kind: "nfl_regular", date: "2026-11-26", attribution: attr("medium", ["s"]), ...o });

describe("events", () => {
  it("formats clock times", () => {
    expect(formatClock("20:20")).toBe("8:20 PM");
    expect(formatClock("00:05")).toBe("12:05 AM");
    expect(formatClock("12:00")).toBe("12:00 PM");
  });

  it("formats dates independent of timezone", () => {
    expect(formatEventDate("2026-11-26")).toBe("Thu, Nov 26");
  });

  it("computes lot opening time and handles unknown start times", () => {
    expect(lotOpenTime(ev({ startLocal: "20:20" }), 4)).toBe("4:20 PM");
    expect(lotOpenTime(ev({ startLocal: "02:00" }), 4)).toBe("10:00 PM");
    expect(lotOpenTime(ev({}), 4)).toBeUndefined();
  });

  it("lists upcoming events soonest first", () => {
    const list = upcomingEvents(EVENTS, "2026-10-29");
    expect(list[0].id).toBe("2026-11-22-dolphins");
    expect(list.every((e) => e.date >= "2026-10-29")).toBe(true);
  });

  it("labels events", () => {
    expect(eventLabel(ev({ name: "Bills vs. Chiefs", startLocal: "20:20" }))).toBe("Bills vs. Chiefs · Thu, Nov 26 · 8:20 PM");
    expect(eventShortLabel(ev({ name: "Bills vs. Chiefs (Thanksgiving)" }))).toBe("vs. Chiefs (Thanksgiving) · Nov 26");
  });
});
