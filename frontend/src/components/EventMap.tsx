import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Link } from "react-router-dom";
import type { Event } from "../types/event";
import { formatEventWhen } from "../utils/dateUtils";

interface Props {
  center: [number, number];
  events: Event[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  zoom?: number;
  className?: string;
}

interface VenueGroup {
  key: string;
  name: string;
  position: [number, number];
  events: Event[];
}

/** Several events often share one venue, so markers are grouped per venue. */
function groupByVenue(events: Event[]): VenueGroup[] {
  const groups = new Map<string, VenueGroup>();
  for (const e of events) {
    const v = e.venue;
    if (v?.lat == null || v?.lng == null) continue;
    const key = v.id || `${v.lat},${v.lng}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, name: v.name, position: [v.lat, v.lng], events: [] };
      groups.set(key, g);
    }
    g.events.push(e);
  }
  return [...groups.values()];
}

function pinIcon(count: number, selected: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="map-pin ${selected ? "map-pin--selected" : ""}"><span>${count > 1 ? count : ""}</span></div>`,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -36],
  });
}

function FitToGroups({ groups, center }: { groups: VenueGroup[]; center: [number, number] }) {
  const map = useMap();
  const signature = groups.map((g) => g.key).join("|");
  useEffect(() => {
    if (groups.length === 0) map.setView(center, 12);
    else if (groups.length === 1) map.setView(groups[0].position, 14);
    else map.fitBounds(L.latLngBounds(groups.map((g) => g.position)), { padding: [40, 40], maxZoom: 14 });
    // Only refit when the set of venues changes, not on every selection.
  }, [signature, map]);
  return null;
}

export default function EventMap({ center, events, selectedId, onSelect, zoom = 12, className }: Props) {
  const groups = useMemo(() => groupByVenue(events), [events]);
  const markerRefs = useRef(new Map<string, L.Marker>());
  const selectedGroup = groups.find((g) => g.events.some((e) => e.id === selectedId));

  return (
    <div className={`event-map ${className ?? ""}`}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom className="event-map__inner">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <InvalidateOnResize />
        <FitToGroups groups={groups} center={center} />
        <FlyToSelected group={selectedGroup} markerRefs={markerRefs} />
        {groups.map((g) => (
          <Marker
            key={g.key}
            position={g.position}
            icon={pinIcon(g.events.length, g === selectedGroup)}
            zIndexOffset={g === selectedGroup ? 1000 : 0}
            ref={(m) => {
              if (m) markerRefs.current.set(g.key, m);
              else markerRefs.current.delete(g.key);
            }}
            eventHandlers={{ click: () => onSelect(g.events[0].id) }}
          >
            <Popup>
              <div className="map-popup">
                <strong>{g.name}</strong>
                <ul>
                  {g.events.slice(0, 5).map((e) => (
                    <li key={e.id}>
                      <Link to={`/events/${e.id}`}>{e.name}</Link>
                      <span>{formatEventWhen(e)}</span>
                    </li>
                  ))}
                </ul>
                {g.events.length > 5 && <em>+{g.events.length - 5} more at this venue</em>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {events.length > 0 && groups.length === 0 && (
        <div className="event-map__notice">None of these events have map coordinates.</div>
      )}
    </div>
  );
}

/** Leaflet measures its container once; re-measure when it's resized or un-hidden (mobile List/Map toggle). */
function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function FlyToSelected({
  group,
  markerRefs,
}: {
  group: VenueGroup | undefined;
  markerRefs: React.RefObject<Map<string, L.Marker>>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!group) return;
    map.flyTo(group.position, Math.max(map.getZoom(), 14), { duration: 0.6 });
    markerRefs.current.get(group.key)?.openPopup();
  }, [group, map, markerRefs]);
  return null;
}
