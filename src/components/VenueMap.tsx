"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { FacilityType } from "@/lib/types";
import { FACILITY_TYPE_COLOR, FACILITY_TYPE_LABEL } from "@/lib/labels";

export interface MapMarker {
  id: string;
  name: string;
  type: FacilityType;
  lat: number;
  lng: number;
  label: string;
}

export interface VenueMapProps {
  venue: { name: string; lat: number; lng: number };
  markers: MapMarker[];
  activeId?: string;
  onSelect?: (id: string) => void;
}

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function markerIcon(m: MapMarker, active: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="ll-marker${active ? " ll-marker--active" : ""}" style="background:${FACILITY_TYPE_COLOR[m.type]}">${escapeHtml(m.label)}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const venueIcon = L.divIcon({ className: "", html: '<div class="ll-venue" aria-hidden="true">🏟</div>', iconSize: [34, 34], iconAnchor: [17, 17] });

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refit only when the point set changes
  }, [map, key]);
  return null;
}

function PanToActive({ marker }: { marker?: MapMarker }) {
  const map = useMap();
  useEffect(() => {
    if (marker) map.panTo([marker.lat, marker.lng], { animate: true });
  }, [map, marker]);
  return null;
}

export default function VenueMap({ venue, markers, activeId, onSelect }: VenueMapProps) {
  const points = useMemo<[number, number][]>(() => [[venue.lat, venue.lng], ...markers.map((m) => [m.lat, m.lng] as [number, number])], [venue, markers]);
  const active = markers.find((m) => m.id === activeId);

  return (
    <MapContainer center={[venue.lat, venue.lng]} zoom={15} scrollWheelZoom={false} className="h-full w-full" attributionControl>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
      <FitBounds points={points} />
      <PanToActive marker={active} />
      <Marker position={[venue.lat, venue.lng]} icon={venueIcon} keyboard={false}>
        <Tooltip direction="top" offset={[0, -14]}>{venue.name}</Tooltip>
      </Marker>
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={markerIcon(m, m.id === activeId)}
          zIndexOffset={m.id === activeId ? 1000 : 0}
          eventHandlers={{ click: () => onSelect?.(m.id) }}
          title={`${m.name} (${FACILITY_TYPE_LABEL[m.type]})`}
        >
          <Tooltip direction="top" offset={[0, -12]}>
            {m.name} · {FACILITY_TYPE_LABEL[m.type]}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
