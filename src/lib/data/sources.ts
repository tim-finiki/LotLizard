import type { DataSource } from "@/lib/types";

/**
 * Global source registry. Facts reference these IDs. Sources marked "search snippet" were
 * reviewed through search results and still need a direct page re-check before any
 * fact citing them can be promoted above "medium".
 */
const SNIPPET = "Reviewed via search results 2026-10-29; direct page re-check pending.";
const SNIPPET_1030 = "Reviewed via search results 2026-10-30; direct page re-check pending.";

export const SOURCES: DataSource[] = [
  // Official
  { id: "bills-parking", type: "official", name: "Buffalo Bills — Stadium Parking", url: "https://www.buffalobills.com/stadium/parking", retrievedAt: "2026-10-29", notes: SNIPPET },
  { id: "bills-gameday", type: "official", name: "Buffalo Bills — Game Day Guide", url: "https://www.buffalobills.com/game-day/", retrievedAt: "2026-10-29", notes: SNIPPET },
  { id: "erie-county-stadium-transfer", type: "official", name: "Erie County — Ownership of new Highmark Stadium transferred to New York State", url: "https://www4.erie.gov/exec/press/ownership-new-highmark-stadium-officially-transferred-erie-county-new-york-state", retrievedAt: "2026-10-29", notes: SNIPPET },
  { id: "bills-accessibility", type: "official", name: "Buffalo Bills — A–Z Guide: Accessible Services (Parking)", url: "https://www.buffalobills.com/stadium/a-z-guide", retrievedAt: "2026-10-29", notes: SNIPPET },
  { id: "nfta-gde", type: "official", name: "NFTA Metro — Game Day Express", url: "https://metro.nfta.com/getting-around/special-services/game-day-express", retrievedAt: "2026-10-29", notes: SNIPPET },

  // Media
  { id: "wxxi-first-game", type: "media", name: "WXXI News — Bills announce first game in new Highmark Stadium", url: "https://www.wxxinews.org/new-york-public-news-network/2026-05-12/bills-announce-date-and-opponent-for-first-game-in-new-highmark-stadium", retrievedAt: "2026-05-12" },
  { id: "wgrz-opener-traffic", type: "media", name: "WGRZ — Traffic information for Bills home opener (Erie County Sheriff)", url: "https://www.wgrz.com/article/sports/nfl/bills/traffic-information-bills-home-opener/71-342889aa-efd6-4a66-b6b9-6a624c079aaf", retrievedAt: "2026-09-15" },
  { id: "wnymedia-traffic", type: "media", name: "WNYMedia — Erie County Sheriff's Office Bills game traffic plan", url: "https://wnymedia.net/2026/10/03/erie-county-sheriffs-office-bills-game-traffic-plan/", retrievedAt: "2026-10-03" },
  { id: "wkbw-opener", type: "media", name: "WKBW — Bills home opener: traffic and game-day plans", url: "https://www.wkbw.com/news/local-news/bills-home-opener-what-to-know-about-traffic-school-dismissals-and-game-day-plans", retrievedAt: "2026-09-15" },
  { id: "wkbw-transit-hub", type: "media", name: "WKBW — Bills and NFTA reveal transportation hub plans", url: "https://www.wkbw.com/news/local-news/southtowns/buffalo-bills-and-nfta-reveal-plans-for-transportation-hub-at-new-highmark-stadium", retrievedAt: "2026-10-29" },
  { id: "buffnews-lots", type: "media", name: "The Buffalo News — New Highmark Stadium lot configurations and prices", url: "https://buffalonews.com/news/local/business/article_ab569655-6f46-4911-87df-9cce51097f53.html", retrievedAt: "2026-10-29", notes: SNIPPET },
  { id: "buffnews-permits", type: "media", name: "The Buffalo News — Orchard Park private event-parking permits", url: "https://buffalonews.com/news/local/article_d83950a0-d2ce-409f-8ea7-54f7515023f6.html", retrievedAt: "2026-10-29", notes: SNIPPET },
  { id: "wskg-cost", type: "media", name: "WSKG — Study ranks new Highmark Stadium NFL's most expensive to attend", url: "https://wskg.org/2026-08-18/study-new-highmark-stadium-ranks-as-nfls-most-expensive-to-attend", retrievedAt: "2026-08-18" },
  { id: "wgrz-ravens-traffic", type: "media", name: "Erie County Sheriff's Office traffic information for the Bills–Ravens game (via Yahoo Sports/WGRZ)", url: "https://sports.yahoo.com/articles/erie-county-sheriffs-office-releases-181716497.html", retrievedAt: "2026-10-29", notes: SNIPPET },
  { id: "wamc-stadium-transfer", type: "media", name: "WAMC — Erie County transfers ownership of Highmark Stadium to New York State", url: "https://www.wamc.org/2026-08-03/erie-county-transfers-ownership-of-highmark-stadium-to-new-york-state", retrievedAt: "2026-10-29", notes: SNIPPET },
  { id: "audacy-hammers", type: "media", name: "WBEN/Audacy — Tailgating at the new Bills stadium", url: "https://www.audacy.com/wben/news/local/tailgate-bills-stadium", retrievedAt: "2026-09-17" },
  { id: "wkbw-hammers-2024", type: "media", name: "WKBW — Owner of popular tailgate lot on Highmark Stadium parking map", url: "https://www.wkbw.com/news/local-news/owner-of-popular-buffalo-bills-tailgate-lot-voices-concerns-over-highmark-stadium-parking-map", retrievedAt: "2024-09-01" },

  { id: "13wham-schedule", type: "media", name: "13WHAM — 2026 Bills schedule features Thanksgiving and Christmas games", url: "https://13wham.com/sports/buffalo-bills/2026-buffalo-bills-schedule-features-games-on-thanksgiving-and-christmas-nfl-release-highmark-stadium-first-season", retrievedAt: "2026-05-14" },
  { id: "wivb-schedule", type: "media", name: "WIVB — 4 takeaways on the 2026 Bills schedule", url: "https://www.wivb.com/sports/buffalo-bills/4-takeaways-on-the-2026-bills-schedule-new-stadium-opening-thanksgiving-and-christmas-games/amp/", retrievedAt: "2026-05-14" },

  // Third party
  { id: "arenacapacity", type: "third_party", name: "ArenaCapacity — Highmark Stadium parking guide", url: "https://www.arenacapacity.com/highmark-stadium-parking/", retrievedAt: "2026-07-10" },
  { id: "parkingaccess", type: "third_party", name: "ParkingAccess — Highmark Stadium parking", url: "https://parkingaccess.com/highmark-stadium-parking", retrievedAt: "2026-10-29" },
  { id: "prked-lions", type: "third_party", name: "Prked — Bills vs. Lions parking (2026-09-17)", url: "https://prked.com/bills-vs-lions-parking-highmark-stadium-09-17-2026", retrievedAt: "2026-09-17" },
  { id: "prked-patriots", type: "third_party", name: "Prked — Bills vs. Patriots parking (2026-10-04)", url: "https://prked.com/bills-vs-patriots-parking-highmark-stadium-10-04-2026", retrievedAt: "2026-10-04" },
  { id: "ticketmaster-blog", type: "third_party", name: "Ticketmaster blog — Step inside Highmark Stadium", url: "https://blog.ticketmaster.com/step-inside-highmark-stadium-orchard-park-ny/", retrievedAt: "2026-10-29" },
  { id: "wikipedia-highmark", type: "third_party", name: "Wikipedia — Highmark Stadium", url: "https://en.wikipedia.org/wiki/Highmark_Stadium", retrievedAt: "2026-10-29", notes: SNIPPET },
  { id: "latlong-highmark", type: "third_party", name: "LatLong.net — New Highmark Stadium coordinates", url: "https://www.latlong.net/place/new-highmark-stadium-new-york-34252.html", retrievedAt: "2026-10-29" },
  { id: "coparking-yellowbrick", type: "third_party", name: "CoParking listing — Yellow Brick Parking", url: "https://coparking.ch/en/United-States/parking/73055", retrievedAt: "2026-10-29" },
  { id: "facebook-gorilla", type: "operator", name: "Gorilla Parking (4177 Abbott Rd) — Facebook page", url: "https://www.facebook.com/4177AbbottRoad/", retrievedAt: "2026-10-29" },

  // Private lots (2026-10-30 research). Operator pages count as the lot's own public advertising.
  { id: "bigg-site", type: "operator", name: "Big G Properties — Big G's Lot", url: "https://www.biggpropertiesllc.com/", retrievedAt: "2026-10-30", notes: SNIPPET_1030 },
  { id: "bigg-ravens", type: "operator", name: "Big G Properties — Bills vs. Ravens parking (Nov 1, 2026)", url: "https://www.biggpropertiesllc.com/event-details-registration/bills-vs-ravens-parking", retrievedAt: "2026-10-30", notes: SNIPPET_1030 },
  { id: "yellowbrick-site", type: "operator", name: "Yellow Brick Parking — Highmark Stadium parking", url: "https://yellowbrickparkinglot.com/", retrievedAt: "2026-10-30", notes: SNIPPET_1030 },
  { id: "yellowbrick-faq", type: "operator", name: "Yellow Brick Parking — FAQ", url: "https://yellowbrickparkinglot.com/faq/", retrievedAt: "2026-10-30", notes: SNIPPET_1030 },
  { id: "facebook-yellowbrick", type: "operator", name: "Yellow Brick Parking — Facebook page", url: "https://www.facebook.com/yellowbrickparking/", retrievedAt: "2026-10-30", notes: SNIPPET_1030 },
  { id: "coparking-yellowbrick-lot2", type: "third_party", name: "CoParking listing — Yellow Brick Parking Lot 2", url: "https://coparking.ch/en/United-States/parking/73064", retrievedAt: "2026-10-30", notes: SNIPPET_1030 },
  { id: "parkwhiz-yellowbrick-lot3", type: "third_party", name: "ParkWhiz — Yellow Brick Parking Lot 3, 5242 Big Tree Road (event listing, June 2026)", url: "https://www.parkwhiz.ca/checkout?quote_id=047fdc01-92b9-4a47-b859-57e502d9e01a", retrievedAt: "2026-10-30", notes: SNIPPET_1030 },
  { id: "spothero-5242", type: "third_party", name: "SpotHero — 5242 Big Tree Road parking", url: "https://spothero.com/destination/buffalo/5242-big-tree-road-parking", retrievedAt: "2026-10-30", notes: SNIPPET_1030 },
  { id: "spothero-4297", type: "third_party", name: "SpotHero — 4297 Abbott Road parking", url: "https://spothero.com/destination/buffalo/4297-abbott-road-parking", retrievedAt: "2026-10-30", notes: SNIPPET_1030 },
  { id: "parkme-4297", type: "third_party", name: "ParkMe — Big Tree Lot, 4297 Abbott Rd", url: "https://www.parkme.com/lot/1230346/4297-abbott-rd", retrievedAt: "2026-10-30", notes: SNIPPET_1030 },
  { id: "mapquest-bigtreelot", type: "third_party", name: "MapQuest — Big Tree Lot (Premium Parking Lot P8135)", url: "https://www.mapquest.com/us/new-york/big-tree-lot-premium-parking-lot-p8135-753842619", retrievedAt: "2026-10-30", notes: SNIPPET_1030 },
  { id: "facebook-billsparking", type: "operator", name: "Bills Parking (5122 Big Tree Rd) — Facebook page", url: "https://www.facebook.com/billsparking/", retrievedAt: "2026-10-30", notes: SNIPPET_1030 },
  { id: "gorilla-site", type: "operator", name: "Gorilla Lot — website", url: "https://www.gorillalotparking.com/", retrievedAt: "2026-10-30", notes: SNIPPET_1030 },
  { id: "billsfans-tailgating", type: "third_party", name: "BillsFans — Bills Mafia tailgating guide", url: "https://www.billsfans.com/the-ultimate-buffalo-bills-game-day-guide/tailgating/", retrievedAt: "2026-10-30", notes: SNIPPET_1030 },
  { id: "dannys-site", type: "operator", name: "Danny's South — restaurant website", url: "https://www.dannysrestaurant.com/dannys-south/", retrievedAt: "2026-10-30", notes: SNIPPET_1030 },
  { id: "visitbuffalo-dannys", type: "third_party", name: "Visit Buffalo Niagara — Danny's South", url: "https://visitbuffalo.com/businesses/dannys-south/", retrievedAt: "2026-10-30", notes: SNIPPET_1030 },

  // LotLizard
  { id: "lotlizard-editorial", type: "editorial_estimate", name: "LotLizard editorial (placement/estimate — not field-verified)", retrievedAt: "2026-10-29", notes: "Map pins, directory listings and ratings derived by LotLizard editors from the cited sources. Not surveyed on site." },
  { id: "community", type: "user_report", name: "LotLizard community reports (moderated)", retrievedAt: "2026-10-29" },
];

const byId = new Map(SOURCES.map((s) => [s.id, s]));

export function getSource(id: string): DataSource | undefined {
  return byId.get(id);
}
