import type { DataSource, ParkingFacility, Venue } from "@/lib/types";
import { VENUES as SEED_VENUES } from "@/lib/data/venues";
import { HIGHMARK_FACILITIES } from "@/lib/data/facilities/highmark";
import { SOURCES as SEED_SOURCES } from "@/lib/data/sources";
import { INVENTORY } from "@/data/inventory";
import { inventoryFacilities, inventorySources, inventoryVenue } from "@/lib/inventory/to-domain";

/**
 * Everything the site publishes: the hand-curated pilot seed plus imported inventory
 * (src/data/inventory, built by `npm run inventory`). An imported venue replaces the directory
 * entry with the same slug.
 */
const seedBySlug = new Map(SEED_VENUES.map((v) => [v.slug, v]));
const imported = INVENTORY.map((inv) => ({ inv, venue: inventoryVenue(inv, seedBySlug.get(inv.slug)) }));
const importedSlugs = new Set(imported.map((i) => i.venue.slug));

export const VENUES: Venue[] = [...SEED_VENUES.filter((v) => !importedSlugs.has(v.slug)), ...imported.map((i) => i.venue)];
export const FACILITIES: ParkingFacility[] = [...HIGHMARK_FACILITIES, ...imported.flatMap((i) => inventoryFacilities(i.inv))];
export const SOURCES: DataSource[] = [...SEED_SOURCES, ...imported.flatMap((i) => inventorySources(i.inv))];
