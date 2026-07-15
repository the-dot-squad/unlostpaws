import L from "leaflet";

/** Marker colors aligned with alert type semantics. */
const MARKER_COLORS = {
  missing: "#dc2626",
  found: "#16a34a",
  sighting: "#2563eb",
  surrender: "#d97706",
};

/**
 * Create a Leaflet divIcon colored by listing type.
 * @param {string} type One of LISTING_TYPES
 * @returns {L.DivIcon}
 */
export function createListingMarkerIcon(type) {
  const color = MARKER_COLORS[type] || MARKER_COLORS.sighting;

  return L.divIcon({
    className: "",
    html: `<span class="listing-map-pin" style="background-color:${color}"><span class="listing-map-pin-inner"></span></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
}

/** Pin marker for the location picker. */
export function createPickerMarkerIcon() {
  return L.divIcon({
    className: "",
    html: `<span class="location-picker-marker"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

/** Blue dot for the user's current position on the browse map. */
export function createUserLocationIcon() {
  return L.divIcon({
    className: "",
    html: `<span class="user-location-marker"><span class="user-location-marker-pulse"></span></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}
