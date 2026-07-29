"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { hasSetCoordinates } from "@/lib/geo";
import { createPickerMarkerIcon } from "@/components/map/marker-icons";
import {
  LOCATION_PICKER_ZOOM,
  MAP_SYNC_DURATION,
} from "@/components/map/config";

/** @typedef {'click' | 'drag' | 'geolocate' | 'external'} CoordinateSource */

/** @typedef {{ lat: number; lng: number; source: CoordinateSource }} CoordinateChangeMeta */

/**
 * Resolves the target zoom for a coordinate update based on how it was initiated.
 *
 * Click: pan-only, keeping the current zoom level.
 *
 * @param {number} currentZoom
 * @param {CoordinateSource} source
 * @returns {number | null} Target zoom, or `null` when the map should not move.
 */
function resolveSyncZoom(currentZoom, source) {
  switch (source) {
    case "drag":
      return null;

    case "geolocate":
    case "external":
      return LOCATION_PICKER_ZOOM;

    case "click":
      return currentZoom;

    default:
      return LOCATION_PICKER_ZOOM;
  }
}

/**
 * Applies the appropriate pan/fly animation after coordinates change.
 *
 * @param {import("leaflet").Map} map
 * @param {number} lat
 * @param {number} lng
 * @param {CoordinateSource} source
 */
function syncMapViewToCoordinates(map, lat, lng, source) {
  const currentZoom = map.getZoom();
  const targetZoom = resolveSyncZoom(currentZoom, source);

  if (targetZoom === null) {
    return;
  }

  if (targetZoom === currentZoom) {
    map.panTo([lat, lng], { animate: true, duration: MAP_SYNC_DURATION });
    return;
  }

  map.flyTo([lat, lng], targetZoom, { duration: MAP_SYNC_DURATION });
}

/** Keeps the Leaflet view aligned with coordinate changes. */
function MapViewSync({ lat, lng, syncSource }) {
  const map = useMap();
  /** Skip sync once when the form loaded with coordinates already set (edit mode). */
  const skipInitialSync = useRef(hasSetCoordinates(lng, lat));

  useEffect(() => {
    if (!hasSetCoordinates(lng, lat)) {
      return;
    }

    if (skipInitialSync.current) {
      skipInitialSync.current = false;
      return;
    }

    syncMapViewToCoordinates(map, lat, lng, syncSource ?? "external");
  }, [map, lat, lng, syncSource]);

  return null;
}

/** Places a pin when the user clicks the map. */
function MapClickHandler({ onPick }) {
  const map = useMap();

  useMapEvents({
    click(e) {
      const currentZoom = map.getZoom();
      if (currentZoom < 7) {
        map.flyTo(e.latlng, 7, { duration: MAP_SYNC_DURATION });
      } else {
        onPick(e.latlng.lat, e.latlng.lng, { source: "click" });
      }
    },
  });
  return null;
}

/**
 * Leaflet map for picking a location — click or drag to set a pin.
 * Loaded client-side only via dynamic import from `location-picker.jsx`.
 *
 * @param {Object} props
 * @param {number} props.lat
 * @param {number} props.lng
 * @param {[number, number]} props.initialCenter
 * @param {number} props.initialZoom
 * @param {{ url: string; attribution: string }} props.tiles
 * @param {CoordinateSource | null} props.syncSource
 * @param {(lat: number, lng: number, meta: CoordinateChangeMeta) => void} props.onCoordinatesChange
 */
export function LocationPickerLeaflet({
  lat,
  lng,
  initialCenter,
  initialZoom,
  tiles,
  syncSource,
  onCoordinatesChange,
}) {
  const hasPin = hasSetCoordinates(lng, lat);

  return (
    <div className="overflow-hidden rounded-lg border">
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        className="h-72 w-full"
        scrollWheelZoom
      >
        <TileLayer className="map-tiles" url={tiles.url} attribution={tiles.attribution} />
        <MapViewSync lat={lat} lng={lng} syncSource={syncSource} />
        <MapClickHandler onPick={onCoordinatesChange} />

        {hasPin && (
          <Marker
            position={[lat, lng]}
            icon={createPickerMarkerIcon()}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const { lat: nextLat, lng: nextLng } = e.target.getLatLng();
                onCoordinatesChange(nextLat, nextLng, { source: "drag" });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
