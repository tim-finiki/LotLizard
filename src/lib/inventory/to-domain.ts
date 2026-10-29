import type {
  AmenityFact,
  Attributed,
  Attribution,
  ConfidenceLevel,
  DataSource,
  ParkingFacility,
  PaymentPolicy,
  PriceObservation,
  UniversalAmenity,
  Venue,
  VehicleEntrance,
  VenuePolicy,
  TransitOption,
} from "@/lib/types";
import { CONFIDENCE_RANK, type Fact, type InventoryLot, type VenueInventory } from "@/lib/inventory/schema";
import { readField, type FieldName } from "@/lib/inventory/values";

/**
 * Converts a normalized inventory file into the app's domain model. Missing facts stay missing:
 * unknown tailgating is "unknown", unknown payment is undefined, no row means no claim.
 */

const SNIPPET_NOTE = "Seen in search results; direct page review pending.";

export function inventorySourceId(venueSlug: string, sid: string) {
  return `inv:${venueSlug}:${sid}`;
}

function attribution(venueSlug: string, f: Fact): Attribution {
  const notes = [f.notes, f.method === "search_snippet" ? SNIPPET_NOTE : undefined].filter(Boolean).join(" ");
  return {
    sourceIds: f.sources.map((s) => inventorySourceId(venueSlug, s)),
    confidence: f.confidence,
    ...(f.verifiedAt ? { lastVerifiedAt: f.verifiedAt } : {}),
    ...(notes ? { notes } : {}),
  };
}

function weakest(facts: Fact[]): ConfidenceLevel {
  return facts.reduce<ConfidenceLevel>((min, f) => (CONFIDENCE_RANK[f.confidence] < CONFIDENCE_RANK[min] ? f.confidence : min), "verified");
}

function combined(venueSlug: string, facts: Fact[], notes?: string): Attribution {
  return {
    sourceIds: [...new Set(facts.flatMap((f) => f.sources.map((s) => inventorySourceId(venueSlug, s))))],
    confidence: facts.length ? weakest(facts) : "unverified",
    ...(notes ? { notes } : {}),
  };
}

const read = <F extends FieldName>(fact: Fact | undefined, field: F) => (fact ? readField(field, fact.value) : undefined);

export function inventorySources(inv: VenueInventory): DataSource[] {
  return Object.entries(inv.sources).map(([sid, s]) => ({
    id: inventorySourceId(inv.slug, sid),
    type: s.type,
    name: s.name,
    ...(s.url ? { url: s.url } : {}),
    retrievedAt: s.retrievedAt,
    ...(s.method === "search_snippet" ? { notes: SNIPPET_NOTE } : {}),
  }));
}

/** Builds the venue, starting from an existing directory entry when there is one. */
export function inventoryVenue(inv: VenueInventory, base?: Venue): Venue {
  const f = inv.venue.fields;
  const lat = read(f.lat, "lat");
  const lng = read(f.lng, "lng");
  const name = read(f.venue_name, "venue_name") ?? base?.name;
  const city = read(f.city, "city") ?? base?.address.city;
  const state = read(f.state, "state") ?? base?.address.state;
  const type = read(f.venue_type, "venue_type") ?? base?.type;
  const location = lat !== undefined && lng !== undefined ? { lat, lng, precision: "approximate" as const } : base?.location;
  if (!name || !city || !state || !type || !location) throw new Error(`${inv.slug}: venue needs name, type, city, state and coordinates (from rows or the directory)`);

  const policies: VenuePolicy[] = Object.entries(inv.venue.policy).map(([title, fact], i) => ({
    id: `${inv.slug}-policy-${i}`,
    title,
    body: fact.value,
    attribution: attribution(inv.slug, fact),
  }));
  const transit: TransitOption[] = Object.entries(inv.venue.transit).map(([title, fact], i) => ({
    id: `${inv.slug}-transit-${i}`,
    name: title,
    description: fact.value,
    attribution: attribution(inv.slug, fact),
  }));
  const allFacts = [...Object.values(f), ...Object.values(inv.venue.policy), ...Object.values(inv.venue.transit)];
  const hours = f.lot_open_hours_before;

  return {
    id: inv.slug,
    slug: inv.slug,
    name,
    ...(base?.formerNames ? { formerNames: base.formerNames } : {}),
    type,
    teams: read(f.teams, "teams") ?? base?.teams ?? [],
    address: {
      ...(f.street ? { street: read(f.street, "street") } : {}),
      city,
      state,
      ...(f.postal_code ? { postalCode: read(f.postal_code, "postal_code") } : {}),
    },
    location,
    ...(f.timezone ? { timezone: read(f.timezone, "timezone") } : {}),
    coverage: "basic",
    ...(f.summary ? { summary: read(f.summary, "summary") } : {}),
    ...(policies.length ? { policies } : {}),
    ...(transit.length ? { transit } : {}),
    ...(hours ? { lotOpenHoursBefore: { value: readField("lot_open_hours_before", hours.value), attribution: attribution(inv.slug, hours) } } : {}),
    attribution: combined(
      inv.slug,
      allFacts,
      "Parking details compiled from published sources and not yet field-verified. Confirm with the venue before you go.",
    ),
  };
}

const NO_CAR_TYPES = new Set(["shuttle", "rideshare_zone"]);

/** Prices older than this stay in the inventory file's history but aren't published or ranked. */
export const MAX_PRICE_AGE_DAYS = 730;

export function isCurrentPrice(observedAt: string, now = Date.now()): boolean {
  return (now - Date.parse(observedAt)) / 86_400_000 <= MAX_PRICE_AGE_DAYS;
}

export function inventoryFacility(inv: VenueInventory, lotSlug: string, lot: InventoryLot): ParkingFacility {
  const f = lot.fields;
  const v = inv.slug;
  if (!f.name || !f.type) throw new Error(`${v}/${lotSlug}: lots need a name and a type`);
  const type = readField("type", f.type.value);

  const prices: PriceObservation[] = Object.entries(lot.prices)
    .filter(([, fact]) => isCurrentPrice(fact.observedAt))
    .map(([key, fact]) => {
    const p = readField("price", fact.value);
    return {
      id: `${v}-${lotSlug}-${key.replace(/\|/g, "-")}`,
      min: p.min,
      max: p.max,
      vehicle: p.vehicle,
      eventKind: p.eventKind,
      ...(p.season ? { season: p.season } : {}),
      observedAt: fact.observedAt,
      scope: p.scope,
      attribution: attribution(v, fact),
    };
  });

  const paymentFacts = [f.payment_timing, f.payment_accepted, f.payment_not_accepted].filter((x): x is Fact => !!x);
  const payment: PaymentPolicy | undefined = paymentFacts.length
    ? {
        accepted: read(f.payment_accepted, "payment_accepted") ?? [],
        ...(f.payment_not_accepted ? { notAccepted: read(f.payment_not_accepted, "payment_not_accepted") } : {}),
        ...(f.payment_timing ? { timing: read(f.payment_timing, "payment_timing") } : {}),
        reportedAt: paymentFacts.map((x) => x.observedAt).sort().at(-1)!,
        ...(paymentFacts.find((x) => x.notes) ? { notes: paymentFacts.find((x) => x.notes)!.notes } : {}),
        attribution: combined(v, paymentFacts),
      }
    : undefined;

  const features: Partial<Record<UniversalAmenity, AmenityFact>> = {};
  for (const k of ["ada", "covered", "ev_charging", "restrooms"] as const) {
    const fact = f[k];
    if (fact) features[k] = { state: readField(k, fact.value), reportedAt: fact.observedAt, ...(fact.notes ? { notes: fact.notes } : {}), attribution: attribution(v, fact) };
  }

  const unknown = (): Attribution => ({ sourceIds: [], confidence: "unverified" });
  const tailgate = f.tailgating;
  const allowed: Attributed<boolean | "unknown"> = tailgate
    ? { value: readField("tailgating", tailgate.value) === "yes", attribution: attribution(v, tailgate) }
    : { value: "unknown", attribution: unknown() };
  const location = read(f.location, "location");
  const entranceFacts = [f.entrance_address, f.entrance_location, f.entrance_instructions].filter((x): x is Fact => !!x);
  const entranceVerified = f.entrance_verification ? readField("entrance_verification", f.entrance_verification.value) : undefined;
  const entrance: VehicleEntrance | undefined = entranceFacts.length
    ? {
        ...(f.entrance_address ? { address: f.entrance_address.value } : {}),
        ...(f.entrance_location ? { location: readField("entrance_location", f.entrance_location.value) } : {}),
        ...(f.entrance_instructions ? { instructions: f.entrance_instructions.value } : {}),
        // Verified only on LotLizard's say-so, recorded as a fact with a verification date.
        verification: entranceVerified ?? "unverified",
        ...(entranceVerified === "verified" && f.entrance_verification?.verifiedAt ? { verifiedAt: f.entrance_verification.verifiedAt } : {}),
        reportedAt: entranceFacts.map((x) => x.observedAt).sort().at(-1)!,
        attribution: combined(v, entranceFacts),
      }
    : undefined;
  const walk = read(f.walk_minutes, "walk_minutes");

  return {
    id: `${v}-${lotSlug}`,
    slug: lotSlug,
    venueId: v,
    name: f.name.value,
    ...(f.aliases ? { aliases: read(f.aliases, "aliases"), aliasesAttribution: attribution(v, f.aliases) } : {}),
    type,
    ...(f.operator ? { operator: f.operator.value } : {}),
    ...(f.ownership ? { ownership: { value: readField("ownership", f.ownership.value), attribution: attribution(v, f.ownership) } } : {}),
    ...(f.access ? { access: { value: readField("access", f.access.value), attribution: attribution(v, f.access) } } : {}),
    ...(f.address ? { address: f.address.value, addressAttribution: attribution(v, f.address) } : {}),
    ...(entrance ? { entrance } : {}),
    ...(location ? { location } : {}),
    description: f.description?.value ?? "",
    ...(walk !== undefined && f.walk_minutes ? { walkMinutes: { value: walk, attribution: attribution(v, f.walk_minutes) } } : {}),
    prices,
    ...(payment ? { payment } : {}),
    amenities: f.amenities ? { value: readField("amenities", f.amenities.value), attribution: attribution(v, f.amenities) } : { value: [], attribution: unknown() },
    ...(Object.keys(features).length ? { features } : {}),
    tailgating: { allowed, ...(f.tailgating_notes ? { notes: f.tailgating_notes.value } : {}) },
    exit: {},
    // A parking lot or garage takes cars; anything else (RVs, buses) needs a sourced row.
    vehicleTypes: read(f.vehicle_types, "vehicle_types") ?? (NO_CAR_TYPES.has(type) ? [] : ["car"]),
    attribution: attribution(v, f.name),
  };
}

export function inventoryFacilities(inv: VenueInventory): ParkingFacility[] {
  return Object.entries(inv.lots)
    .map(([slug, lot]) => inventoryFacility(inv, slug, lot))
    .sort((a, b) => a.name.localeCompare(b.name));
}
