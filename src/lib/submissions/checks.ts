import type { ParkingFacility } from "@/lib/types";
import type { SubmissionInput } from "@/lib/submissions/schema";

const URL_RE = /(https?:\/\/|www\.)\S+/gi;

/**
 * Automated pre-moderation checks. Flags help moderators prioritise; they never auto-approve.
 */
export function preModerationFlags(input: SubmissionInput, facility?: ParkingFacility): string[] {
  const flags: string[] = [];
  const text = [
    "body" in input ? input.body : "",
    "notes" in input ? (input.notes ?? "") : "",
  ].join(" ");

  if (text.match(URL_RE)) flags.push("contains_link");
  const letters = text.replace(URL_RE, "").replace(/[^a-z]/gi, "");
  if (letters.length >= 20 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.7) flags.push("shouting");
  if (/(.)\1{6,}/.test(text)) flags.push("repeated_characters");

  if (input.kind === "price") {
    const known = facility?.prices.filter((p) => p.vehicle === input.vehicle) ?? [];
    if (known.length > 0) {
      const lo = Math.min(...known.map((p) => p.min));
      const hi = Math.max(...known.map((p) => p.max));
      if (input.amount < lo * 0.5 || input.amount > hi * 2) flags.push("price_outlier");
    }
    if (input.amount === 0) flags.push("zero_price");
  }

  if (input.kind === "exit_time" && input.minutes > 150) flags.push("exit_time_outlier");

  const eventDate = "eventDate" in input ? input.eventDate : undefined;
  if (eventDate && eventDate > new Date().toISOString().slice(0, 10)) flags.push("future_date");

  return flags;
}
