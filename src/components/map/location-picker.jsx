"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Crosshair, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { reportRecoverableClientError } from "@/lib/observability/client-error";
import { Button } from "@/components/ui/button";
import { getBrowserCoordinates, hasSetCoordinates } from "@/lib/geo";
import {
  MAP_TILE_LAYERS,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  LOCATION_PICKER_ZOOM,
} from "@/components/map/config";
import { useCoordinateSyncSource } from "@/components/map/use-coordinate-sync-source";
import "leaflet/dist/leaflet.css";

const LocationPickerLeaflet = dynamic(
  () => import("./location-picker-leaflet").then((m) => m.LocationPickerLeaflet),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-72 items-center justify-center rounded-lg border bg-muted">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

/**
 * @typedef {Object} LocationPickerLabels
 * @property {string} hint
 * @property {string} geocoding
 * @property {string} useMyLocation
 * @property {string} locationDenied
 */

/**
 * Interactive map for picking alert location.
 *
 * @param {Object} props
 * @param {number} props.lat
 * @param {number} props.lng
 * @param {LocationPickerLabels} props.labels
 * @param {(lat: number, lng: number) => void} props.onCoordinatesChange
 * @param {(data: object) => void} [props.onReverseGeocode]
 * @param {"auto" | "light"} [props.tileTheme="auto"] Force light tiles (e.g. admin outside ThemeProvider).
 */
export function LocationPicker({
  lat,
  lng,
  labels,
  onCoordinatesChange,
  onReverseGeocode,
  tileTheme = "auto",
}) {
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const debounceRef = useRef(null);
  const { resolvedTheme } = useTheme();
  const { syncSource, applyCoordinates } = useCoordinateSyncSource(lat, lng);

  // Fixed on first render — view updates after that are driven by MapViewSync, not props.
  const [initialView] = useState(() => ({
    center: hasSetCoordinates(lng, lat) ? [lat, lng] : DEFAULT_MAP_CENTER,
    zoom: hasSetCoordinates(lng, lat) ? LOCATION_PICKER_ZOOM : DEFAULT_MAP_ZOOM,
  }));

  const tileKey =
    tileTheme === "light" ? "light" : resolvedTheme === "dark" ? "dark" : "light";
  const tiles = MAP_TILE_LAYERS[tileKey];

  const reverseGeocode = useCallback(
    async (nextLat, nextLng) => {
      if (!onReverseGeocode) return;
      setGeocoding(true);
      try {
        const res = await fetch(`/api/geocode/reverse?lat=${nextLat}&lng=${nextLng}`);
        if (res.ok) {
          onReverseGeocode(await res.json());
        }
      } catch {
        // Address pre-fill is best-effort
      } finally {
        setGeocoding(false);
      }
    },
    [onReverseGeocode]
  );

  const scheduleReverseGeocode = useCallback(
    (nextLat, nextLng) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => reverseGeocode(nextLat, nextLng), 600);
    },
    [reverseGeocode]
  );

  const handleCoordinatesChange = useCallback(
    (nextLat, nextLng, { source }) => {
      applyCoordinates(nextLat, nextLng, source);
      onCoordinatesChange(nextLat, nextLng);
      scheduleReverseGeocode(nextLat, nextLng);
    },
    [applyCoordinates, onCoordinatesChange, scheduleReverseGeocode]
  );

  async function handleGeolocate() {
    setLocating(true);
    try {
      const coords = await getBrowserCoordinates();
      handleCoordinatesChange(coords.lat, coords.lng, { source: "geolocate" });
    } catch (err) {
      reportRecoverableClientError(err instanceof Error ? err : new Error(String(err)));
      toast.error(labels.locationDenied);
    } finally {
      setLocating(false);
    }
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{labels.hint}</p>
        <div className="flex items-center gap-2">
          {geocoding && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              {labels.geocoding}
            </span>
          )}
          <Button type="button" variant="outline" size="sm" onClick={handleGeolocate} disabled={locating}>
            {locating ? (
              <Loader2 className="me-2 size-4 animate-spin" />
            ) : (
              <Crosshair className="me-2 size-4" />
            )}
            {labels.useMyLocation}
          </Button>
        </div>
      </div>

      <LocationPickerLeaflet
        lat={lat}
        lng={lng}
        initialCenter={initialView.center}
        initialZoom={initialView.zoom}
        tiles={tiles}
        syncSource={syncSource}
        onCoordinatesChange={handleCoordinatesChange}
      />
    </div>
  );
}

/**
 * Location picker with next-intl labels — for locale-scoped listing forms.
 *
 * @param {Omit<Parameters<typeof LocationPicker>[0], "labels"> & { labels?: Partial<LocationPickerLabels> }} props
 */
export function LocationPickerMap({ labels: labelOverrides, ...props }) {
  const t = useTranslations("listings");

  const labels = {
    hint: labelOverrides?.hint ?? t("mapPickerHint"),
    geocoding: labelOverrides?.geocoding ?? t("geocoding"),
    useMyLocation: labelOverrides?.useMyLocation ?? t("useMyLocation"),
    locationDenied: labelOverrides?.locationDenied ?? t("locationDenied"),
  };

  return <LocationPicker labels={labels} {...props} />;
}
