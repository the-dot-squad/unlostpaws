"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hasSetCoordinates } from "@/lib/geo";

/** @typedef {'click' | 'drag' | 'geolocate' | 'external'} CoordinateSource */

/**
 * Tracks why coordinates last changed so the map can pick the right pan/zoom animation.
 *
 * @param {number} lat
 * @param {number} lng
 */
export function useCoordinateSyncSource(lat, lng) {
  const [syncSource, setSyncSource] = useState(null);
  const lastHandledRef = useRef({ lat, lng });

  const applyCoordinates = useCallback((nextLat, nextLng, source) => {
    lastHandledRef.current = { lat: nextLat, lng: nextLng };
    setSyncSource(source);
  }, []);

  // Prop updates that bypass applyCoordinates (e.g. EXIF GPS from photo upload).
  useEffect(() => {
    if (!hasSetCoordinates(lng, lat)) {
      return;
    }

    const last = lastHandledRef.current;
    if (last.lat === lat && last.lng === lng) {
      return;
    }

    lastHandledRef.current = { lat, lng };
    setSyncSource("external");
  }, [lat, lng]);

  return { syncSource, applyCoordinates };
}
