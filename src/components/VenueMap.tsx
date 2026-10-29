"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LeafletContext, createLeafletContext, type LeafletContextInterface } from "@react-leaflet/core";
import { Marker, TileLayer, Tooltip, ZoomControl, useMap } from "react-leaflet";
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
  /** Pixels covered by floating controls at the top. */
  topInset?: number;
}

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * Like react-leaflet's MapContainer, but safe with Next's Activity route preservation. When Next hides a
 * visited page it runs effect cleanups without removing the DOM; MapContainer's cleanup removes the
 * Leaflet map and never recreates it, so showing the page again (Back, or a link back to the venue)
 * crashed while re-adding layers. Here the map is removed only once its container has really left the
 * document, so a hidden page keeps a live map and its layers simply re-attach when shown again.
 */
function StableMapContainer({ center, zoom, className, children, ...options }: L.MapOptions & { center: L.LatLngExpression; zoom: number; className?: string; children: React.ReactNode }) {
  const [context, setContext] = useState<LeafletContextInterface | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  // Options are read once, on creation, as with MapContainer.
  const initial = useRef({ center, zoom, options });
  const attach = useCallback((node: HTMLDivElement | null) => {
    if (!node || mapRef.current) return;
    const { center: c, zoom: z, options: o } = initial.current;
    const map = L.map(node, o).setView(c, z);
    mapRef.current = map;
    setContext(createLeafletContext(map));
  }, []);
  useEffect(
    () => () => {
      const map = mapRef.current;
      // Hidden by Activity: the container is still in the document, so keep the map for when it's shown.
      if (map && !map.getContainer().isConnected) {
        map.remove();
        mapRef.current = null;
      }
    },
    [],
  );
  return (
    <div ref={attach} className={className}>
      {context && <LeafletContext value={context}>{children}</LeafletContext>}
    </div>
  );
}

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

function FitBounds({ points, bottomInset, topInset }: { points: [number, number][]; bottomInset: number; topInset: number }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  const latest = useRef({ points, bottomInset, topInset });
  useEffect(() => {
    latest.current = { points, bottomInset, topInset };
  });

  useEffect(() => {
    const fit = () => {
      const { points: pts, bottomInset: bottom, topInset: top } = latest.current;
      if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [24, top + 16], paddingBottomRight: [24, bottom + 24], maxZoom: 16 });
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

/** Centre the selected pin in the part of the map not covered by the controls or the sheet. */
function PanToActive({ marker, bottomInset, topInset }: { marker?: MapMarker; bottomInset: number; topInset: number }) {
  const map = useMap();
  const id = marker?.id;
  useEffect(() => {
    if (!marker) return;
    const point = map.project([marker.lat, marker.lng], map.getZoom()).add([0, (bottomInset - topInset) / 2]);
    map.panTo(map.unproject(point, map.getZoom()), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pan only when the selection changes
  }, [map, id]);
  return null;
}

export default function VenueMap({ venue, markers, activeId, onSelect, bottomInset = 0, topInset = 0 }: VenueMapProps) {
  const points = useMemo<[number, number][]>(() => [[venue.lat, venue.lng], ...markers.map((m) => [m.lat, m.lng] as [number, number])], [venue, markers]);
  const active = markers.find((m) => m.id === activeId);

  return (
    <StableMapContainer center={[venue.lat, venue.lng]} zoom={15} scrollWheelZoom={false} zoomControl={false} zoomSnap={0.25} className="h-full w-full" attributionControl>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
      <ZoomControl position="topright" />
      <FitBounds points={points} bottomInset={bottomInset} topInset={topInset} />
      <PanToActive marker={active} bottomInset={bottomInset} topInset={topInset} />
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
    </StableMapContainer>
  );
}
