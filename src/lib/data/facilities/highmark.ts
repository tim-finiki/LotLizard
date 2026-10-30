import type { AccessLevel, Ownership, ParkingFacility, PaymentPolicy, PriceObservation } from "@/lib/types";
import { attr, fact } from "@/lib/data/attr";

/**
 * Highmark Stadium (Orchard Park, NY) — LotLizard pilot.
 *
 * Data honesty notes:
 * - The 2026 official lot names come from third-party guides (ArenaCapacity, ParkingAccess);
 *   the Bills' own lot map has not been reviewed directly, so names are "low" confidence.
 * - No official 2026 per-lot price was found. Official-lot prices shown are a third-party
 *   range that is explicitly NOT lot-specific.
 * - Every map pin is an approximate editorial placement. Lots with no locating source
 *   have no pin at all.
 */

const VENUE_ID = "highmark-stadium";
const PIN_NOTE = "Approximate editorial pin — entrance not surveyed.";

/**
 * Payment: only what sources state. Official lots are documented as prepay-only, but how passes can be
 * paid for isn't, so methods stay unknown (accepted: []).
 */
const officialPrepay: PaymentPolicy = {
  accepted: [],
  timing: "prepay_required",
  reportedAt: "2026-10-29",
  notes: "Pass must be bought in advance and is valid only for the lot printed on it. No cash or card sales at the lot on game day. Accepted payment methods for passes not yet documented.",
  attribution: attr("medium", ["bills-parking", "bills-gameday"]),
};
const officialTailgate = fact<boolean | "unknown">(true, "medium", ["bills-parking"], "Tailgating allowed from lot opening (4 hours before kickoff) until kickoff. No post-game tailgating.");
/** Bills lots are pass-only; the stadium property is public, but individual lot parcels aren't confirmed. */
const officialAccess = fact<AccessLevel>("pass_required", "medium", ["bills-parking", "bills-gameday"], "A pass bought in advance is required and is valid only for the lot printed on it.");
const officialOwnership = fact<Ownership>(
  "public",
  "low",
  ["erie-county-stadium-transfer", "wamc-stadium-transfer"],
  "Erie County transferred the new stadium to New York State (Erie County Stadium Corporation) in 2026. Whether each lot's parcel is part of that property isn't confirmed.",
);
const officialAmenities = fact<ParkingFacility["amenities"]["value"]>(["tailgate_area", "paved"], "low", ["bills-parking", "lotlizard-editorial"], "Each space is 9×18 ft with a 9×10 ft tailgate area. Surface and other amenities not yet verified.");

function officialPriceRange(lot: string): PriceObservation {
  return {
    id: `${lot}-2026-3p-range`,
    min: 35,
    max: 90,
    vehicle: "car",
    eventKind: "nfl_regular",
    season: "2026",
    observedAt: "2026-07-10",
    paymentNotes: "Pre-purchased pass only. Season passes were reported sold out for 2026; resale prices vary by opponent.",
    scope: "area",
    attribution: attr("low", ["arenacapacity", "buffnews-lots"], "Third-party range for Bills lots generally — not specific to this lot. Official 2026 per-lot prices not yet found."),
  };
}

function officialLot(
  slug: string,
  name: string,
  side: "west" | "east",
  location: { lat: number; lng: number },
): ParkingFacility {
  const sideText =
    side === "west"
      ? "on the new-stadium (west) side of Abbott Road"
      : "on the former-stadium (east) side of Abbott Road";
  return {
    id: `highmark-${slug}`,
    slug,
    venueId: VENUE_ID,
    name,
    type: "official_lot",
    operator: "Buffalo Bills",
    ownership: officialOwnership,
    access: officialAccess,
    location: { ...location, precision: "approximate" },
    description: `Official Bills lot ${sideText}, per the 2026 lot configuration reported by third-party guides. Pass must be bought in advance.`,
    prices: [officialPriceRange(slug)],
    payment: officialPrepay,
    amenities: officialAmenities,
    tailgating: {
      allowed: officialTailgate,
      notes: "Gas/propane grills allowed; charcoal only if raised 6+ inches. No stakes, glass, ground charcoal or PA systems.",
    },
    exit: {
      routes:
        side === "west"
          ? ["Southwestern Blvd (US-20)", "Big Tree Rd westbound (one-way post-game)"]
          : ["Big Tree Rd eastbound to Route 219 (one-way post-game)", "Southwestern Blvd (US-20)"],
    },
    vehicleTypes: ["car"],
    attribution: attr("low", ["arenacapacity", "parkingaccess", "buffnews-lots", "lotlizard-editorial"], `Lot name/side from third-party guides. ${PIN_NOTE}`),
  };
}

const YELLOW_BRICK_BOOKING = { url: "https://yellowbrickparkinglot.com/", partner: "Yellow Brick Parking", isAffiliate: false };

/** The operator's advertised starting price, shared by its three lots (not lot-specific). */
function yellowBrickRavens(lot: string): PriceObservation {
  return {
    id: `${lot}-2026-11-01-from`,
    min: 70,
    max: 70,
    vehicle: "car",
    eventKind: "nfl_regular",
    season: "2026",
    observedAt: "2026-10-30",
    paymentNotes: "Advertised as \"starting at $70\" for Bills vs. Ravens (Nov 1, 2026), reserved on the operator's website.",
    scope: "area",
    attribution: attr("medium", ["yellowbrick-site"], "Operator's starting price across its lots for one game; not specific to this lot."),
  };
}

export const HIGHMARK_FACILITIES: ParkingFacility[] = [
  officialLot("platinum-lot", "Platinum Lot", "west", { lat: 42.7748, lng: -78.7928 }),
  officialLot("gold-lot", "Gold Lot", "west", { lat: 42.7712, lng: -78.7948 }),
  officialLot("gray-lot", "Gray Lot", "west", { lat: 42.7738, lng: -78.7968 }),
  officialLot("bronze-lot", "Bronze Lot", "west", { lat: 42.7698, lng: -78.7922 }),
  officialLot("white-lot", "White Lot", "east", { lat: 42.7766, lng: -78.7858 }),
  officialLot("orange-lot", "Orange Lot", "east", { lat: 42.7781, lng: -78.7884 }),
  officialLot("blue-lot", "Blue Lot", "east", { lat: 42.7726, lng: -78.7848 }),
  officialLot("green-lot", "Green Lot", "east", { lat: 42.7702, lng: -78.7868 }),
  {
    id: "highmark-blue-ada",
    slug: "blue-ada-lot",
    venueId: VENUE_ID,
    name: "Blue ADA Lot",
    type: "ada",
    operator: "Buffalo Bills",
    access: fact<AccessLevel>("pass_required", "medium", ["bills-accessibility", "wgrz-opener-traffic"], "A valid disability parking placard is required (the Bills' accessible-parking guide, written for the same ADA lots before they were renamed for 2026)."),
    entrance: {
      instructions:
        "Approach on Big Tree Rd (Route 20A) from the east and turn right onto Fieldhouse Dr, following traffic control. There is no access from Abbott Rd. First-come, first-served for vehicles with a valid disability parking placard.",
      verification: "unverified",
      reportedAt: "2026-09-15",
      attribution: attr("medium", ["wgrz-opener-traffic", "wgrz-ravens-traffic", "bills-parking", "bills-accessibility"], "2026 Erie County Sheriff game releases and the Bills' parking page agree on this route; the ADA lots are the former Lot 2 ADA (reached from Route 20A), renamed for 2026. An earlier open-practice notice gave the reverse. Fieldhouse Dr is a stadium road that map apps may not show. Placard rule from the Bills' accessible-parking guide."),
    },
    location: { lat: 42.7714, lng: -78.7862, precision: "approximate" },
    description: "Accessible parking, first-come, first-served. Access only from Fieldhouse Dr via Big Tree Rd. ADA lots are the exception to pre-purchase.",
    prices: [],
    payment: {
      accepted: [],
      reportedAt: "2026-09-15",
      notes: "First-come, first-served and exempt from the pre-purchase rule. Whether and how you pay on arrival isn't confirmed.",
      attribution: attr("medium", ["wgrz-opener-traffic", "bills-parking"]),
    },
    amenities: fact<ParkingFacility["amenities"]["value"]>([], "unverified", ["lotlizard-editorial"]),
    features: {
      ada: {
        state: "available",
        reportedAt: "2026-09-15",
        notes: "Designated accessible lot, first-come, first-served.",
        attribution: attr("medium", ["wgrz-opener-traffic", "bills-parking"]),
      },
    },
    tailgating: { allowed: fact<boolean | "unknown">("unknown", "unverified", ["lotlizard-editorial"]) },
    exit: { routes: ["Fieldhouse Dr → Big Tree Rd"] },
    vehicleTypes: ["car"],
    attribution: attr("medium", ["wgrz-opener-traffic"], `Erie County Sheriff release for the 2026 home opener. ${PIN_NOTE}`),
  },
  {
    id: "highmark-white-ada",
    slug: "white-ada-lot",
    venueId: VENUE_ID,
    name: "White ADA Lot",
    type: "ada",
    operator: "Buffalo Bills",
    access: fact<AccessLevel>("pass_required", "medium", ["bills-accessibility", "wgrz-opener-traffic"], "A valid disability parking placard is required (the Bills' accessible-parking guide, written for the same ADA lots before they were renamed for 2026)."),
    entrance: {
      instructions:
        "Approach on Southwestern Blvd (Route 20) from the east, then turn onto Orange Dr, following traffic control. There is no access from Abbott Rd. First-come, first-served for vehicles with a valid disability parking placard.",
      verification: "unverified",
      reportedAt: "2026-09-15",
      attribution: attr("medium", ["wgrz-opener-traffic", "wgrz-ravens-traffic", "bills-parking", "bills-accessibility"], "2026 Erie County Sheriff game releases and the Bills' parking page agree on this route; the ADA lots are the former Lot 6 ADA (reached from Route 20), renamed for 2026. An earlier open-practice notice gave the reverse. Orange Dr is a stadium road that map apps may not show. Placard rule from the Bills' accessible-parking guide."),
    },
    location: { lat: 42.7774, lng: -78.7870, precision: "approximate" },
    description: "Accessible parking, first-come, first-served. Access only from Orange Dr via Southwestern Blvd.",
    prices: [],
    payment: {
      accepted: [],
      reportedAt: "2026-09-15",
      notes: "First-come, first-served and exempt from the pre-purchase rule. Whether and how you pay on arrival isn't confirmed.",
      attribution: attr("medium", ["wgrz-opener-traffic", "bills-parking"]),
    },
    amenities: fact<ParkingFacility["amenities"]["value"]>([], "unverified", ["lotlizard-editorial"]),
    features: {
      ada: {
        state: "available",
        reportedAt: "2026-09-15",
        notes: "Designated accessible lot, first-come, first-served.",
        attribution: attr("medium", ["wgrz-opener-traffic", "bills-parking"]),
      },
    },
    tailgating: { allowed: fact<boolean | "unknown">("unknown", "unverified", ["lotlizard-editorial"]) },
    exit: { routes: ["Orange Dr → Southwestern Blvd (US-20)"] },
    vehicleTypes: ["car"],
    attribution: attr("medium", ["wgrz-opener-traffic"], `Erie County Sheriff release for the 2026 home opener. ${PIN_NOTE}`),
  },
  {
    id: "highmark-rv",
    slug: "rv-lot",
    venueId: VENUE_ID,
    name: "Official RV Lot",
    type: "official_lot",
    operator: "Buffalo Bills",
    description: "Opens at 8:00 AM the day before home games. No RV entry on game day. Location not yet confirmed, so it is not pinned on the map.",
    prices: [],
    payment: officialPrepay,
    amenities: fact<ParkingFacility["amenities"]["value"]>(["rv_friendly", "tailgate_area"], "medium", ["bills-parking"]),
    tailgating: { allowed: officialTailgate },
    exit: {},
    vehicleTypes: ["rv"],
    attribution: attr("medium", ["bills-parking"], "Hours from official Bills parking page (via search). Location unknown."),
  },
  {
    id: "highmark-bus-limo",
    slug: "bus-limo-lot",
    venueId: VENUE_ID,
    name: "Bus & Limo Lot",
    type: "official_lot",
    operator: "Buffalo Bills",
    access: fact<AccessLevel>("pass_required", "medium", ["bills-parking"], "Advance permit from the Bills Ticket Office required; vehicles without one are turned away."),
    location: { lat: 42.7801, lng: -78.7893, precision: "approximate" },
    description: "Advance permit from the Bills Ticket Office required; vehicles without a permit are turned away. Only limos carrying 11 or fewer may tailgate. Location reported along Southwestern Blvd in 2025 and may have changed.",
    prices: [],
    payment: {
      accepted: [],
      timing: "prepay_required",
      reportedAt: "2026-10-29",
      notes: "Advance permit from the Bills Ticket Office required; vehicles without one are turned away. Accepted payment methods not documented.",
      attribution: attr("medium", ["bills-parking"]),
    },
    amenities: fact<ParkingFacility["amenities"]["value"]>([], "unverified", ["lotlizard-editorial"]),
    tailgating: { allowed: fact<boolean | "unknown">(true, "medium", ["bills-parking"], "Limos with 11 or fewer passengers only.") },
    exit: { routes: ["Southwestern Blvd (US-20)"] },
    vehicleTypes: ["bus", "limo"],
    attribution: attr("low", ["bills-parking", "wgrz-opener-traffic"], `Location from a 2025 report. ${PIN_NOTE}`),
  },
  {
    id: "highmark-vip-tailgate",
    slug: "bills-vip-tailgate",
    venueId: VENUE_ID,
    name: "Bills VIP Tailgate",
    type: "official_lot",
    operator: "Buffalo Bills",
    description: "Paid, hosted tailgate experience across from Gate E on Abbott Rd. Not pinned until the exact location is confirmed.",
    prices: [],
    amenities: fact<ParkingFacility["amenities"]["value"]>(["tailgate_area"], "medium", ["bills-parking"]),
    tailgating: { allowed: fact<boolean | "unknown">(true, "medium", ["bills-parking"]) },
    exit: {},
    vehicleTypes: ["car"],
    attribution: attr("medium", ["bills-parking"]),
  },
  {
    id: "highmark-nfta-gde",
    slug: "nfta-game-day-express",
    venueId: VENUE_ID,
    name: "NFTA Game Day Express (shuttle)",
    type: "shuttle",
    operator: "NFTA Metro",
    location: { lat: 42.7793, lng: -78.7912, precision: "approximate" },
    description: "Express bus from Eastern Hills Mall, Metropolitan Transportation Center, Niagara Falls Transportation Center, Thruway Plaza, University Station and Utica Rail Station to the new Transit Center near Abbott Rd & Southwestern Blvd. Service dates vary — check NFTA per game.",
    prices: [
      {
        id: "nfta-gde-2026",
        min: 5,
        max: 5,
        vehicle: "car",
        eventKind: "nfl_regular",
        season: "2026",
        observedAt: "2026-10-29",
        paymentNotes: "Per person, one way. Exact cash or Token Transit; Metro passes and MetGo not accepted.",
        attribution: attr("medium", ["nfta-gde"]),
      },
    ],
    payment: {
      accepted: ["cash", "other"],
      otherDescription: "Token Transit mobile ticket",
      timing: "pay_on_arrival",
      reportedAt: "2026-10-29",
      notes: "$5 per person one way. Exact cash when boarding, or a Token Transit ticket. Metro passes and MetGo are not accepted.",
      attribution: attr("medium", ["nfta-gde"]),
    },
    // The transit hub's 2,500 sq ft canopy covers bus boarding, not parking, so "covered parking" stays unknown.
    amenities: fact<ParkingFacility["amenities"]["value"]>(["shuttle_service"], "medium", ["nfta-gde", "wkbw-transit-hub"], "Transit hub has a 2,500 sq ft boarding canopy."),
    tailgating: { allowed: fact<boolean | "unknown">(false, "medium", ["nfta-gde"], "Shuttle — no vehicle at the stadium.") },
    exit: { notes: "Return buses depart from the Transit Center after the game." },
    vehicleTypes: [],
    attribution: attr("medium", ["nfta-gde", "wkbw-transit-hub"], PIN_NOTE),
  },
  {
    id: "highmark-rideshare",
    slug: "rideshare-zone",
    venueId: VENUE_ID,
    name: "Rideshare Pickup / Drop-off",
    type: "rideshare_zone",
    location: { lat: 42.7816, lng: -78.8003, precision: "approximate" },
    description: "Reported at the west end of the former SUNY Erie (ECC) South Campus, reached from Southwestern Blvd. Reportedly no pickups on Abbott Rd, Big Tree Rd or in stadium lots. Not confirmed by an official source for the new stadium.",
    prices: [],
    amenities: fact<ParkingFacility["amenities"]["value"]>([], "unverified", ["lotlizard-editorial"]),
    tailgating: { allowed: fact<boolean | "unknown">(false, "low", ["prked-lions"]) },
    exit: { routes: ["Southwestern Blvd (US-20)"] },
    vehicleTypes: [],
    attribution: attr("low", ["prked-lions", "parkingaccess"], PIN_NOTE),
  },
  {
    id: "highmark-hammers-lot",
    slug: "hammers-lot",
    venueId: VENUE_ID,
    name: "Hammer's Lot",
    type: "private_lot",
    operator: "Eric Matwijow (owner, per media)",
    ownership: fact<Ownership>("private", "medium", ["wkbw-hammers-2024", "audacy-hammers"], "Privately owned by the same owner for about 40 years, per local media."),
    access: fact<AccessLevel>("public", "low", ["prked-patriots"], "A single 2026 third-party listing says first-come, first-served, paid on arrival."),
    address: "4170 Abbott Rd, Orchard Park, NY 14127",
    location: { lat: 42.7681, lng: -78.7881, precision: "approximate" },
    description: "Famous private tailgate lot next to the stadium near Big Tree Rd, run by the same owner for about 40 years. Reported open and busy for the 2026 opener. Private lots are not covered by Bills tailgate rules.",
    prices: [
      {
        id: "hammers-2026-prked",
        min: 40,
        max: 60,
        vehicle: "car",
        eventKind: "nfl_regular",
        season: "2026",
        observedAt: "2026-10-04",
        paymentNotes: "Reported cash or Venmo, first-come, first-served.",
        attribution: attr("low", ["prked-patriots"], "Single third-party report."),
      },
    ],
    payment: {
      accepted: ["cash", "venmo"],
      timing: "pay_on_arrival",
      reportedAt: "2026-10-04",
      notes: "Reported first-come, first-served, paid at the lot.",
      attribution: attr("low", ["prked-patriots"], "Single third-party report; not yet verified by LotLizard or the owner."),
    },
    amenities: fact<ParkingFacility["amenities"]["value"]>(["tailgate_area"], "low", ["audacy-hammers"]),
    tailgating: {
      allowed: fact<boolean | "unknown">(true, "medium", ["audacy-hammers", "wkbw-hammers-2024"]),
      atmosphere: fact(5, "low", ["audacy-hammers", "wkbw-hammers-2024", "lotlizard-editorial"], "Editorial rating based on media coverage of a long-running, famous tailgate lot. Not a measured score."),
    },
    exit: { routes: ["Abbott Rd → Big Tree Rd (one-way post-game)"] },
    vehicleTypes: ["car"],
    attribution: attr(
      "medium",
      ["audacy-hammers", "wkbw-hammers-2024", "prked-patriots", "billsfans-tailgating"],
      `Address from a third-party listing. One fan guide reports a March 2026 change of ownership with 2026 operations unconfirmed; 2026 home-opener coverage describes the lot open under its long-time owner. ${PIN_NOTE}`,
    ),
  },
  {
    id: "highmark-gorilla-parking",
    slug: "gorilla-parking",
    venueId: VENUE_ID,
    name: "Gorilla Parking",
    type: "private_lot",
    ownership: fact<Ownership>("private", "low", ["facebook-gorilla"], "Described as a private lot on its own Facebook page; not independently confirmed."),
    access: fact<AccessLevel>("public", "medium", ["facebook-gorilla"], "Advertises seasonal parking spots for the Bills 2026 preseason and regular season; message the lot for details."),
    address: "4177 Abbott Rd, Orchard Park, NY 14127",
    location: { lat: 42.7677, lng: -78.7869, precision: "approximate" },
    description: "Private lot at the corner of Abbott Rd and Allen St. Its Facebook page advertises seasonal spots for the 2026 Bills preseason and regular season; its website says it holds up to 70 cars. No lot-specific price found yet.",
    prices: [
      {
        id: "abbott-area-2026",
        min: 60,
        max: 70,
        vehicle: "car",
        eventKind: "nfl_regular",
        season: "2026",
        observedAt: "2026-10-04",
        paymentNotes: "Cash typical for private lots.",
        scope: "area",
        attribution: attr("low", ["prked-patriots", "arenacapacity"], "Area range for private lots on Abbott Rd — not specific to this lot."),
      },
    ],
    amenities: fact<ParkingFacility["amenities"]["value"]>([], "unverified", ["lotlizard-editorial"]),
    tailgating: { allowed: fact<boolean | "unknown">("unknown", "unverified", ["lotlizard-editorial"]) },
    exit: { routes: ["Abbott Rd"] },
    vehicleTypes: ["car"],
    attribution: attr("medium", ["facebook-gorilla", "gorilla-site", "billsfans-tailgating"], `Operator's own Facebook page and website (2026 season). ${PIN_NOTE}`),
  },
  {
    id: "highmark-yellow-brick",
    slug: "yellow-brick-parking",
    venueId: VENUE_ID,
    name: "Yellow Brick Parking “Lot 1”",
    aliases: ["Lot 1", "Yellow Brick Parking", "Yellow Brick Lot 1"],
    aliasesAttribution: attr("medium", ["yellowbrick-faq", "coparking-yellowbrick"], "The operator numbers its three Big Tree Rd lots 1–3."),
    type: "private_lot",
    operator: "Yellow Brick Parking",
    ownership: fact<Ownership>("private", "low", ["coparking-yellowbrick"], "Listed as a private lot by a parking aggregator."),
    access: fact<AccessLevel>("public", "medium", ["yellowbrick-site", "yellowbrick-faq"], "Sells reserved spots for cars, RVs and limos to anyone; a booked spot is guaranteed at the price paid."),
    address: "5265 Big Tree Rd, Orchard Park, NY 14127",
    location: { lat: 42.7662, lng: -78.7812, precision: "approximate" },
    description:
      "One of three Yellow Brick Parking lots side by side on Big Tree Rd (Route 20A), near the stadium's Drive 1 entrance. Spots can be reserved on the operator's website. The operator says its lots open four hours before the event.",
    prices: [yellowBrickRavens("yellow-brick-lot-1")],
    amenities: fact<ParkingFacility["amenities"]["value"]>([], "unverified", ["lotlizard-editorial"]),
    tailgating: { allowed: fact<boolean | "unknown">("unknown", "unverified", ["lotlizard-editorial"]) },
    exit: { routes: ["Big Tree Rd eastbound to Route 219 (one-way post-game)"] },
    vehicleTypes: ["car"],
    booking: YELLOW_BRICK_BOOKING,
    attribution: attr("medium", ["yellowbrick-site", "yellowbrick-faq", "facebook-yellowbrick", "coparking-yellowbrick"], `Operator's own website and Facebook page. ${PIN_NOTE}`),
  },
  {
    id: "highmark-dannys-south",
    slug: "dannys-south",
    venueId: VENUE_ID,
    name: "Danny's South",
    type: "private_lot",
    ownership: fact<Ownership>("private", "low", ["arenacapacity"], "Described as a private lot by a third-party guide."),
    address: "4300 Abbott Rd, Orchard Park, NY 14127",
    description:
      "Restaurant at the corner of Abbott Rd and Big Tree Rd, open for all Bills home games. Game-day lot parking is reported by a third-party guide, not by the restaurant. Not pinned until the lot's location is confirmed.",
    prices: [
      {
        id: "dannys-2026",
        min: 60,
        max: 60,
        vehicle: "car",
        eventKind: "nfl_regular",
        season: "2026",
        observedAt: "2026-07-10",
        attribution: attr("low", ["arenacapacity"], "Single third-party report."),
      },
    ],
    amenities: fact<ParkingFacility["amenities"]["value"]>([], "unverified", ["lotlizard-editorial"]),
    tailgating: { allowed: fact<boolean | "unknown">("unknown", "unverified", ["lotlizard-editorial"]) },
    exit: {},
    vehicleTypes: ["car"],
    attribution: attr("low", ["arenacapacity", "dannys-site", "visitbuffalo-dannys"], "Address from the restaurant's own website; earlier LotLizard data placed it on Southwestern Blvd. Parking from a single third-party guide."),
  },
  {
    id: "highmark-big-g",
    slug: "big-g-lot",
    venueId: VENUE_ID,
    name: "Big G's Lot",
    aliases: ["Big G Properties", "Big G's"],
    aliasesAttribution: attr("medium", ["bigg-site"], "Names used on the operator's website."),
    type: "private_lot",
    operator: "Big G Properties",
    ownership: fact<Ownership>("private", "low", ["bigg-site"], "Privately run, per its own website; property ownership not independently confirmed."),
    access: fact<AccessLevel>("public", "medium", ["bigg-site"], "First come, first served."),
    address: "5375 Big Tree Rd, Orchard Park, NY 14127",
    description:
      "Private lot across from the stadium's south entrances, east of Abbott Rd. Opens four hours before events for parking and tailgating, first come, first served, with room for 160+ vehicles. Advertising Bills vs. Ravens (Nov 1, 2026). Not pinned until the entrance is confirmed.",
    prices: [],
    amenities: fact<ParkingFacility["amenities"]["value"]>(["tailgate_area", "food_vendors"], "medium", ["bigg-site"], "Tailgate zones and a BBQ food truck, per the operator."),
    features: {
      restrooms: {
        state: "available",
        reportedAt: "2026-10-30",
        notes: "Porta-potty access.",
        attribution: attr("medium", ["bigg-site"]),
      },
    },
    tailgating: { allowed: fact<boolean | "unknown">(true, "medium", ["bigg-site"], "The operator advertises parking and tailgating from four hours before events.") },
    exit: {},
    vehicleTypes: ["car"],
    attribution: attr("medium", ["bigg-site", "bigg-ravens"], "Operator's own website, including a 2026 game page. Address from the operator's website."),
  },
  {
    id: "highmark-yellow-brick-lot-2",
    slug: "yellow-brick-parking-lot-2",
    venueId: VENUE_ID,
    name: "Yellow Brick Parking “Lot 2”",
    aliases: ["Yellow Brick Lot 2"],
    aliasesAttribution: attr("medium", ["yellowbrick-faq", "coparking-yellowbrick-lot2"], "The operator numbers its three Big Tree Rd lots 1–3."),
    type: "private_lot",
    operator: "Yellow Brick Parking",
    access: fact<AccessLevel>("public", "medium", ["yellowbrick-site", "yellowbrick-faq"], "Sells reserved spots for cars, RVs and limos to anyone; a booked spot is guaranteed at the price paid."),
    address: "5241 Big Tree Rd, Orchard Park, NY 14127",
    description:
      "One of three Yellow Brick Parking lots side by side on Big Tree Rd (Route 20A). The operator sends RVs and overnight arrivals the day before an event to this lot. Spots can be reserved on the operator's website. Not pinned until the entrance is confirmed.",
    prices: [yellowBrickRavens("yellow-brick-lot-2")],
    amenities: fact<ParkingFacility["amenities"]["value"]>(["rv_friendly"], "medium", ["yellowbrick-faq"], "Designated for RV and overnight arrivals the day before an event."),
    tailgating: { allowed: fact<boolean | "unknown">("unknown", "unverified", ["lotlizard-editorial"]) },
    exit: {},
    vehicleTypes: ["car", "rv", "limo"],
    booking: YELLOW_BRICK_BOOKING,
    attribution: attr("medium", ["yellowbrick-faq", "yellowbrick-site", "coparking-yellowbrick-lot2"], "Address from the operator's FAQ."),
  },
  {
    id: "highmark-yellow-brick-lot-3",
    slug: "yellow-brick-parking-lot-3",
    venueId: VENUE_ID,
    name: "Yellow Brick Parking “Lot 3”",
    aliases: ["Yellow Brick Lot 3"],
    aliasesAttribution: attr("low", ["parkwhiz-yellowbrick-lot3"], "Lot name on a booking-platform listing."),
    type: "private_lot",
    operator: "Yellow Brick Parking",
    access: fact<AccessLevel>("public", "medium", ["yellowbrick-site", "yellowbrick-faq"], "Sells reserved spots for cars, RVs and limos to anyone; a booked spot is guaranteed at the price paid."),
    address: "5242 Big Tree Rd, Orchard Park, NY 14127",
    description:
      "The third of Yellow Brick Parking's lots on Big Tree Rd, listed as uncovered self-park event parking. Spots can be reserved on the operator's website or booking apps. Not pinned until the entrance is confirmed.",
    prices: [yellowBrickRavens("yellow-brick-lot-3")],
    amenities: fact<ParkingFacility["amenities"]["value"]>([], "unverified", ["lotlizard-editorial"]),
    tailgating: { allowed: fact<boolean | "unknown">("unknown", "unverified", ["lotlizard-editorial"]) },
    exit: {},
    vehicleTypes: ["car"],
    booking: YELLOW_BRICK_BOOKING,
    attribution: attr("low", ["parkwhiz-yellowbrick-lot3", "spothero-5242", "yellowbrick-faq"], "The operator says it runs three lots; this lot's address comes from booking-platform listings only."),
  },
  {
    id: "highmark-big-tree-lot",
    slug: "big-tree-lot",
    venueId: VENUE_ID,
    name: "Big Tree Lot",
    aliases: ["Premium Parking P8135", "4297 Abbott Road Parking"],
    aliasesAttribution: attr("low", ["mapquest-bigtreelot", "spothero-4297"], "Names on map and booking listings."),
    type: "private_lot",
    operator: "Premium Parking",
    access: fact<AccessLevel>("public", "low", ["spothero-4297", "parkme-4297"], "Bookable by anyone on SpotHero; listed as event-only parking."),
    address: "4297 Abbott Rd, Orchard Park, NY 14127",
    description:
      "Surface lot on Abbott Rd listed as Premium Parking lot P8135 and bookable in advance on SpotHero for Bills games. Listings disagree on capacity (150 or 200 spaces). No price found yet. Not pinned until the entrance is confirmed.",
    prices: [],
    amenities: fact<ParkingFacility["amenities"]["value"]>([], "unverified", ["lotlizard-editorial"]),
    tailgating: { allowed: fact<boolean | "unknown">("unknown", "unverified", ["lotlizard-editorial"]) },
    exit: {},
    vehicleTypes: ["car"],
    booking: { url: "https://spothero.com/destination/buffalo/4297-abbott-road-parking", partner: "SpotHero", isAffiliate: false },
    attribution: attr("low", ["spothero-4297", "parkme-4297", "mapquest-bigtreelot"], "Booking and map listings only; no operator page reviewed."),
  },
  {
    id: "highmark-bills-parking-5122",
    slug: "bills-parking-big-tree-rd",
    venueId: VENUE_ID,
    name: "Bills Parking (5122 Big Tree Rd)",
    type: "private_lot",
    ownership: fact<Ownership>("private", "low", ["facebook-billsparking"], "Describes itself as a private parking lot on its own Facebook page."),
    address: "5122 Big Tree Rd, Orchard Park, NY 14127",
    description:
      "Private lot on Big Tree Rd advertised on its own Facebook page for people attending Bills games, a short walk to the new stadium. No price or hours found yet. Not pinned until the entrance is confirmed.",
    prices: [],
    amenities: fact<ParkingFacility["amenities"]["value"]>([], "unverified", ["lotlizard-editorial"]),
    tailgating: { allowed: fact<boolean | "unknown">("unknown", "unverified", ["lotlizard-editorial"]) },
    exit: {},
    vehicleTypes: ["car"],
    attribution: attr("low", ["facebook-billsparking"], "Operator's own Facebook page only."),
  },
];
