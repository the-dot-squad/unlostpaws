"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { createListingMarkerIcon } from "@/components/map/marker-icons";
import { MAP_TILE_LAYERS, LOCATION_PICKER_ZOOM } from "@/components/map/config";
import "leaflet/dist/leaflet.css";

/** Leaflet needs invalidateSize after dynamic mount inside layout containers. */
function MapSizeFix() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

/**
 * Non-interactive map showing a single listing pin. Loaded client-side only (no SSR).
 *
 * @param {Object} props
 * @param {number} props.lat
 * @param {number} props.lng
 * @param {string} props.listingType
 */
export function ListingReadonlyMap({ lat, lng, listingType }) {
  const { resolvedTheme } = useTheme();
  const tileKey = resolvedTheme === "dark" ? "dark" : "light";
  const tiles = MAP_TILE_LAYERS[tileKey];

  return (
    <div className="overflow-hidden rounded-lg border">
      <MapContainer
        key={`${lat}-${lng}-${tileKey}`}
        center={[lat, lng]}
        zoom={LOCATION_PICKER_ZOOM}
        className="h-72 w-full min-h-[18rem]"
        scrollWheelZoom={false}
      >
        <TileLayer className="map-tiles" url={tiles.url} attribution={tiles.attribution} />
        <MapSizeFix />
        <Marker position={[lat, lng]} icon={createListingMarkerIcon(listingType)} />
      </MapContainer>
    </div>
  );
}
