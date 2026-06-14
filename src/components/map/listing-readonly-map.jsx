"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
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

/** Non-interactive map showing a single listing pin. Loaded client-side only. */
function ListingReadonlyMapContent({ lat, lng, listingType }) {
  const { resolvedTheme } = useTheme();
  const tileKey = resolvedTheme === "dark" ? "dark" : "light";
  const tiles = MAP_TILE_LAYERS[tileKey];

  return (
    <MapContainer
      key={`${lat}-${lng}-${tileKey}`}
      center={[lat, lng]}
      zoom={LOCATION_PICKER_ZOOM}
      className="h-72 w-full min-h-[18rem]"
      scrollWheelZoom={false}
    >
      <TileLayer url={tiles.url} attribution={tiles.attribution} />
      <MapSizeFix />
      <Marker position={[lat, lng]} icon={createListingMarkerIcon(listingType)} />
    </MapContainer>
  );
}

const ListingReadonlyMapClient = dynamic(
  () => Promise.resolve({ default: ListingReadonlyMapContent }),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 min-h-[18rem] items-center justify-center rounded-lg border bg-muted">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

/**
 * Non-interactive map showing a single listing pin.
 *
 * @param {Object} props
 * @param {number} props.lat
 * @param {number} props.lng
 * @param {string} props.listingType
 */
export function ListingReadonlyMap({ lat, lng, listingType }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <ListingReadonlyMapClient lat={lat} lng={lng} listingType={listingType} />
    </div>
  );
}
