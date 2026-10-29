import type { Attributed, ParkingFacility, PriceObservation } from "@/lib/types";
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

const prepaid = fact(true, "medium", ["bills-parking", "bills-gameday"], "Bills lots require a pass bought in advance; passes are valid only for the lot printed on them.");
const officialTailgate = fact<boolean | "unknown">(true, "medium", ["bills-parking"], "Tailgating allowed from lot opening (4 hours before kickoff) until kickoff. No post-game tailgating.");
const officialAmenities = fact<ParkingFacility["amenities"]["value"]>(["tailgate_area", "paved"], "low", ["bills-parking", "lotlizard-editorial"], "Each space is 9×18 ft with a 9×10 ft tailgate area. Surface and other amenities not yet verified.");

const DIRECTION_NOTE =
  "LotLizard inference from the sheriff's published post-game traffic plan (Big Tree Rd one-way east to US-219, west to Southwestern Blvd). Not an official routing.";
/** Exit-direction inference shared by lots that leave via the same corridor. */
function exitToward(...ids: string[]): Attributed<string[]> {
  return fact(ids, "low", ["wnymedia-traffic", "wgrz-opener-traffic", "lotlizard-editorial"], DIRECTION_NOTE);
}
/** Lots that drain east on Big Tree Rd to US-219 (north to Buffalo, south to the Southern Tier). */
const VIA_219 = () => exitToward("north", "south");
/** Lots that drain to Southwestern Blvd (US-20) westbound. */
const VIA_US20 = () => exitToward("west");

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
    location: { ...location, precision: "approximate" },
    description: `Official Bills lot ${sideText}, per the 2026 lot configuration reported by third-party guides. Pass must be bought in advance.`,
    prices: [officialPriceRange(slug)],
    prepaidRequired: prepaid,
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
      directions: side === "west" ? VIA_US20() : VIA_219(),
    },
    vehicleTypes: ["car"],
    attribution: attr("low", ["arenacapacity", "parkingaccess", "buffnews-lots", "lotlizard-editorial"], `Lot name/side from third-party guides. ${PIN_NOTE}`),
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
    location: { lat: 42.7714, lng: -78.7862, precision: "approximate" },
    description: "Accessible parking, first-come, first-served. Access only from Fieldhouse Dr via Big Tree Rd. ADA lots are the exception to pre-purchase.",
    prices: [],
    prepaidRequired: fact(false, "medium", ["wgrz-opener-traffic", "bills-parking"], "ADA lots are first-come, first-served."),
    amenities: fact<ParkingFacility["amenities"]["value"]>(["ada_spaces"], "medium", ["wgrz-opener-traffic"]),
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
    location: { lat: 42.7774, lng: -78.7870, precision: "approximate" },
    description: "Accessible parking, first-come, first-served. Access only from Orange Dr via Southwestern Blvd.",
    prices: [],
    prepaidRequired: fact(false, "medium", ["wgrz-opener-traffic", "bills-parking"], "ADA lots are first-come, first-served."),
    amenities: fact<ParkingFacility["amenities"]["value"]>(["ada_spaces"], "medium", ["wgrz-opener-traffic"]),
    tailgating: { allowed: fact<boolean | "unknown">("unknown", "unverified", ["lotlizard-editorial"]) },
    exit: { routes: ["Orange Dr → Southwestern Blvd (US-20)"], directions: VIA_US20() },
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
    prepaidRequired: prepaid,
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
    location: { lat: 42.7801, lng: -78.7893, precision: "approximate" },
    description: "Advance permit from the Bills Ticket Office required; vehicles without a permit are turned away. Only limos carrying 11 or fewer may tailgate. Location reported along Southwestern Blvd in 2025 and may have changed.",
    prices: [],
    prepaidRequired: fact(true, "medium", ["bills-parking"], "Advance permit required."),
    amenities: fact<ParkingFacility["amenities"]["value"]>([], "unverified", ["lotlizard-editorial"]),
    tailgating: { allowed: fact<boolean | "unknown">(true, "medium", ["bills-parking"], "Limos with 11 or fewer passengers only.") },
    exit: { routes: ["Southwestern Blvd (US-20)"], directions: VIA_US20() },
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
    amenities: fact<ParkingFacility["amenities"]["value"]>(["shuttle_service", "covered"], "medium", ["nfta-gde", "wkbw-transit-hub"], "Transit hub has a 2,500 sq ft boarding canopy."),
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
    prepaidRequired: fact(false, "low", ["prked-patriots"], "Reported first-come, first-served."),
    amenities: fact<ParkingFacility["amenities"]["value"]>(["tailgate_area"], "low", ["audacy-hammers"]),
    tailgating: {
      allowed: fact<boolean | "unknown">(true, "medium", ["audacy-hammers", "wkbw-hammers-2024"]),
      atmosphere: fact(5, "low", ["audacy-hammers", "wkbw-hammers-2024", "lotlizard-editorial"], "Editorial rating based on media coverage of a long-running, famous tailgate lot. Not a measured score."),
    },
    exit: { routes: ["Abbott Rd → Big Tree Rd (one-way post-game)"], directions: VIA_219() },
    vehicleTypes: ["car"],
    attribution: attr("medium", ["audacy-hammers", "wkbw-hammers-2024", "prked-patriots"], `Address from a third-party listing. ${PIN_NOTE}`),
  },
  {
    id: "highmark-gorilla-parking",
    slug: "gorilla-parking",
    venueId: VENUE_ID,
    name: "Gorilla Parking",
    type: "private_lot",
    address: "4177 Abbott Rd, Orchard Park, NY 14127",
    location: { lat: 42.7677, lng: -78.7869, precision: "approximate" },
    description: "Private lot on Abbott Rd with its own Facebook page. No lot-specific price found yet.",
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
        attribution: attr("low", ["prked-patriots", "arenacapacity"], "Area range for private lots on Abbott Rd — not specific to this lot."),
      },
    ],
    amenities: fact<ParkingFacility["amenities"]["value"]>([], "unverified", ["lotlizard-editorial"]),
    tailgating: { allowed: fact<boolean | "unknown">("unknown", "unverified", ["lotlizard-editorial"]) },
    exit: { routes: ["Abbott Rd"] },
    vehicleTypes: ["car"],
    attribution: attr("low", ["facebook-gorilla"], PIN_NOTE),
  },
  {
    id: "highmark-yellow-brick",
    slug: "yellow-brick-parking",
    venueId: VENUE_ID,
    name: "Yellow Brick Parking “Lot 1”",
    type: "private_lot",
    address: "5265 Big Tree Rd, Orchard Park, NY 14127",
    location: { lat: 42.7662, lng: -78.7812, precision: "approximate" },
    description: "Private lot on Big Tree Rd listed by a parking aggregator. No price found yet.",
    prices: [],
    amenities: fact<ParkingFacility["amenities"]["value"]>([], "unverified", ["lotlizard-editorial"]),
    tailgating: { allowed: fact<boolean | "unknown">("unknown", "unverified", ["lotlizard-editorial"]) },
    exit: { routes: ["Big Tree Rd eastbound to Route 219 (one-way post-game)"], directions: VIA_219() },
    vehicleTypes: ["car"],
    attribution: attr("low", ["coparking-yellowbrick"], PIN_NOTE),
  },
  {
    id: "highmark-dannys-south",
    slug: "dannys-south",
    venueId: VENUE_ID,
    name: "Danny's South",
    type: "private_lot",
    address: "Southwestern Blvd, Orchard Park, NY (exact address unconfirmed)",
    description: "Private lot on Southwestern Blvd listed by a third-party guide. Exact location unconfirmed, so it is not pinned.",
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
    exit: { routes: ["Southwestern Blvd (US-20)"], directions: VIA_US20() },
    vehicleTypes: ["car"],
    attribution: attr("low", ["arenacapacity"]),
  },
];
