"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import type { Venue } from "@/lib/venues";

// Leaflet's default marker icon paths break under Next.js bundling.
// We replace it with a simple branded dot instead of debugging asset paths.
const venueIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #3b82f6;
    border: 2px solid white;
    box-shadow: 0 0 4px rgba(0,0,0,0.5);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
});

type VenuesMapProps = {
  venues: Venue[];
};

export default function VenuesMap({ venues }: VenuesMapProps) {
  // Only venues with real coordinates can be plotted.
  const plottable = venues.filter(
    (v) => (v as any).latitude != null && (v as any).longitude != null
  );

  // Center on NYC by default.
  const center: [number, number] = [40.7128, -74.006];

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: "500px" }}>
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {plottable.map((venue) => (
          <Marker
            key={venue.id}
            position={[(venue as any).latitude, (venue as any).longitude]}
            icon={venueIcon}
          >
            <Popup>
              <div style={{ minWidth: "160px" }}>
                <p style={{ fontWeight: 700, marginBottom: "4px" }}>{venue.name}</p>
                <p style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
                  {venue.neighborhood}
                  {venue.address ? ` · ${venue.address}` : ""}
                </p>
                <Link
                  href={`/venue/${venue.id}`}
                  style={{ fontSize: "13px", color: "#2563eb", fontWeight: 600 }}
                >
                  View details →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}