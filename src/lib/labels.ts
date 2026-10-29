import type { Amenity, CoverageLevel, FacilityType, VenueType } from "@/lib/types";

export const FACILITY_TYPE_LABEL: Record<FacilityType, string> = {
  official_lot: "Official lot",
  private_lot: "Private lot",
  garage: "Garage",
  independent: "Independent",
  residential: "Residential",
  shuttle: "Shuttle",
  rideshare_zone: "Rideshare",
  ada: "ADA",
};

/** Marker/legend colors. Hex so they work in both Tailwind classes and Leaflet divIcons. */
export const FACILITY_TYPE_COLOR: Record<FacilityType, string> = {
  official_lot: "#2563eb",
  private_lot: "#16a34a",
  garage: "#7c3aed",
  independent: "#ea580c",
  residential: "#d97706",
  shuttle: "#0891b2",
  rideshare_zone: "#db2777",
  ada: "#4f46e5",
};

export const AMENITY_LABEL: Record<Amenity, string> = {
  restrooms: "Restrooms",
  portable_toilets: "Portable toilets",
  ada_spaces: "ADA spaces",
  lighting: "Lighting",
  paved: "Paved",
  grass: "Grass",
  security: "Security",
  shuttle_service: "Shuttle",
  food_vendors: "Food vendors",
  rv_friendly: "RV friendly",
  tailgate_area: "Tailgate space",
  covered: "Covered",
  ev_charging: "EV charging",
};

export const VENUE_TYPE_LABEL: Record<VenueType, string> = {
  stadium: "Stadium",
  arena: "Arena",
  ballpark: "Ballpark",
  amphitheater: "Amphitheater",
  concert_venue: "Concert venue",
  speedway: "Speedway",
  college_stadium: "College stadium",
};

export const COVERAGE_LABEL: Record<CoverageLevel, string> = {
  pilot_detailed: "Detailed parking guide",
  basic: "Basic parking info",
  venue_only: "Parking data coming soon",
};
