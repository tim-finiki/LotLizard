# KeyBank Center parking: research list

Research date: 2026-10-30. Everything in the "candidates" and "rejected" tables is **not published**.
Published facts live in `src/data/inventory/keybank-center.json`.

**Discovery note:** the 20-candidate list from earlier KeyBank research wasn't available in the
repository, so candidates were rebuilt from search results for ParkWhiz, SpotHero, ParkMobile, BestParking,
Premium Parking, Pay2Park and official KeyBank Center / City of Buffalo pages. The research environment
couldn't open those pages directly or reach a geocoder, so every fact was reviewed through search-result
excerpts (`search_snippet`, capped at medium confidence), and **no coordinates were added**.

**Publishing bar:** the operator's own listing names the facility, a street address ties to it, and a
source supports its form (surface lot vs garage). A P-number alone, or a marketplace listing alone, isn't
treated as proof of the operator. "Garage"/"ramp" isn't treated as proof of covered parking. Marketplace
and daily rates aren't published as event prices.

**Operator background:** Premium Parking (New Orleans) acquired 80% of Buffalo-based Allpro Parking in
September 2022; Allpro locations moved to the Premium brand by the end of 2023, and Allpro Parking, LLC
ceased operations on 2022-12-31 (court filing). Older listings still show Allpro names and lot numbers.
Sources: https://www.prnewswire.com/news-releases/premium-parking-acquires-allpro-parking-to-accelerate-national-growth-and-deployment-of-end-to-end-technology-platform--parking-management-solution-301625993.html,
https://buffalonews.com/news/local/business/buffalo-based-allpro-parking-acquired-by-new-orleans-firm/article_4b70d38a-38f5-11ed-a902-5f15aa636625.html,
https://law.justia.com/cases/federal/district-courts/new-york/nywdce/1:2022cv00862/143303/25/

## Audit of existing records

| Lot | Finding | Change |
|---|---|---|
| Adam Ramp, KeyBank Center Ramp, LECOM Harborcenter Ramp | "Covered" was inferred ("covered because it is a multi-level ramp"); no source said so. | `covered` removed (now unknown). |
| One Seneca Ramp | "Covered" rests on a listing that calls it underground parking. | Kept (low). |
| KeyBank Center Ramp, Surface Lot, Harborcenter Ramp | The arena's Directions & Parking page says all lots are cashless, pre-purchase through official partner JustPark is strongly encouraged, and onsite payment isn't guaranteed. | Added `payment_timing` = advance_optional and `payment_not_accepted` = cash (official, medium) with the JustPark link in the notes. |
| All five | No duplicate names, slugs or addresses. Existing approximate pins (Adam: Open Charge Map; Harborcenter: Wikipedia complex coordinates; One Seneca: LatLong.net) are labelled approximate and left unchanged. | — |

## Added (published)

| Lot | Address | Operator evidence | Form evidence | Entrance | Missing |
|---|---|---|---|---|---|
| Premium Parking P8027 ("Cobblestone Lot") | 155 Washington St (ParkMobile; low) | premiumparking.com/P8027 | ParkMobile: "open-air" | — | Entrance, coordinates, event price, payment methods, ADA, EV |
| Premium Parking P8022 ("Aud Lot 2") | Commercial St & Perry St (operator gives the corner only) | premiumparking.com/P8022 | Operator: "corner lot" | — | Street number (SpotHero: 36 Perry Blvd / 1 Commercial St; BestParking: 17 Perry Blvd), entrance, coordinates, event price |
| Premium Parking P8019 (formerly Bison's Lot) | 64 Exchange St (ParkMobile; low) | premiumparking.com/P8019 | ParkMobile/Parkopedia list it as a lot | — | Operator-published address, entrance, coordinates, event price |
| Premium Parking P8146 | 199 Scott St (operator page title) | premiumparking.com/P8146; Premium's Hofbräuhaus page ("199 Scott Street Lot (P8146)") | Operator calls it a lot; SpotHero: "self park, uncovered lot" (covered = unavailable, low) | SpotHero only: 229 Scott St, south side of Scott St between Michigan Ave and Chicago St — marked `needs_review`, so directions use 199 Scott St | Operator-confirmed entrance, coordinates, event price |
| Premium Parking P8139 | 191 Scott St (Premium's Hofbräuhaus page) | Premium's Hofbräuhaus page ("191 Scott Street Lot (P8139)"); ParkWhiz: "Operated by Premium Parking" | ParkWhiz: "well-lit and spacious surface lot"; OpenStreetMap way 1203764308 tagged surface parking | — | Coordinates (OSM geometry not readable from this environment), entrance, event price |
| Premium Parking P8011 | 26 Mississippi St (MapQuest; low) | Premium's 2024 KeyBank Center event page (Sabres vs Islanders); ParkWhiz: "operated by Premium Parking" | MapQuest/Parkopedia: "Parking Lot" | — | Current operator page, entrance, coordinates, event price |

## Candidates needing verification

| Candidate | Address | Operator (claimed) | What's missing |
|---|---|---|---|
| Perry Lot (P8048 / former Allpro Lot 48) | premiumparking.com/P8048 and SpotHero: 139 Scott St (SpotHero entrance "72 Scott St"); ParkMe/CoParking/MapQuest: 144–176 Michigan Ave | Premium (operator page, ParkMe, BestParking) vs Allpro (ParkMobile zone list, MapQuest) | Address conflict (139 Scott St vs Michigan Ave; entrance 72 Scott St is on the opposite side of the street from 139). Could be two different lots sharing a number |
| Premium P8053, 20 Wilkeson Way | 20 Wilkeson Way | Premium (operator page) | Form not stated; probably beyond a ~15-minute walk (unmeasured) |
| 33 Scott St | 33 Scott St | Joyce Parking (Parkopedia) vs Pay2Park zone 71666 (ParkMobile) | Operator conflict |
| Pay2Park 120 Scott St (zone 71662) | 120 Scott St | Pay2Park (own page) | Operator page about two years old; current operation and form unconfirmed |
| Pay2Park 125 Scott St | 125 Scott St | Pay2Park (own location page exists; ParkWhiz "Lot #65", MapQuest "Lot 62") | Lot number conflict; form unconfirmed |
| 15 Exchange St; 17 Perry Blvd | — | Unknown | Marketplace only / 17 Perry Blvd may be P8022 |
| BCAR Fernbach Ramp | 200 Pearl St | Buffalo Civic Auto Ramps | Walk time unmeasured (Pearl & Eagle); covered status not sourced |
| BCAR Augspurger and Turner ramps | Franklin St; Niagara Square | Buffalo Civic Auto Ramps | No street address; likely beyond ~15 minutes |

## Garages and covered status

No source reviewed says which levels of any downtown ramp are roofed or enclosed. "Ramp" or "garage"
alone isn't treated as evidence, so `covered` is unknown for the Adam, KeyBank Center and Harborcenter
ramps (One Seneca keeps its explicit "underground parking" listing). The KeyBank Center ramp has
accessible spaces "on all Levels next to the elevators" (Sabres A–Z guide); an older guide says it has
two entrances, both on Illinois St, and another lists it at 76 Illinois St (vs 1 Seymour H Knox III Plaza
on Parkopedia). None of that is enough to change the published entrance, address or covered status.
No height clearance was found for any ramp.

## Vehicle restrictions

Only the Adam Ramp clearance is published (in its description, from the operator). Everything else is
unknown: no source reviewed states a truck ban, RV/trailer rule or oversized-vehicle rule for any
KeyBank facility.

| Facility | Height limit | Trucks | RVs / trailers | Oversized | Source |
|---|---|---|---|---|---|
| Adam Ramp | **6'9"** (published) | Unknown | Unknown | Unknown | BCAR locations / parking-locations pages (https://bcarparking.com/locations, https://www.bcarparking.com/parking-locations/) |
| KeyBank Center Ramp | Unknown | Unknown | Unknown | Unknown | Not found on the arena, Sabres or Bandits pages |
| LECOM Harborcenter Ramp | Unknown | Unknown | Unknown | Unknown | Not found (Wikipedia: 750 indoor spaces; no clearance) |
| One Seneca Ramp | Unknown | Unknown | Unknown | Unknown | Not found |
| KeyBank Center Surface Lot | n/a | Unknown | Unknown | Unknown | Not found |
| Premium P8011, P8019, P8022, P8027, P8139, P8146 (surface) | n/a | Unknown | Unknown | Unknown | Not found; Premium/SpotHero terms reviewed don't state vehicle rules |

The City of Buffalo's Downtown Parking Ramps page says it lists "locations and height restrictions"
for city ramps, but its figures weren't visible: https://www.buffalony.gov/1733/Downtown-Parking-Ramps

## Map coordinates and verification blockers

KeyBank map: **3 mapped** (Adam Ramp, LECOM Harborcenter Ramp, One Seneca Ramp — all approximate,
labelled "Approximate") and **8 not mapped** (KeyBank Center Ramp, KeyBank Center Surface Lot and all six
Premium lots). No new pins were added: no independent coordinate for any of the six Premium lots was
found, and a street address is never turned into a pin.

Blocked from this environment (connection refused by the network policy, checked 2026-10-30):
premiumparking.com, spothero.com, parkwhiz.com, parkmobile.io, pay2park.net, keybankcenter.com,
justpark.com, buffalony.gov, gis.buffalony.gov, gis.erie.gov, openstreetmap.org, nominatim.openstreetmap.org,
overpass-api.de and geocoding.geo.census.gov. Search excerpts don't carry lot coordinates; marketplace
URLs carry the *searched destination's* coordinates, not the lot's. Further searching won't change this.

Property-level evidence that would support an approximate pin, once readable:

| Lot | Evidence to read |
|---|---|
| P8139 (191 Scott St) | OpenStreetMap way 1203764308 (tagged surface parking): https://www.openstreetmap.org/way/1203764308 — take the polygon centroid |
| P8146, P8027, P8019, P8011, P8022 | OpenStreetMap parking polygons at the address (search https://www.openstreetmap.org), or the City of Buffalo / Erie County parcel viewers for the lot outline |
| Adam Ramp (pin already approximate) | City of Buffalo GIS layer "Buffalo_Civic_Auto_Ramps": https://gis.buffalony.gov/server/rest/services/Parking/Buffalo_Civic_Auto_Ramps/FeatureServer |
| Vehicle entrances (all) | A site visit or the operator's own map; P8146's 229 Scott St entrance is SpotHero-only and stays `needs_review` |

## Sources requiring manual verification

Read these directly (a browser is enough) to confirm or promote the facts above:

| Purpose | URL |
|---|---|
| Arena payment, JustPark, lot list | https://www.keybankcenter.com/plan-your-visit/directions-parking |
| Official JustPark lots for KeyBank Center | https://www.justpark.com/us/event-parking/keybank-center |
| P8146 address, form, entrance | https://www.premiumparking.com/P8146 · https://spothero.com/facility/111791/199-scott-st-parking |
| P8139 / P8146 operator listing | https://www.premiumparking.com/city/buffalo/hofbruhaus-buffalo |
| P8139 geometry (centroid for a pin) | https://www.openstreetmap.org/way/1203764308 |
| P8011 current operator page | https://www.premiumparking.com/P8011 · https://www.premiumparking.com/city/buffalo/keybank-center/sabres-vs-islanders-314 |
| P8022 street number | https://www.premiumparking.com/P8022 · https://spothero.com/facility/107750/1-commercial-st-parking |
| P8019 operator-published address | https://www.premiumparking.com/P8019 |
| P8027 address and form | https://www.premiumparking.com/P8027 · https://parkmobile.io/parking/locations/ny/buffalo-parking/parking-lot/155-washington-st-lot-p8027 |
| P8048 address conflict | https://www.premiumparking.com/P8048 · https://spothero.com/facility/142039/72-scott-st-parking · https://coparking.ch/en/United-States/parking/52014 |
| Pay2Park Scott St lots | https://pay2park.net/locations/120-scott-street/ · https://pay2park.net/locations/125-scott-street/ |
| BCAR ramps (addresses, covered levels, clearance) | https://www.buffalony.gov/1733/Downtown-Parking-Ramps |
| Entrance pins for all facilities | OpenStreetMap (https://www.openstreetmap.org) or an on-site visit; Erie County / City of Buffalo GIS parcel viewers for lot outlines |

## Rejected

| Candidate | Reason |
|---|---|
| Premium P8111 Main & Swan (270 Washington St) | Advertised for monthly, non-reserved parking only |
| Main/Seneca lot (AllPro Parking Realty) | Sold to Merchants Mutual in 2026 (Buffalo Rising); not a public lot |
| Premium "Buffalo Marriott at LECOM HARBORCENTER" page | A destination page, not a facility; the Harborcenter ramp is already listed |
