"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
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
  /** Pixels of map covered by an overlay at the bottom (the results sheet), so pins aren't hidden behind it. */
  bottomInset?: number;
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

function FitBounds({ points, bottomInset }: { points: [number, number][]; bottomInset: number }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  const latest = useRef({ points, bottomInset });
  useEffect(() => {
    latest.current = { points, bottomInset };
  });

  useEffect(() => {
    const fit = () => {
      const { points: pts, bottomInset: inset } = latest.current;
      if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [24, 72], paddingBottomRight: [24, inset + 24], maxZoom: 16 });
    };
    fit();
    // The container can change size after mount (layout settling, rotation, breakpoint changes):
    // re-measure and refit until the user starts moving the map themselves.
    let userMoved = false;
    const onUserMove = () => (userMoved = true);
    map.on("dragstart zoomstart", onUserMove);
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
      if (!userMoved) fit();
    });
    ro.observe(map.getContainer());
    return () => {
      ro.disconnect();
      map.off("dragstart zoomstart", onUserMove);
    };
  }, [map, key]);
  return null;
}

/** Centre the selected pin in the part of the map not covered by the sheet. */
function PanToActive({ marker, bottomInset }: { marker?: MapMarker; bottomInset: number }) {
  const map = useMap();
  const id = marker?.id;
  useEffect(() => {
    if (!marker) return;
    const point = map.project([marker.lat, marker.lng], map.getZoom()).add([0, bottomInset / 2]);
    map.panTo(map.unproject(point, map.getZoom()), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pan only when the selection changes
  }, [map, id]);
  return null;
}

export default function VenueMap({ venue, markers, activeId, onSelect, bottomInset = 0 }: VenueMapProps) {
  const points = useMemo<[number, number][]>(() => [[venue.lat, venue.lng], ...markers.map((m) => [m.lat, m.lng] as [number, number])], [venue, markers]);
  const active = markers.find((m) => m.id === activeId);

  return (
    <MapContainer center={[venue.lat, venue.lng]} zoom={15} scrollWheelZoom={false} zoomControl={false} className="h-full w-full" attributionControl>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
      <ZoomControl position="topright" />
      <FitBounds points={points} bottomInset={bottomInset} />
      <PanToActive marker={active} bottomInset={bottomInset} />
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
          alt={`${m.name}, ${FACILITY_TYPE_LABEL[m.type]}`}
        >
          <Tooltip direction="top" offset={[0, -12]}>
            {m.name} · {FACILITY_TYPE_LABEL[m.type]}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
