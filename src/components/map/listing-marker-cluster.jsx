"use client";

/**
 * react-leaflet wrapper around leaflet.markercluster.
 * Child Markers are added to the cluster group via the layer container context.
 */

import { createLayerComponent } from "@react-leaflet/core";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

function createMarkerCluster(props, context) {
  const { children: _children, ...options } = props;
  const instance = L.markerClusterGroup(options);
  return {
    instance,
    context: { ...context, layerContainer: instance },
  };
}

function updateMarkerCluster(instance, props, prevProps) {
  if (props.maxClusterRadius !== prevProps.maxClusterRadius) {
    // Radius is construction-only for markercluster — remount via key if needed.
  }
}

export const ListingMarkerCluster = createLayerComponent(
  createMarkerCluster,
  updateMarkerCluster
);
