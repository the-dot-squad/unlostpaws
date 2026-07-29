"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { ListingMarkerCluster } from "@/components/map/listing-marker-cluster";
import {
  boundsCacheKey,
  fetchMapListings,
  mergeListingsById,
} from "@/components/map/map-listings-fetch";
import {
  MAP_TILE_LAYERS,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  USER_LOCATION_ZOOM,
  MAP_MIN_SEARCH_ZOOM,
  MAP_VIEWPORT_FETCH_DEBOUNCE_MS,
  MAP_CLUSTER_DISABLE_AT_ZOOM,
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

/**
 * Debounced auto-fetch on pan/zoom when zoom is high enough.
 * Skips when quantized bounds+filters match the last successful fetch.
 */
function ViewportAutoFetch({
  type,
  petType,
  enabled,
  onResults,
  lastKeyRef,
  abortRef,
}) {
  const map = useMap();
  const timerRef = useRef(null);

  const runFetch = useCallback(() => {
    if (!enabled) return;

    const bounds = map.getBounds();
    const key = boundsCacheKey(bounds, type, petType);
    if (key === lastKeyRef.current) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    onResults({ loading: true, mode: "replace" });

    fetchMapListings({
      bounds,
      type,
      petType,
      signal: controller.signal,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        lastKeyRef.current = key;
        onResults({
          loading: false,
          searched: true,
          mode: "replace",
          listings: data.listings || [],
          hasMore: Boolean(data.hasMore),
          nextCursor: data.nextCursor || null,
          limit: data.limit,
        });
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        onResults({
          loading: false,
          searched: true,
          mode: "replace",
          listings: [],
          hasMore: false,
          nextCursor: null,
        });
      });
  }, [abortRef, enabled, lastKeyRef, map, onResults, petType, type]);

  useMapEvents({
    moveend: () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(runFetch, MAP_VIEWPORT_FETCH_DEBOUNCE_MS);
    },
    zoomend: () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(runFetch, MAP_VIEWPORT_FETCH_DEBOUNCE_MS);
    },
  });

  // Refetch when filters change while already zoomed in.
  useEffect(() => {
    lastKeyRef.current = null;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(runFetch, MAP_VIEWPORT_FETCH_DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [type, petType, runFetch, lastKeyRef]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return null;
}

/** Explicit refresh — bypasses bounds-unchanged short-circuit and Redis (`fresh=1`). */
function SearchAreaButton({
  mapActionsRef,
  type,
  petType,
  onResults,
  canSearch,
  lastKeyRef,
  abortRef,
  loading,
}) {
  const t = useTranslations("map");

  const handleSearch = useCallback(async () => {
    const actions = mapActionsRef.current;
    if (!actions || !canSearch) return;

    const bounds = actions.getBounds();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    onResults({ loading: true, mode: "replace" });

    try {
      const data = await fetchMapListings({
        bounds,
        type,
        petType,
        fresh: true,
        signal: controller.signal,
      });
      lastKeyRef.current = boundsCacheKey(bounds, type, petType);
      onResults({
        loading: false,
        searched: true,
        mode: "replace",
        listings: data.listings || [],
        hasMore: Boolean(data.hasMore),
        nextCursor: data.nextCursor || null,
        limit: data.limit,
      });
    } catch (err) {
      if (err.name !== "AbortError") {
        onResults({
          loading: false,
          searched: true,
          mode: "replace",
          listings: [],
          hasMore: false,
          nextCursor: null,
        });
      }
    }
  }, [abortRef, canSearch, lastKeyRef, mapActionsRef, onResults, petType, type]);

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

/** Full-screen browse map with auto viewport fetch, clusters, and load-more. */
export function ListingsMap({ locale, type, petType }) {
  const { resolvedTheme } = useTheme();
  const t = useTranslations("map");
  const tCommon = useTranslations("common");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [pageLimit, setPageLimit] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [mapZoom, setMapZoom] = useState(DEFAULT_MAP_ZOOM);
  const mapActionsRef = useRef(null);
  const lastKeyRef = useRef(null);
  const abortRef = useRef(null);

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

  const handleSearchResults = useCallback(
    ({
      loading: isLoading,
      searched,
      listings: next,
      hasMore: more,
      nextCursor: cursor,
      limit,
      mode,
    }) => {
      if (isLoading) {
        if (mode === "append") {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
        return;
      }

      setLoading(false);
      setLoadingMore(false);

      if (searched) {
        setHasSearched(true);
        setListings((prev) =>
          mode === "append" ? mergeListingsById(prev, next || []) : next || []
        );
        setHasMore(Boolean(more));
        setNextCursor(cursor || null);
        if (limit != null) setPageLimit(limit);
      }
    },
    []
  );

  const handleLoadMore = useCallback(async () => {
    const actions = mapActionsRef.current;
    if (!actions || !canSearch || !hasMore || !nextCursor || loadingMore) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    handleSearchResults({ loading: true, mode: "append" });

    try {
      const data = await fetchMapListings({
        bounds: actions.getBounds(),
        type,
        petType,
        cursor: nextCursor,
        signal: controller.signal,
      });
      handleSearchResults({
        loading: false,
        searched: true,
        mode: "append",
        listings: data.listings || [],
        hasMore: Boolean(data.hasMore),
        nextCursor: data.nextCursor || null,
        limit: data.limit,
      });
    } catch (err) {
      if (err.name !== "AbortError") {
        handleSearchResults({
          loading: false,
          searched: true,
          mode: "append",
          listings: [],
          hasMore: false,
          nextCursor: null,
        });
      }
    }
  }, [canSearch, handleSearchResults, hasMore, loadingMore, nextCursor, petType, type]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <div className="relative h-full min-h-0">
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer className="map-tiles" url={tiles.url} attribution={tiles.attribution} />
        <MapActionsBridge onBridge={handleMapBridge} />
        <MapZoomWatcher onZoomChange={handleZoomChange} />
        <InitialGeolocation onLocated={handleLocated} onDenied={handleDenied} />
        <ViewportAutoFetch
          type={type}
          petType={petType}
          enabled={canSearch}
          onResults={handleSearchResults}
          lastKeyRef={lastKeyRef}
          abortRef={abortRef}
        />

        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={createUserLocationIcon()}
            zIndexOffset={1000}
          />
        )}

        <ListingMarkerCluster
          showCoverageOnHover={false}
          maxClusterRadius={60}
          disableClusteringAtZoom={MAP_CLUSTER_DISABLE_AT_ZOOM}
          spiderfyOnMaxZoom
        >
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
        </ListingMarkerCluster>
      </MapContainer>

      <SearchAreaButton
        mapActionsRef={mapActionsRef}
        type={type}
        petType={petType}
        onResults={handleSearchResults}
        canSearch={canSearch}
        lastKeyRef={lastKeyRef}
        abortRef={abortRef}
        loading={loading}
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

      {(hasMore || (hasSearched && listings.length > 0 && pageLimit)) && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center px-4">
          <div className="flex max-w-md flex-col items-center gap-2 rounded-lg border bg-background/90 px-3 py-2 text-center text-xs text-muted-foreground shadow-sm">
            {hasMore ? (
              <>
                <p>{t("hasMore", { count: listings.length })}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="pointer-events-auto"
                  onClick={handleLoadMore}
                  disabled={loadingMore || loading}
                >
                  {loadingMore ? (
                    <Loader2 className="me-2 size-3.5 animate-spin" />
                  ) : null}
                  {t("loadMore")}
                </Button>
              </>
            ) : null}
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
