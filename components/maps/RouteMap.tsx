"use client";

import React, { useEffect, useRef } from "react";
import type L from "leaflet";
import polyline from "@mapbox/polyline";
import { MapCoordinate } from "@/lib/maps/types";

export interface RouteMapProps {
  origin: MapCoordinate;
  destination: MapCoordinate;
  geometry?: string;
  originLabel?: string;
  destinationLabel?: string;
  className?: string;
}

// Create clean, modern SVG DivIcons that never break from asset path misconfigurations
function createPinIcon(leafletInstance: typeof L, type: "origin" | "destination"): L.DivIcon {
  const isOrigin = type === "origin";
  const bgFill = isOrigin ? "#0f766e" : "#e11d48"; // teal-700 vs rose-600
  const iconLabel = isOrigin ? "A" : "B";

  const html = `
    <div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
      cursor: pointer;
    ">
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        background-color: ${bgFill};
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        border: 2px solid #ffffff;
      ">
        <span style="
          transform: rotate(45deg);
          color: #ffffff;
          font-weight: 800;
          font-size: 13px;
          font-family: system-ui, -apple-system, sans-serif;
        ">${iconLabel}</span>
      </div>
      <div style="
        width: 8px;
        height: 4px;
        background: rgba(0,0,0,0.25);
        border-radius: 50%;
        margin-top: 2px;
        filter: blur(1px);
      "></div>
    </div>
  `;

  return leafletInstance.divIcon({
    html,
    className: "travelsensei-route-pin",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export default function RouteMap({
  origin,
  destination,
  geometry,
  originLabel = "Origin",
  destinationLabel = "Destination",
  className = "",
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    // Helper to safely and idempotently clean up Leaflet map and DOM container
    const cleanupMap = () => {
      // 1. Clean up existing Leaflet Map instance safely without double-remove
      if (mapInstanceRef.current) {
        const existingMap = mapInstanceRef.current;
        mapInstanceRef.current = null;
        try {
          existingMap.remove();
        } catch {
          // Safe and idempotent: ignore if already removed or errored
        }
      }

      // 2. Ensure container is reset and any residual Leaflet metadata or nodes are cleared
      const container = mapContainerRef.current;
      if (container) {
        const containerWithId = container as unknown as { _leaflet_id?: unknown };
        if (containerWithId._leaflet_id !== undefined) {
          try {
            delete containerWithId._leaflet_id;
          } catch {
            containerWithId._leaflet_id = undefined;
          }
        }
        container.innerHTML = "";
      }
    };

    // Dynamically import Leaflet and its stylesheet strictly on the client
    Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]).then(([leafletModule]) => {
      if (!isMounted || !mapContainerRef.current) return;

      const L = (leafletModule.default || leafletModule) as typeof import("leaflet");

      // Before creating a map, check whether the container already has a Leaflet instance and safely clean it up
      cleanupMap();

      if (!isMounted || !mapContainerRef.current) return;

      // Initialize Leaflet Map centered on origin
      const map = L.map(mapContainerRef.current, {
        center: [origin.latitude, origin.longitude],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: false, // Prevent accidental scrolling when browsing trip
      });
      mapInstanceRef.current = map;

      // Add official OpenStreetMap standard tile layer
      const osmLayer = L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }
      );
      osmLayer.addTo(map);

      // Prepare bounds tracking
      const bounds = L.latLngBounds([
        [origin.latitude, origin.longitude],
        [destination.latitude, destination.longitude],
      ]);

      // Decode and render route geometry polyline if available
      let routeCoords: [number, number][] = [];
      if (geometry && geometry.trim().length > 0) {
        try {
          // @mapbox/polyline.decode returns [ [latitude, longitude], ... ]
          routeCoords = polyline.decode(geometry) as [number, number][];
          if (routeCoords.length > 0) {
            const routePolyline = L.polyline(routeCoords, {
              color: "#0f766e", // primary teal-700
              weight: 5,
              opacity: 0.85,
              lineCap: "round",
              lineJoin: "round",
            });
            routePolyline.addTo(map);

            for (const pt of routeCoords) {
              bounds.extend(pt);
            }
          }
        } catch {
          // Fallback: continue without crashing if polyline decoding encounters malformed string
        }
      }

      // Origin Marker (A)
      const originMarker = L.marker([origin.latitude, origin.longitude], {
        icon: createPinIcon(L, "origin"),
        title: originLabel,
      }).addTo(map);
      originMarker.bindPopup(`<strong>Origin:</strong> ${originLabel}`);

      // Destination Marker (B)
      const destMarker = L.marker([destination.latitude, destination.longitude], {
        icon: createPinIcon(L, "destination"),
        title: destinationLabel,
      }).addTo(map);
      destMarker.bindPopup(`<strong>Destination:</strong> ${destinationLabel}`);

      // Fit map bounds to contain markers and full route polyline
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 16,
      });
    });

    // Cleanup on component unmount or effect re-run
    return () => {
      isMounted = false;
      cleanupMap();
    };
  }, [
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude,
    geometry,
    originLabel,
    destinationLabel,
  ]);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-surface-container-high/60 shadow-xs ${className}`}>
      <div
        id="route-leaflet-map"
        ref={mapContainerRef}
        className="w-full h-80 sm:h-96 z-0"
        style={{ minHeight: "320px" }}
      />
    </div>
  );
}
