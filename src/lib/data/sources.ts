import type { DataSource } from "@/lib/types";

/**
 * Global source registry. Facts reference these IDs. Sources marked "search snippet" were
 * reviewed through search results and still need a direct page re-check before any
 * fact citing them can be promoted above "medium".
 */
const SNIPPET = "Reviewed via search results 2026-10-29; direct page re-check pending.";

export const SOURCES: DataSource[] = [
  // Official
  { id: "bills-parking", type: "official", name: "Buffalo Bills — Stadium Parking", url: "https://www.buffalobills.com/stadium/parking", retrievedAt: "2026-10-29", notes: SNIPPET },
  { id: "bills-gameday", type: "official", name: "Buffalo Bills — Game Day Guide", url: "https://www.buffalobills.com/game-day/", retrievedAt: "2026-10-29", notes: SNIPPET },
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

  // LotLizard
  { id: "lotlizard-editorial", type: "editorial_estimate", name: "LotLizard editorial (placement/estimate — not field-verified)", retrievedAt: "2026-10-29", notes: "Map pins, directory listings and ratings derived by LotLizard editors from the cited sources. Not surveyed on site." },
  { id: "community", type: "user_report", name: "LotLizard community reports (moderated)", retrievedAt: "2026-10-29" },
];

const byId = new Map(SOURCES.map((s) => [s.id, s]));

export function getSource(id: string): DataSource | undefined {
  return byId.get(id);
}
