"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAP_LISTINGS_LIMIT } from "@/config/constants/platform";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Crosshair, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reportRecoverableClientError } from "@/lib/observability/client-error";
import { getBrowserCoordinates } from "@/lib/geo";
import { ListingMapPopup } from "@/components/map/listing-map-popup";
import {
  createListingMarkerIcon,
  createUserLocationIcon,
} from "@/components/map/marker-icons";
import {
  MAP_TILE_LAYERS,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  USER_LOCATION_ZOOM,
  MAP_MIN_SEARCH_ZOOM,
} from "@/components/map/config";
import "leaflet/dist/leaflet.css";

/**
 * Registers map helpers for overlays outside MapContainer.
 * useMap() must only run inside MapContainer descendants.
 */
function MapActionsBridge({ onBridge }) {
  const map = useMap();

  useEffect(() => {
    onBridge({
      getZoom: () => map.getZoom(),
      getBounds: () => map.getBounds(),
      async centerOnUser() {
        const coords = await getBrowserCoordinates();
        map.flyTo([coords.lat, coords.lng], USER_LOCATION_ZOOM);
        return coords;
      },
    });
    return () => onBridge(null);
  }, [map, onBridge]);

  return null;
}

/** Syncs live zoom level to parent so search can enable/disable reactively. */
function MapZoomWatcher({ onZoomChange }) {
  const map = useMap();

  const reportZoom = useCallback(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  useMapEvents({
    zoom: reportZoom,
    zoomend: reportZoom,
  });

  useEffect(() => {
    reportZoom();
  }, [reportZoom]);

  return null;
}

/** Centers map on user location once on mount. */
function InitialGeolocation({ onLocated, onDenied }) {
  const map = useMap();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    getBrowserCoordinates()
      .then((coords) => {
        map.flyTo([coords.lat, coords.lng], USER_LOCATION_ZOOM);
        onLocated(coords);
      })
      .catch(() => onDenied());
  }, [map, onLocated, onDenied]);

  return null;
}

/** Bottom-center control — enabled only when zoomed in enough. */
function SearchAreaButton({ mapActionsRef, type, petType, onResults, canSearch }) {
  const t = useTranslations("map");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const handleSearch = useCallback(async () => {
    const actions = mapActionsRef.current;
    if (!actions || !canSearch) return;

    const bounds = actions.getBounds();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    onResults({ loading: true });

    const params = new URLSearchParams({
      swLng: String(bounds.getWest()),
      swLat: String(bounds.getSouth()),
      neLng: String(bounds.getEast()),
      neLat: String(bounds.getNorth()),
    });
    if (type) params.set("type", type);
    if (petType) params.set("petType", petType);

    try {
      const res = await fetch(`/api/listings/map?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      onResults({
        loading: false,
        searched: true,
        listings: data.listings || [],
        truncated: Boolean(data.truncated),
      });
    } catch (err) {
      if (err.name !== "AbortError") {
        onResults({
          loading: false,
          searched: true,
          listings: [],
          truncated: false,
        });
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [mapActionsRef, type, petType, onResults, canSearch]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const disabled = loading || !canSearch;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[1000] flex flex-col items-center gap-1.5 px-4">
      <Button
        type="button"
        size="sm"
        className="pointer-events-auto shadow-lg"
        onClick={handleSearch}
        disabled={disabled}
        aria-disabled={disabled}
        title={!canSearch ? t("zoomInToSearch") : undefined}
      >
        {loading ? (
          <Loader2 className="me-2 size-4 animate-spin" />
        ) : (
          <Search className="me-2 size-4" />
        )}
        {t("searchThisArea")}
      </Button>
      {!canSearch && !loading && (
        <p className="max-w-xs rounded-full bg-background/95 px-3 py-1 text-center text-xs text-muted-foreground shadow-sm">
          {t("zoomInToSearch")}
        </p>
      )}
    </div>
  );
}

/** Floating locate button — bottom right. */
function LocateMeButton({ mapActionsRef, onLocated, onDenied }) {
  const t = useTranslations("map");
  const [loading, setLoading] = useState(false);

  async function handleLocate() {
    const actions = mapActionsRef.current;
    if (!actions) return;

    setLoading(true);
    try {
      const coords = await actions.centerOnUser();
      onLocated(coords);
      toast.success(t("locationFound"));
    } catch (err) {
      reportRecoverableClientError(err instanceof Error ? err : new Error(String(err)));
      onDenied();
      toast.error(t("locationDenied"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pointer-events-none absolute bottom-4 end-4 z-[1000]">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="pointer-events-auto shadow-lg"
        onClick={handleLocate}
        disabled={loading}
        aria-label={t("locateMe")}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Crosshair className="size-4" />
        )}
        <span className="ms-2 hidden sm:inline">{t("locateMe")}</span>
      </Button>
    </div>
  );
}

/** Full-screen browse map with search and geolocation. */
export function ListingsMap({ locale, type, petType }) {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("map");
  const tCommon = useTranslations("common");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);
  const mapActionsRef = useRef(null);

  const canSearch = mapZoom >= MAP_MIN_SEARCH_ZOOM;

  const tileKey = resolvedTheme === "dark" ? "dark" : "light";
  const tiles = MAP_TILE_LAYERS[tileKey];

  const handleMapBridge = useCallback((bridge) => {
    mapActionsRef.current = bridge;
  }, []);

  const handleZoomChange = useCallback((zoom) => {
    setMapZoom(zoom);
  }, []);

  const handleLocated = useCallback((coords) => {
    setUserLocation(coords);
    setLocationDenied(false);
  }, []);

  const handleDenied = useCallback(() => {
    setLocationDenied(true);
  }, []);

  const handleSearchResults = useCallback(({ loading: isLoading, searched, listings: next, truncated: isTruncated }) => {
    if (isLoading) {
      setLoading(true);
      return;
    }
    setLoading(false);
    if (searched) {
      setHasSearched(true);
      setListings(next);
      setTruncated(isTruncated);
    }
  }, []);

  return (
    <div className="relative h-full min-h-0">
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer url={tiles.url} attribution={tiles.attribution} />
        <MapActionsBridge onBridge={handleMapBridge} />
        <MapZoomWatcher onZoomChange={handleZoomChange} />
        <InitialGeolocation onLocated={handleLocated} onDenied={handleDenied} />

        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={createUserLocationIcon()}
            zIndexOffset={1000}
          />
        )}

        {listings.map((listing) => (
          <Marker
            key={listing.id}
            position={[listing.lat, listing.lng]}
            icon={createListingMarkerIcon(listing.type)}
          >
            <Popup>
              <ListingMapPopup listing={listing} locale={locale} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <SearchAreaButton
        mapActionsRef={mapActionsRef}
        type={type}
        petType={petType}
        onResults={handleSearchResults}
        canSearch={canSearch}
      />

      <LocateMeButton
        mapActionsRef={mapActionsRef}
        onLocated={handleLocated}
        onDenied={handleDenied}
      />

      {loading && (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 text-sm shadow-sm">
            <Loader2 className="size-4 animate-spin" />
            {t("loading")}
          </div>
        </div>
      )}

      {hasSearched && !loading && listings.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
          <div className="rounded-full border bg-background/95 px-3 py-1.5 text-sm text-muted-foreground shadow-sm">
            {t("noResults")}
          </div>
        </div>
      )}

      {truncated && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center px-4">
          <div className="rounded-lg border bg-background/90 px-3 py-2 text-center text-xs text-muted-foreground shadow-sm">
            {t("truncated", { count: MAP_LISTINGS_LIMIT })}
          </div>
        </div>
      )}

      {locationDenied && (
        <div className="absolute inset-x-0 bottom-16 flex justify-center px-4">
          <div className="rounded-lg border border-destructive/30 bg-background/95 px-3 py-2 text-center text-xs text-muted-foreground shadow-sm">
            {t("locationDenied")}
            <button
              type="button"
              className="ms-2 text-primary hover:underline"
              onClick={() => setLocationDenied(false)}
            >
              {tCommon("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
