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
  // Brand charcoal/forest for the common types; every colour keeps ≥4.5:1 with the pin's white label.
  official_lot: "#0f1412",
  private_lot: "#2e7d32",
  garage: "#6d28d9",
  independent: "#c2410c",
  residential: "#a16207",
  shuttle: "#0e7490",
  rideshare_zone: "#be185d",
  ada: "#1e67d2",
};

export const AMENITY_LABEL: Record<Amenity, string> = {
  lighting: "Lighting",
  paved: "Paved",
  grass: "Grass",
  security: "Security",
  shuttle_service: "Shuttle",
  food_vendors: "Food vendors",
  rv_friendly: "RV friendly",
  tailgate_area: "Tailgate space",
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
