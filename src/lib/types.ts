/**
 * LotLizard domain model. Every user-visible fact carries an Attribution so the UI,
 * API and structured data can always say where it came from and how confident we are.
 */

export type ConfidenceLevel = "verified" | "high" | "medium" | "low" | "unverified";

export type SourceType =
  | "official" // team, venue or league publication
  | "operator" // the parking operator itself
  | "media" // news outlets
  | "third_party" // guides, aggregators, resale/booking sites
  | "user_report" // moderated community submission
  | "lotlizard_field" // LotLizard on-site verification
  | "editorial_estimate"; // LotLizard estimate or placeholder — never "verified"

export interface DataSource {
  id: string;
  type: SourceType;
  name: string;
  url?: string;
  /** ISO date the source was retrieved or published. */
  retrievedAt: string;
  notes?: string;
}

export interface Attribution {
  sourceIds: string[];
  confidence: ConfidenceLevel;
  lastVerifiedAt?: string;
  notes?: string;
}

export interface Attributed<T> {
  value: T;
  attribution: Attribution;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  /** "approximate" pins are editorial placements, not surveyed entrances. */
  precision: "exact" | "approximate";
}

export interface Address {
  street?: string;
  city: string;
  /** Two-letter USPS state code. */
  state: string;
  postalCode?: string;
}

export type VenueType =
  | "stadium"
  | "arena"
  | "ballpark"
  | "amphitheater"
  | "concert_venue"
  | "speedway"
  | "college_stadium";

/** How much parking data we hold for a venue. Thin pages are labelled, never padded. */
export type CoverageLevel = "pilot_detailed" | "basic" | "venue_only";

export interface VenuePolicy {
  id: string;
  title: string;
  body: string;
  attribution: Attribution;
}

export interface TransitOption {
  id: string;
  name: string;
  description: string;
  attribution: Attribution;
}

export interface Gate {
  id: string;
  name: string;
  location: GeoPoint;
}

/** A direction fans leave toward after the event, e.g. "North — Buffalo / I-90". */
export interface Approach {
  id: string;
  label: string;
  description: string;
}

export interface Venue {
  id: string;
  slug: string;
  name: string;
  formerNames?: string[];
  type: VenueType;
  teams: string[];
  address: Address;
  location: GeoPoint;
  timezone?: string;
  coverage: CoverageLevel;
  capacity?: Attributed<number>;
  summary?: string;
  gates?: Gate[];
  policies?: VenuePolicy[];
  transit?: TransitOption[];
  trafficNotes?: VenuePolicy[];
  approaches?: Approach[];
  /** How many hours before the event official lots open. */
  lotOpenHoursBefore?: Attributed<number>;
  attribution: Attribution;
}

export type FacilityType =
  | "official_lot"
  | "private_lot"
  | "garage"
  | "independent"
  | "residential"
  | "shuttle"
  | "rideshare_zone"
  | "ada";

export type VehicleType = "car" | "rv" | "bus" | "limo" | "motorcycle";

export type Amenity =
  | "restrooms"
  | "portable_toilets"
  | "ada_spaces"
  | "lighting"
  | "paved"
  | "grass"
  | "security"
  | "shuttle_service"
  | "food_vendors"
  | "rv_friendly"
  | "tailgate_area"
  | "covered"
  | "ev_charging";

export type EventKind = "nfl_regular" | "nfl_playoff" | "concert" | "college" | "other" | "any";

export interface PriceObservation {
  id: string;
  /** USD, whole dollars. min === max for a single reported price. */
  min: number;
  max: number;
  vehicle: VehicleType;
  eventKind: EventKind;
  season?: string;
  observedAt: string;
  paymentNotes?: string;
  /**
   * "lot" (default): a price reported for this specific lot. "area": a range reported for a group of
   * lots or a street. Area ranges are shown for context but are not evidence for comparing lots.
   */
  scope?: "lot" | "area";
  attribution: Attribution;
}

export type PaymentMethod = "cash" | "card" | "venmo" | "paypal" | "zelle" | "mobile_wallet" | "other";

/**
 * When you pay. Kept separate from *how* you pay.
 * - pay_on_arrival: pay at the lot on the day
 * - advance_optional: you can reserve or pay ahead, but can also pay on arrival
 * - prepay_required: you must buy a pass/permit before arriving
 */
export type PaymentTiming = "pay_on_arrival" | "advance_optional" | "prepay_required";

/**
 * Payment facts for a lot. A method is only "accepted" with explicit evidence; a method listed in
 * neither `accepted` nor `notAccepted` is UNKNOWN, never assumed accepted or refused.
 */
export interface PaymentPolicy {
  accepted: PaymentMethod[];
  notAccepted?: PaymentMethod[];
  /** Describes "other" methods, e.g. "Token Transit app". */
  otherDescription?: string;
  /** Undefined when unknown. */
  timing?: PaymentTiming;
  /** Date the source reported this (YYYY-MM-DD). Verification by LotLizard goes in attribution.lastVerifiedAt. */
  reportedAt: string;
  notes?: string;
  attribution: Attribution;
}

/** A policy that applies to one event only and replaces the lot's general policy for that event. */
export interface EventPaymentOverride {
  eventId: string;
  policy: PaymentPolicy;
}

export interface BookingLink {
  url: string;
  partner: string;
  /** When true the link earns LotLizard revenue and must be disclosed. */
  isAffiliate: boolean;
}

export interface ParkingFacility {
  id: string;
  slug: string;
  venueId: string;
  name: string;
  aliases?: string[];
  type: FacilityType;
  operator?: string;
  address?: string;
  /** Omitted when no source pins the lot down — such lots are listed but not mapped. */
  location?: GeoPoint;
  description: string;
  /** Sourced walking time to the nearest gate; otherwise the UI derives an estimate from coordinates. */
  walkMinutes?: Attributed<number>;
  prices: PriceObservation[];
  /** General payment policy. Undefined when nothing is known. */
  payment?: PaymentPolicy;
  /** Event-specific policies that replace `payment` for that event. */
  paymentOverrides?: EventPaymentOverride[];
  amenities: Attributed<Amenity[]>;
  tailgating: {
    allowed: Attributed<boolean | "unknown">;
    /** 1 (none) – 5 (legendary). Absent when we have no basis to rate it. */
    atmosphere?: Attributed<number>;
    notes?: string;
  };
  exit: {
    /** 1 (very slow) – 5 (very quick). Absent when unknown. */
    rating?: Attributed<number>;
    routes?: string[];
    notes?: string;
    /**
     * Approach IDs this lot's post-event exit route leads toward. Only used for ranking when backed
     * by documented lot-level routing (confidence ≥ medium).
     */
    directions?: Attributed<string[]>;
  };
  vehicleTypes: VehicleType[];
  booking?: BookingLink;
  attribution: Attribution;
}

export interface VenueEvent {
  id: string;
  venueId: string;
  name: string;
  kind: EventKind;
  /** Local date, YYYY-MM-DD. */
  date: string;
  /** Local kickoff/start time, HH:MM (24h). Absent when not yet announced. */
  startLocal?: string;
  attribution: Attribution;
}

/** Future: historical arrival/exit times used to train predictions. */
export interface TravelObservation {
  id: string;
  facilityId: string;
  eventId?: string;
  kind: "arrival" | "exit";
  /** Minutes from leaving the seat (exit) or reaching the area (arrival) to the reference point. */
  minutes: number;
  observedAt: string;
  attribution: Attribution;
}

export type SponsorshipPlacement = "venue_page" | "directory" | "lot_page";

export interface Sponsorship {
  id: string;
  placement: SponsorshipPlacement;
  venueId?: string;
  sponsorName: string;
  message: string;
  url: string;
  startsAt: string;
  endsAt: string;
}
