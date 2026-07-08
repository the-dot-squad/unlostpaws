/** Shared Leaflet tile layer config for light/dark themes. */
import { MAP_TILE_URLS } from "@/config/external-urls";

export const MAP_TILE_LAYERS = {
  light: {
    url: MAP_TILE_URLS.light,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  dark: {
    url: MAP_TILE_URLS.dark,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
};

export const DEFAULT_MAP_CENTER = [20, 0];
export const DEFAULT_MAP_ZOOM = 3;
export const LOCATION_PICKER_ZOOM = 15;
/** Target zoom on first click when the map is still zoomed far out. */
export const LOCATION_PICKER_MIN_COMFORT_ZOOM = 12;
export const USER_LOCATION_ZOOM = 13;

/** Minimum zoom level before "Search this area" is allowed (avoids huge bbox queries). */
export const MAP_MIN_SEARCH_ZOOM = 10;

/** Leaflet animation duration (seconds) for pan/fly transitions in the location picker. */
export const MAP_SYNC_DURATION = 0.6;
