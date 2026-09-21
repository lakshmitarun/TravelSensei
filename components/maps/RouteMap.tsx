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
    let activeMap: L.Map | null = null;

    // Dynamically import Leaflet and its stylesheet strictly on the client
    Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]).then(([leafletModule]) => {
      if (!isMounted || !mapContainerRef.current) return;

      const L = (leafletModule.default || leafletModule) as typeof import("leaflet");

      // Clean up previous map instance if one exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initialize Leaflet Map centered on origin
      const map = L.map(mapContainerRef.current, {
        center: [origin.latitude, origin.longitude],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: false, // Prevent accidental scrolling when browsing trip
      });
      activeMap = map;
      mapInstanceRef.current = map;

      // Add English-oriented CARTO basemap tiles (replaces tile.openstreetmap.org for English labels)
      const cartoLayer = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 20,
          subdomains: "abcd",
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
        }
      );
      cartoLayer.addTo(map);

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

    // Cleanup on component unmount
    return () => {
      isMounted = false;
      if (activeMap) {
        activeMap.remove();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [origin, destination, geometry, originLabel, destinationLabel]);

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
