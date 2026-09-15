import {
  Map as MapLibreMap,
  GeolocateControl,
  NavigationControl,
  Marker,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type MapMouseEvent,
} from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

import { assetMeta, SOUTHAMPTON, type Category, type InfrastructureAsset, type Issue } from "@/lib/civic";

export type BaseStyle = "streets" | "minimal" | "satellite-lite";

export const BASE_STYLES: Record<BaseStyle, { label: string; url: string }> = {
  minimal: { label: "Minimal", url: "https://tiles.openfreemap.org/styles/positron" },
  streets: { label: "Streets", url: "https://tiles.openfreemap.org/styles/bright" },
  "satellite-lite": { label: "Terrain", url: "https://tiles.openfreemap.org/styles/liberty" },
};

type Props = {
  issues: Issue[];
  categories: Category[];
  baseStyle: BaseStyle;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** When set, a draggable pin is shown and reported back on move. */
  pin?: { lat: number; lng: number } | null;
  onPinMove?: (lat: number, lng: number) => void;
  flyTo?: { lat: number; lng: number; zoom?: number; key: number } | null;
  interactivePins?: boolean;
  /** Infrastructure assets to show at close zoom levels. */
  assets?: InfrastructureAsset[];
  /** Fired (debounced by the map) whenever the viewport settles. */
  onViewportChange?: (view: {
    zoom: number;
    bounds: { west: number; south: number; east: number; north: number };
  }) => void;
};

const SRC = "civic-issues";
const ASSET_SRC = "civic-assets";
const ASSET_MIN_ZOOM = 15.5;

export default function MapCanvas({
  issues,
  categories,
  baseStyle,
  selectedId,
  onSelect,
  pin,
  onPinMove,
  flyTo,
  interactivePins = true,
  assets = [],
  onViewportChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const dataRef = useRef<FeatureCollection>({ type: "FeatureCollection", features: [] });
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Build GeoJSON from issues
  const emojiBySlug = new Map(categories.map((c) => [c.id, c.emoji]));
  dataRef.current = {
    type: "FeatureCollection",
    features: issues.map((issue) => ({
      type: "Feature" as const,
      id: issue.id,
      geometry: { type: "Point" as const, coordinates: [issue.longitude, issue.latitude] },
      properties: {
        id: issue.id,
        emoji: emojiBySlug.get(issue.category_id) ?? "⚠️",
        resolved: issue.status === "RESOLVED" ? 1 : 0,
        selected: issue.id === selectedId ? 1 : 0,
      },
    })),
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: BASE_STYLES[baseStyle].url,
      center: [SOUTHAMPTON.lng, SOUTHAMPTON.lat],
      zoom: SOUTHAMPTON.zoom,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(
      new GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserLocation: true,
      }),
      "bottom-right",
    );

    const addLayers = () => {
      if (map.getSource(SRC)) return;
      map.addSource(SRC, {
        type: "geojson",
        data: dataRef.current,
        cluster: true,
        clusterRadius: 52,
        clusterMaxZoom: 14,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SRC,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#0f4c5c",
          "circle-opacity": 0.92,
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 30, 30],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SRC,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 13,
          "text-font": ["Noto Sans Bold"],
        },
        paint: { "text-color": "#ffffff" },
      });

      map.addLayer({
        id: "pin-halo",
        type: "circle",
        source: SRC,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": ["case", ["==", ["get", "selected"], 1], 22, 17],
          "circle-color": "#ffffff",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": [
            "case",
            ["==", ["get", "selected"], 1],
            "#0f4c5c",
            ["==", ["get", "resolved"], 1],
            "#2f855a",
            "#c2410c",
          ],
        },
      });
      map.addLayer({
        id: "pin-emoji",
        type: "symbol",
        source: SRC,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "emoji"],
          "text-size": ["case", ["==", ["get", "selected"], 1], 20, 15],
          "text-allow-overlap": true,
        },
      });

      if (!interactivePins) return;

      map.on("click", "pin-halo", (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (f) onSelectRef.current(String(f.properties?.["id"]));
      });
      map.on("click", "pin-emoji", (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (f) onSelectRef.current(String(f.properties?.["id"]));
      });
      map.on("click", "clusters", (e: MapLayerMouseEvent) => {
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as Point).coordinates as [number, number];
        map.easeTo({ center: coords, zoom: Math.min(17, map.getZoom() + 2.2) });
      });
      for (const layer of ["pin-halo", "pin-emoji", "clusters"]) {
        map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
      }
    };

    map.on("load", addLayers);
    map.on("styledata", addLayers);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Data updates
  useEffect(() => {
    const map = mapRef.current;
    const src = map?.getSource(SRC) as GeoJSONSource | undefined;
    src?.setData(dataRef.current);
  }, [issues, selectedId, categories]);

  // Base style switching
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(BASE_STYLES[baseStyle].url);
  }, [baseStyle]);

  // Fly to
  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [flyTo.lng, flyTo.lat],
      zoom: flyTo.zoom ?? 16,
      essential: true,
    });
  }, [flyTo]);

  // Draggable report pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!pin) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:30px;height:30px;border-radius:999px;background:#0f4c5c;border:4px solid #fff;box-shadow:0 6px 16px rgba(15,32,45,.35)";
      markerRef.current = new Marker({ element: el, draggable: true })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current?.getLngLat();
        if (pos) onPinMove?.(pos.lat, pos.lng);
      });
      map.on("click", (e: MapMouseEvent) => {
        markerRef.current?.setLngLat(e.lngLat);
        onPinMove?.(e.lngLat.lat, e.lngLat.lng);
      });
    } else {
      markerRef.current.setLngLat([pin.lng, pin.lat]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.lat, pin?.lng, !!pin]);

  return <div ref={containerRef} className="h-full w-full" />;
}
