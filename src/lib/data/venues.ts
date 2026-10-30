import type { Venue, VenueType } from "@/lib/types";
import { attr, fact } from "@/lib/data/attr";

const highmark: Venue = {
  id: "highmark-stadium",
  slug: "highmark-stadium",
  name: "Highmark Stadium",
  type: "stadium",
  teams: ["Buffalo Bills"],
  address: { street: "10 Bills Plaza", city: "Orchard Park", state: "NY", postalCode: "14127" },
  location: { lat: 42.77306, lng: -78.79222, precision: "approximate" },
  timezone: "America/New_York",
  coverage: "pilot_detailed",
  capacity: fact(60108, "low", ["wikipedia-highmark"], "Reported seated capacity; ~63,000 including standing room. Sources differ."),
  summary:
    "The new home of the Buffalo Bills opened in 2026 across Abbott Road from the former stadium. All Bills lots require a pre-purchased pass, so the private lots along Abbott Rd, Southwestern Blvd and Big Tree Rd matter more than ever.",
  gates: [],
  policies: [
    {
      id: "prepaid",
      title: "Official lots are pre-paid only",
      body: "Every Bills lot requires a parking pass bought in advance, valid only for the lot printed on it. There is no game-day cash or card sale except at the first-come, first-served ADA lots.",
      attribution: attr("medium", ["bills-parking", "bills-gameday"]),
    },
    {
      id: "hours",
      title: "Lot hours",
      body: "Official lots open 4 hours before kickoff and close 2 hours after the game. Tailgating ends at kickoff — no post-game tailgating in official lots.",
      attribution: attr("medium", ["bills-parking"]),
    },
    {
      id: "tailgate-rules",
      title: "Official tailgating rules",
      body: "Spaces are 9×18 ft with a 9×10 ft tailgate area behind the vehicle. Gas/propane grills allowed; charcoal only if raised 6+ inches. Tents allowed outside emergency lanes. No stakes, glass bottles, charcoal on the ground or PA systems (small Bluetooth speakers OK).",
      attribution: attr("medium", ["bills-parking"]),
    },
    {
      id: "rv-bus",
      title: "RVs, buses and limos",
      body: "The RV lot opens at 8:00 AM the day before home games; RVs cannot enter on game day. Buses and limos need an advance permit from the Bills Ticket Office.",
      attribution: attr("medium", ["bills-parking"]),
    },
    {
      id: "cost",
      title: "Parking costs are up in 2026",
      body: "Media report official parking prices rose more than 50% versus the former stadium, and 2026 season passes sold out. A third-party study cited an average of $132 per game for stadium-lot parking, the highest in the NFL.",
      attribution: attr("low", ["buffnews-lots", "wskg-cost", "parkingaccess"], "Price levels are reported, not official. LotLizard has not verified the $132 figure."),
    },
    {
      id: "private-lots",
      title: "Private lots are regulated by the town",
      body: "Orchard Park plans permits for private event parking within one mile of the stadium (targeted for 2027) and limits long-stay RVs on private property. Private lots are not covered by Bills tailgating rules.",
      attribution: attr("medium", ["buffnews-permits"]),
    },
  ],
  transit: [
    {
      id: "nfta",
      name: "NFTA Game Day Express",
      description: "$5 one-way express buses from six Buffalo-area hubs to the Transit Center at Abbott Rd & Southwestern Blvd. Exact cash or Token Transit.",
      attribution: attr("medium", ["nfta-gde"]),
    },
    {
      id: "rideshare",
      name: "Rideshare",
      description: "Reported pickup/drop-off at the west end of the former SUNY Erie South Campus via Southwestern Blvd. Not officially confirmed for the new stadium.",
      attribution: attr("low", ["prked-lions", "parkingaccess"]),
    },
  ],
  trafficNotes: [
    {
      id: "abbott-closure",
      title: "Abbott Rd closes early",
      body: "The stretch of Abbott Rd next to the stadium closes about 6 hours before kickoff (around 7 AM for a 1 PM game) and reopens after the game.",
      attribution: attr("medium", ["wnymedia-traffic", "wkbw-opener"]),
    },
    {
      id: "big-tree-one-way",
      title: "Post-game: Big Tree Rd goes one-way",
      body: "After the game Big Tree Rd runs two lanes one-way: eastbound from Abbott Rd to Route 219, westbound from Abbott Rd to Southwestern Blvd. Southbound Abbott traffic can turn east onto Big Tree.",
      attribution: attr("medium", ["wnymedia-traffic", "wgrz-opener-traffic"]),
    },
  ],
  approaches: [
    { id: "north", label: "North (Buffalo, I-90)", description: "Toward downtown Buffalo and the Thruway (I-90), typically via US-219 north." },
    { id: "east", label: "East (East Aurora)", description: "Toward East Aurora via Big Tree Rd (US-20A), which runs one-way eastbound after the game." },
    { id: "south", label: "South (Southern Tier)", description: "Toward Boston, Springville and the Southern Tier via US-219 south." },
    { id: "west", label: "West (Hamburg)", description: "Toward Hamburg and the lakeshore via Southwestern Blvd (US-20)." },
  ],
  lotOpenHoursBefore: fact(4, "medium", ["bills-parking"], "Official lots open 4 hours before kickoff."),
  attribution: attr("medium", ["wxxi-first-game", "wikipedia-highmark", "latlong-highmark"], "Bills' first regular-season game at the new stadium was Sept 17, 2026. Coordinates are approximate."),
};

type DirectoryRow = [slug: string, name: string, type: VenueType, teams: string[], city: string, state: string, lat: number, lng: number];

/**
 * Directory-only venues: name, city and approximate location from LotLizard editorial
 * knowledge. No parking data is shown for these until it is sourced.
 */
const DIRECTORY: DirectoryRow[] = [
  ["geha-field-at-arrowhead-stadium", "GEHA Field at Arrowhead Stadium", "stadium", ["Kansas City Chiefs"], "Kansas City", "MO", 39.0489, -94.4839],
  ["lambeau-field", "Lambeau Field", "stadium", ["Green Bay Packers"], "Green Bay", "WI", 44.5013, -88.0622],
  ["lincoln-financial-field", "Lincoln Financial Field", "stadium", ["Philadelphia Eagles"], "Philadelphia", "PA", 39.9008, -75.1675],
  ["metlife-stadium", "MetLife Stadium", "stadium", ["New York Giants", "New York Jets"], "East Rutherford", "NJ", 40.8135, -74.0745],
  ["gillette-stadium", "Gillette Stadium", "stadium", ["New England Patriots"], "Foxborough", "MA", 42.0909, -71.2643],
  ["att-stadium", "AT&T Stadium", "stadium", ["Dallas Cowboys"], "Arlington", "TX", 32.7473, -97.0945],
  ["sofi-stadium", "SoFi Stadium", "stadium", ["Los Angeles Rams", "Los Angeles Chargers"], "Inglewood", "CA", 33.9535, -118.3392],
  ["soldier-field", "Soldier Field", "stadium", ["Chicago Bears"], "Chicago", "IL", 41.8623, -87.6167],
  ["acrisure-stadium", "Acrisure Stadium", "stadium", ["Pittsburgh Steelers"], "Pittsburgh", "PA", 40.4468, -80.0158],
  ["mercedes-benz-stadium", "Mercedes-Benz Stadium", "stadium", ["Atlanta Falcons", "Atlanta United"], "Atlanta", "GA", 33.7554, -84.4008],
  ["lumen-field", "Lumen Field", "stadium", ["Seattle Seahawks", "Seattle Sounders"], "Seattle", "WA", 47.5952, -122.3316],
  ["empower-field-at-mile-high", "Empower Field at Mile High", "stadium", ["Denver Broncos"], "Denver", "CO", 39.7439, -105.0201],
  ["hard-rock-stadium", "Hard Rock Stadium", "stadium", ["Miami Dolphins"], "Miami Gardens", "FL", 25.958, -80.2389],
  ["mt-bank-stadium", "M&T Bank Stadium", "stadium", ["Baltimore Ravens"], "Baltimore", "MD", 39.278, -76.6227],
  ["ford-field", "Ford Field", "stadium", ["Detroit Lions"], "Detroit", "MI", 42.34, -83.0456],
  ["allegiant-stadium", "Allegiant Stadium", "stadium", ["Las Vegas Raiders"], "Las Vegas", "NV", 36.0909, -115.1833],
  ["caesars-superdome", "Caesars Superdome", "stadium", ["New Orleans Saints"], "New Orleans", "LA", 29.9511, -90.0812],
  ["keybank-center", "KeyBank Center", "arena", ["Buffalo Sabres"], "Buffalo", "NY", 42.875, -78.8764],
  ["sahlen-field", "Sahlen Field", "ballpark", ["Buffalo Bisons"], "Buffalo", "NY", 42.8805, -78.874],
  ["madison-square-garden", "Madison Square Garden", "arena", ["New York Knicks", "New York Rangers"], "New York", "NY", 40.7505, -73.9934],
  ["yankee-stadium", "Yankee Stadium", "ballpark", ["New York Yankees"], "Bronx", "NY", 40.8296, -73.9262],
  ["fenway-park", "Fenway Park", "ballpark", ["Boston Red Sox"], "Boston", "MA", 42.3467, -71.0972],
  ["wrigley-field", "Wrigley Field", "ballpark", ["Chicago Cubs"], "Chicago", "IL", 41.9484, -87.6553],
  ["dodger-stadium", "Dodger Stadium", "ballpark", ["Los Angeles Dodgers"], "Los Angeles", "CA", 34.0739, -118.24],
  ["crypto-com-arena", "Crypto.com Arena", "arena", ["Los Angeles Lakers", "Los Angeles Kings"], "Los Angeles", "CA", 34.043, -118.2673],
  ["red-rocks-amphitheatre", "Red Rocks Amphitheatre", "amphitheater", [], "Morrison", "CO", 39.6654, -105.2057],
  ["hollywood-bowl", "Hollywood Bowl", "amphitheater", [], "Los Angeles", "CA", 34.1122, -118.3391],
  ["sphere-las-vegas", "Sphere", "concert_venue", [], "Las Vegas", "NV", 36.1208, -115.1617],
  ["indianapolis-motor-speedway", "Indianapolis Motor Speedway", "speedway", [], "Speedway", "IN", 39.795, -86.2347],
  ["michigan-stadium", "Michigan Stadium", "college_stadium", ["Michigan Wolverines"], "Ann Arbor", "MI", 42.2658, -83.7487],
  ["ohio-stadium", "Ohio Stadium", "college_stadium", ["Ohio State Buckeyes"], "Columbus", "OH", 40.0017, -83.0197],
];

const directoryVenues: Venue[] = DIRECTORY.map(([slug, name, type, teams, city, state, lat, lng]) => ({
  id: slug,
  slug,
  name,
  type,
  teams,
  address: { city, state },
  location: { lat, lng, precision: "approximate" },
  coverage: "venue_only",
  attribution: attr("unverified", ["lotlizard-editorial"], "Directory listing from LotLizard editorial; naming rights and details change — verify before relying on it."),
}));

export const VENUES: Venue[] = [highmark, ...directoryVenues];
