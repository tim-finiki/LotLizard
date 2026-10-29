import type { GeoPoint } from "@/lib/types";

const EARTH_RADIUS_M = 6_371_000;
/** Walking routes are longer than the straight line; 1.3 is a common urban detour factor. */
export const ROUTE_FACTOR = 1.3;
/** ~4.8 km/h — a crowd-adjusted walking pace. */
export const WALK_METERS_PER_MINUTE = 80;

type LatLng = Pick<GeoPoint, "lat" | "lng">;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export interface WalkEstimate {
  meters: number;
  minutes: number;
}

/** Estimated walking distance/time along a typical route. Always presented as an estimate. */
export function estimateWalk(from: LatLng, to: LatLng): WalkEstimate {
  const meters = Math.round(haversineMeters(from, to) * ROUTE_FACTOR);
  return { meters, minutes: Math.max(1, Math.round(meters / WALK_METERS_PER_MINUTE)) };
}

export function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  if (miles < 0.1) return `${Math.round(meters * 3.28084)} ft`;
  return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
}

export function boundsOf(points: LatLng[]): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  let [minLat, minLng, maxLat, maxLng] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLat = Math.max(maxLat, p.lat);
    maxLng = Math.max(maxLng, p.lng);
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}
