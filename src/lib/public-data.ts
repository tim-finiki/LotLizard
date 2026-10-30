import type {
  AmenityFact,
  Attributed,
  Attribution,
  DataSource,
  EventPaymentOverride,
  ParkingFacility,
  PaymentPolicy,
  PriceObservation,
  UniversalAmenity,
  Venue,
  VenuePolicy,
} from "@/lib/types";

/**
 * The boundary between internal research data and what leaves the server (public API responses and props
 * passed to client components). Everything is copied field by field from an explicit allowlist, so a new
 * internal field is private until someone adds it here on purpose.
 *
 * Public: facts, names, addresses, coordinates, rules, amenities, confidence, customer-facing notes,
 * approved booking links, and citations from official, operator and LotLizard field sources with their
 * dates. Not public: other sources (news, listings, aggregators, editorial), source notes, and how facts
 * were collected.
 */

const PUBLIC_SOURCE_TYPES = new Set<DataSource["type"]>(["official", "operator", "lotlizard_field"]);

export function isPublicSource(s: DataSource): boolean {
  return PUBLIC_SOURCE_TYPES.has(s.type);
}

/** Citations safe to publish: allowlisted types, and only id, type, name, url and retrieval date. */
export function publicSources(sources: DataSource[]): DataSource[] {
  return sources.filter(isPublicSource).map((s) => ({
    id: s.id,
    type: s.type,
    name: s.name,
    ...(s.url ? { url: s.url } : {}),
    retrievedAt: s.retrievedAt,
  }));
}

/** Drops source IDs that point at non-public sources; keeps confidence, verification date and the customer-facing note. */
export function publicAttribution(a: Attribution, publicIds: ReadonlySet<string>): Attribution {
  return {
    sourceIds: a.sourceIds.filter((id) => publicIds.has(id)),
    confidence: a.confidence,
    ...(a.lastVerifiedAt ? { lastVerifiedAt: a.lastVerifiedAt } : {}),
    ...(a.notes ? { notes: a.notes } : {}),
  };
}

function fact<T>(f: Attributed<T>, ids: ReadonlySet<string>): Attributed<T> {
  return { value: f.value, attribution: publicAttribution(f.attribution, ids) };
}

function policy(p: VenuePolicy, ids: ReadonlySet<string>): VenuePolicy {
  return { id: p.id, title: p.title, body: p.body, attribution: publicAttribution(p.attribution, ids) };
}

function payment(p: PaymentPolicy, ids: ReadonlySet<string>): PaymentPolicy {
  return {
    accepted: [...p.accepted],
    ...(p.notAccepted ? { notAccepted: [...p.notAccepted] } : {}),
    ...(p.otherDescription ? { otherDescription: p.otherDescription } : {}),
    ...(p.timing ? { timing: p.timing } : {}),
    reportedAt: p.reportedAt,
    ...(p.notes ? { notes: p.notes } : {}),
    attribution: publicAttribution(p.attribution, ids),
  };
}

function price(p: PriceObservation, ids: ReadonlySet<string>): PriceObservation {
  return {
    id: p.id,
    min: p.min,
    max: p.max,
    vehicle: p.vehicle,
    eventKind: p.eventKind,
    ...(p.season ? { season: p.season } : {}),
    observedAt: p.observedAt,
    ...(p.paymentNotes ? { paymentNotes: p.paymentNotes } : {}),
    ...(p.scope ? { scope: p.scope } : {}),
    attribution: publicAttribution(p.attribution, ids),
  };
}

function amenityFact(a: AmenityFact, ids: ReadonlySet<string>): AmenityFact {
  return { state: a.state, reportedAt: a.reportedAt, ...(a.notes ? { notes: a.notes } : {}), attribution: publicAttribution(a.attribution, ids) };
}

export function publicVenue(v: Venue, ids: ReadonlySet<string>): Venue {
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    ...(v.formerNames ? { formerNames: [...v.formerNames] } : {}),
    type: v.type,
    teams: [...v.teams],
    address: { ...(v.address.street ? { street: v.address.street } : {}), city: v.address.city, state: v.address.state, ...(v.address.postalCode ? { postalCode: v.address.postalCode } : {}) },
    location: { lat: v.location.lat, lng: v.location.lng, precision: v.location.precision },
    ...(v.timezone ? { timezone: v.timezone } : {}),
    coverage: v.coverage,
    ...(v.capacity ? { capacity: fact(v.capacity, ids) } : {}),
    ...(v.summary ? { summary: v.summary } : {}),
    ...(v.gates ? { gates: v.gates.map((g) => ({ id: g.id, name: g.name, location: { lat: g.location.lat, lng: g.location.lng, precision: g.location.precision } })) } : {}),
    ...(v.policies ? { policies: v.policies.map((p) => policy(p, ids)) } : {}),
    ...(v.transit ? { transit: v.transit.map((t) => ({ id: t.id, name: t.name, description: t.description, attribution: publicAttribution(t.attribution, ids) })) } : {}),
    ...(v.trafficNotes ? { trafficNotes: v.trafficNotes.map((p) => policy(p, ids)) } : {}),
    ...(v.approaches ? { approaches: v.approaches.map((a) => ({ id: a.id, label: a.label, description: a.description })) } : {}),
    ...(v.lotOpenHoursBefore ? { lotOpenHoursBefore: fact(v.lotOpenHoursBefore, ids) } : {}),
    attribution: publicAttribution(v.attribution, ids),
  };
}

export function publicFacility(f: ParkingFacility, ids: ReadonlySet<string>): ParkingFacility {
  const features = f.features
    ? Object.fromEntries(Object.entries(f.features).filter(([, a]) => a).map(([k, a]) => [k, amenityFact(a!, ids)]))
    : undefined;
  const e = f.entrance;
  return {
    id: f.id,
    slug: f.slug,
    venueId: f.venueId,
    name: f.name,
    ...(f.aliases ? { aliases: [...f.aliases] } : {}),
    ...(f.aliasesAttribution ? { aliasesAttribution: publicAttribution(f.aliasesAttribution, ids) } : {}),
    type: f.type,
    ...(f.operator ? { operator: f.operator } : {}),
    ...(f.ownership ? { ownership: fact(f.ownership, ids) } : {}),
    ...(f.access ? { access: fact(f.access, ids) } : {}),
    ...(f.address ? { address: f.address } : {}),
    ...(f.addressAttribution ? { addressAttribution: publicAttribution(f.addressAttribution, ids) } : {}),
    ...(e
      ? {
          entrance: {
            ...(e.address ? { address: e.address } : {}),
            ...(e.location ? { location: { lat: e.location.lat, lng: e.location.lng, method: e.location.method } } : {}),
            ...(e.nearestAddress ? { nearestAddress: e.nearestAddress } : {}),
            ...(e.instructions ? { instructions: e.instructions } : {}),
            verification: e.verification,
            ...(e.verifiedAt ? { verifiedAt: e.verifiedAt } : {}),
            reportedAt: e.reportedAt,
            attribution: publicAttribution(e.attribution, ids),
          },
        }
      : {}),
    ...(f.location ? { location: { lat: f.location.lat, lng: f.location.lng, precision: f.location.precision } } : {}),
    description: f.description,
    ...(f.walkMinutes ? { walkMinutes: fact(f.walkMinutes, ids) } : {}),
    prices: f.prices.map((p) => price(p, ids)),
    ...(f.payment ? { payment: payment(f.payment, ids) } : {}),
    ...(f.paymentOverrides ? { paymentOverrides: f.paymentOverrides.map((o): EventPaymentOverride => ({ eventId: o.eventId, policy: payment(o.policy, ids) })) } : {}),
    amenities: fact(f.amenities, ids),
    ...(features ? { features: features as Partial<Record<UniversalAmenity, AmenityFact>> } : {}),
    tailgating: {
      allowed: fact(f.tailgating.allowed, ids),
      ...(f.tailgating.atmosphere ? { atmosphere: fact(f.tailgating.atmosphere, ids) } : {}),
      ...(f.tailgating.notes ? { notes: f.tailgating.notes } : {}),
    },
    exit: {
      ...(f.exit.rating ? { rating: fact(f.exit.rating, ids) } : {}),
      ...(f.exit.routes ? { routes: [...f.exit.routes] } : {}),
      ...(f.exit.notes ? { notes: f.exit.notes } : {}),
      ...(f.exit.directions ? { directions: fact(f.exit.directions, ids) } : {}),
    },
    vehicleTypes: [...f.vehicleTypes],
    ...(f.booking ? { booking: { url: f.booking.url, partner: f.booking.partner, isAffiliate: f.booking.isAffiliate } } : {}),
    attribution: publicAttribution(f.attribution, ids),
  };
}

/** Public view of a venue, its facilities and its citations, from the full internal records. */
export function publicVenueData(venue: Venue, facilities: ParkingFacility[], sources: DataSource[]) {
  const cited = publicSources(sources);
  const ids = new Set(cited.map((s) => s.id));
  return { venue: publicVenue(venue, ids), facilities: facilities.map((f) => publicFacility(f, ids)), sources: cited };
}
