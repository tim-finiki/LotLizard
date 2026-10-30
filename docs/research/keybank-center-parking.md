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

| Lot | Address | Operator evidence | Form evidence | Missing |
|---|---|---|---|---|
| Premium Parking P8027 ("Cobblestone Lot") | 155 Washington St (ParkMobile; low) | premiumparking.com/P8027 | ParkMobile: "open-air" | Entrance, coordinates, event price, payment methods, ADA, EV, height (n/a for surface) |
| Premium Parking P8022 ("Aud Lot 2") | Commercial St & Perry St (operator gives the corner only) | premiumparking.com/P8022 | Operator: "corner lot" | Street number (SpotHero: 36 Perry Blvd / 1 Commercial St; BestParking: 17 Perry Blvd), entrance, coordinates, event price |
| Premium Parking P8019 (formerly Bison's Lot) | 64 Exchange St (ParkMobile; low) | premiumparking.com/P8019 | ParkMobile/Parkopedia list it as a lot | Operator-published address, entrance, coordinates, event price |

## Candidates needing verification

| Candidate | Address | Operator (claimed) | What's missing |
|---|---|---|---|
| Premium P8146 | 199 Scott St | Premium Parking (operator page title) | Facility form (lot vs garage) isn't stated anywhere reviewed |
| Premium P8139 | 191 Scott St | Premium per ParkMobile/Parkopedia | No operator page reviewed; P-number alone isn't proof |
| Premium P8011 | 26 Mississippi St | Premium per MapQuest/CoParking/ParkMobile | No operator page reviewed |
| Perry Lot (P8048 / former Allpro Lot 48) | 144–176 Michigan Ave vs 139 Scott St | Premium (ParkMe, BestParking) vs Allpro (ParkMobile, MapQuest) | Address conflict; premiumparking.com/P8048 shows 139 Scott St while aggregators show Michigan Ave |
| Premium P8053 "Waterfront Village" | 20 Wilkeson Way | Premium (operator page) | Form not stated; likely beyond a ~15-minute walk (unmeasured) |
| Pay2Park 120 Scott St (zone 71662) | 120 Scott St | Pay2Park (own page) | Operator page is about two years old; current operation and form unconfirmed |
| Pay2Park 33 Scott St (zone 71666) | 33 Scott St | Pay2Park per ParkMobile | No operator page reviewed |
| Pay2Park Lot 65 / 62 | 125 Scott St | Pay2Park per ParkWhiz/MapQuest | Lot number conflict (65 vs 62) |
| 15 Exchange St | 15 Exchange St | Unknown | SpotHero listing only |
| 17 Perry Blvd | 17 Perry Blvd | Possibly the same as P8022 | Duplicate check needed |
| BCAR Fernbach Ramp | 200 Pearl St | Buffalo Civic Auto Ramps | Walk time unmeasured (Pearl & Eagle); covered status not sourced |
| BCAR Augspurger and Turner ramps | Franklin St; Niagara Square | Buffalo Civic Auto Ramps | No street address; likely beyond ~15 minutes |

## Rejected

| Candidate | Reason |
|---|---|
| Premium P8111 Main & Swan (270 Washington St) | Advertised for monthly, non-reserved parking only |
| Main/Seneca lot (AllPro Parking Realty) | Sold to Merchants Mutual in 2026 (Buffalo Rising); not a public lot |
| Premium "Buffalo Marriott at LECOM HARBORCENTER" page | A destination page, not a facility; the Harborcenter ramp is already listed |
