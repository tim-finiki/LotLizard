import { CONFIDENCE, LOT_FIELDS, METHODS, SOURCE_TYPES, VENUE_FIELDS, VENUE_LIST_FIELDS, type Fact, type InventorySource, type VenueInventory } from "@/lib/inventory/schema";
import { CONFIDENCE_RANK } from "@/lib/inventory/schema";
import { priceKey, readField, type FieldName } from "@/lib/inventory/values";

/** One fact as it arrives from a CSV row or a JSON array entry. */
export interface FactRow {
  venue_slug: string;
  lot_slug?: string;
  field: string;
  value: string;
  source_url?: string;
  source_name: string;
  source_type: string;
  source_method: string;
  observed_at: string;
  confidence: string;
  evidence?: string;
  notes?: string;
  reason?: string;
  verified_at?: string;
}

export const CSV_COLUMNS = [
  "venue_slug",
  "lot_slug",
  "field",
  "value",
  "source_url",
  "source_name",
  "source_type",
  "source_method",
  "observed_at",
  "confidence",
  "evidence",
  "notes",
  "reason",
] as const;

/** RFC 4180 CSV → records keyed by header. Handles quoted fields, escaped quotes and CRLF. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("CSV ends inside a quoted field");
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  const [header, ...body] = nonEmpty;
  if (!header) return [];
  const cols = header.map((h) => h.trim());
  return body.map((r, i) => {
    if (r.length > cols.length) throw new Error(`CSV row ${i + 2} has ${r.length} fields, header has ${cols.length}`);
    return Object.fromEntries(cols.map((c, j) => [c, (r[j] ?? "").trim()]));
  });
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Stable source id from its URL (or name for field visits): `host-path-slug`, trimmed. */
export function sourceId(row: Pick<FactRow, "source_url" | "source_name" | "source_type">): string {
  if (row.source_url) {
    const u = new URL(row.source_url);
    const host = u.hostname.replace(/^www\./, "");
    return slugify(`${host} ${u.pathname}`).slice(0, 80).replace(/-+$/, "");
  }
  return slugify(`${row.source_type} ${row.source_name}`).slice(0, 80).replace(/-+$/, "");
}

const today = () => new Date().toISOString().slice(0, 10);

/** Confidence ceiling implied by how and where a fact was collected (docs/DATA_PIPELINE.md). */
export function confidenceCap(sourceType: string, method: string): keyof typeof CONFIDENCE_RANK {
  if (method === "field" && sourceType === "lotlizard_field") return "verified";
  if (sourceType === "editorial_estimate") return "low";
  if (method === "search_snippet") return "medium";
  if (sourceType === "media" || sourceType === "third_party") return "medium";
  return "high";
}

export interface ImportIssue {
  row: number;
  message: string;
}

/** Throws with every problem in the batch, so one run shows everything to fix. */
export function checkRows(rows: FactRow[], now = today()): ImportIssue[] {
  const issues: ImportIssue[] = [];
  const lotFields = new Set<string>(LOT_FIELDS);
  const venueFields = new Set<string>([...VENUE_FIELDS, ...VENUE_LIST_FIELDS]);
  rows.forEach((r, i) => {
    const n = i + 2;
    const push = (message: string) => issues.push({ row: n, message });
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.venue_slug ?? "")) push(`bad venue_slug "${r.venue_slug}"`);
    if (r.lot_slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.lot_slug)) push(`bad lot_slug "${r.lot_slug}"`);
    const field = r.field;
    if (r.lot_slug ? !(lotFields.has(field) || field === "price") : !venueFields.has(field)) {
      push(`field "${field}" is not a ${r.lot_slug ? "lot" : "venue"} field`);
      return;
    }
    if (!(SOURCE_TYPES as readonly string[]).includes(r.source_type)) push(`source_type "${r.source_type}" unknown`);
    if (!(METHODS as readonly string[]).includes(r.source_method)) push(`source_method "${r.source_method}" unknown`);
    if (!(CONFIDENCE as readonly string[]).includes(r.confidence)) push(`confidence "${r.confidence}" unknown`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.observed_at ?? "") || Number.isNaN(Date.parse(r.observed_at))) push(`observed_at "${r.observed_at}" is not YYYY-MM-DD`);
    else if (r.observed_at > now) push(`observed_at ${r.observed_at} is in the future`);
    if (!r.source_name) push("source_name is required");
    if (r.source_method !== "field" && !r.source_url) push("source_url is required unless source_method is field");
    if (r.source_url) {
      try {
        const u = new URL(r.source_url);
        if (!/^https?:$/.test(u.protocol)) push(`source_url must be http(s)`);
      } catch {
        push(`source_url "${r.source_url}" is not a URL`);
      }
    }
    if (r.source_method === "search_snippet" && !r.evidence) push("search_snippet facts need an evidence quote");
    const cap = confidenceCap(r.source_type, r.source_method);
    if (CONFIDENCE_RANK[r.confidence as keyof typeof CONFIDENCE_RANK] > CONFIDENCE_RANK[cap]) {
      push(`confidence "${r.confidence}" exceeds the cap "${cap}" for ${r.source_type}/${r.source_method}`);
    }
    try {
      const parsed = readField(field as FieldName, r.value ?? "");
      if (field === "location" && (parsed as { precision: string }).precision === "exact") {
        const ok = r.source_method === "field" || r.source_method === "operator_update" || r.source_type === "official" || r.source_type === "operator";
        if (!ok) push("exact locations need a field visit, operator update, or official/operator source");
      }
    } catch (e) {
      push(`${field}: ${(e as Error).message}`);
    }
  });
  return issues;
}

function emptyInventory(slug: string): VenueInventory {
  return { version: 1, slug, venue: { fields: {}, policy: {}, transit: {} }, sources: {}, lots: {} };
}

function factFromRow(r: FactRow, sid: string): Fact {
  return {
    value: r.value.trim(),
    sources: [sid],
    confidence: r.confidence as Fact["confidence"],
    observedAt: r.observed_at,
    method: r.source_method as Fact["method"],
    ...(r.evidence ? { evidence: r.evidence } : {}),
    ...(r.notes ? { notes: r.notes } : {}),
    ...(r.reason ? { reason: r.reason } : {}),
    ...(r.verified_at ? { verifiedAt: r.verified_at } : {}),
  };
}

/** Same value from another source: combine sources, keep the strongest confidence and latest date. */
function corroborate(existing: Fact, incoming: Fact): Fact {
  const stronger = CONFIDENCE_RANK[incoming.confidence] > CONFIDENCE_RANK[existing.confidence] ? incoming : existing;
  return {
    ...existing,
    sources: [...new Set([...existing.sources, ...incoming.sources])],
    confidence: stronger.confidence,
    method: stronger.method,
    observedAt: existing.observedAt > incoming.observedAt ? existing.observedAt : incoming.observedAt,
    evidence: existing.evidence ?? incoming.evidence,
    notes: existing.notes ?? incoming.notes,
    ...(stronger.verifiedAt ? { verifiedAt: stronger.verifiedAt } : {}),
  };
}

export interface MergeResult {
  inventory: VenueInventory;
  /** Human-readable log of every change. */
  changes: string[];
  /** Conflicts kept in history instead of replacing a newer value. */
  warnings: string[];
}

/**
 * Upserts one fact. A different value replaces the current one only if it is at least as recent; the
 * displaced value is kept in `history` with the date it was replaced. Nothing is ever deleted.
 */
function upsert(slot: Record<string, Fact>, key: string, incoming: Fact, label: string, out: MergeResult, now: string) {
  const current = slot[key];
  if (!current) {
    slot[key] = incoming;
    out.changes.push(`+ ${label} = ${incoming.value}`);
    return;
  }
  if (current.value === incoming.value) {
    slot[key] = corroborate(current, incoming);
    return;
  }
  const { history = [], ...cur } = current;
  if (incoming.observedAt >= current.observedAt) {
    slot[key] = { ...incoming, history: [...history, { ...cur, replacedAt: now }] };
    out.changes.push(`~ ${label}: ${current.value} → ${incoming.value}${incoming.reason ? ` (${incoming.reason})` : ""}`);
  } else {
    const { history: _ignored, ...inc } = incoming;
    void _ignored;
    slot[key] = { ...current, history: [...history, { ...inc, replacedAt: now }] };
    out.warnings.push(`${label}: kept ${current.value} (${current.observedAt}); older ${incoming.value} (${incoming.observedAt}) recorded in history`);
  }
}

/** Merges validated rows into existing inventories (keyed by venue slug). Returns new objects. */
export function mergeRows(existing: Record<string, VenueInventory>, rows: FactRow[], now = today()): Record<string, MergeResult> {
  const issues = checkRows(rows, now);
  if (issues.length) throw new Error(issues.map((i) => `row ${i.row}: ${i.message}`).join("\n"));

  const results: Record<string, MergeResult> = {};
  for (const r of rows) {
    const result = (results[r.venue_slug] ??= {
      inventory: structuredClone(existing[r.venue_slug] ?? emptyInventory(r.venue_slug)),
      changes: [],
      warnings: [],
    });
    const inv = result.inventory;
    const sid = sourceId(r);
    const prev = inv.sources[sid];
    const source: InventorySource = {
      type: r.source_type as InventorySource["type"],
      name: r.source_name,
      ...(r.source_url ? { url: r.source_url } : {}),
      retrievedAt: prev && prev.retrievedAt > r.observed_at ? prev.retrievedAt : r.observed_at,
      method: (prev && prev.method === "page_review" ? "page_review" : r.source_method) as InventorySource["method"],
    };
    inv.sources[sid] = source;
    const fact = factFromRow(r, sid);

    if (!r.lot_slug) {
      if (r.field === "policy" || r.field === "transit") {
        const [title, ...body] = r.value.split(":");
        const key = body.length ? title.trim() : `${r.field} ${Object.keys(inv.venue[r.field]).length + 1}`;
        upsert(inv.venue[r.field], key, { ...fact, value: body.length ? body.join(":").trim() : r.value.trim() }, `${r.venue_slug} ${r.field} "${key}"`, result, now);
      } else upsert(inv.venue.fields, r.field, fact, `${r.venue_slug} ${r.field}`, result, now);
      continue;
    }
    const lot = (inv.lots[r.lot_slug] ??= { fields: {}, prices: {} });
    if (r.field === "price") upsert(lot.prices, priceKey(readField("price", r.value)), fact, `${r.venue_slug}/${r.lot_slug} price`, result, now);
    else upsert(lot.fields, r.field, fact, `${r.venue_slug}/${r.lot_slug} ${r.field}`, result, now);
  }
  return results;
}

/** Accepts the facts CSV or a JSON array of rows with the same keys. */
export function rowsFromFile(name: string, text: string): FactRow[] {
  const raw = name.endsWith(".json") ? (JSON.parse(text) as Record<string, string>[]) : parseCsv(text);
  if (!Array.isArray(raw)) throw new Error("JSON import must be an array of fact rows");
  return raw.map((r) => ({ ...r }) as unknown as FactRow);
}
