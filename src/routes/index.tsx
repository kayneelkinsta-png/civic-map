import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Layers } from "lucide-react";

import { AccountButton } from "@/components/AccountButton";
import { BottomNav } from "@/components/BottomNav";
import { CategoryFilters } from "@/components/CategoryFilters";
import { AssetPreviewCard } from "@/components/AssetPreviewCard";
import { IssuePreviewCard } from "@/components/IssuePreviewCard";
import { Logo } from "@/components/Logo";
import { SearchBox } from "@/components/SearchBox";
import { CivicMap } from "@/components/map/CivicMap";
import { BASE_STYLES, type BaseStyle } from "@/components/map/MapCanvas";
import { Button } from "@/components/ui/button";
import { fetchAssetsInBounds, fetchCategories, fetchIssues } from "@/lib/civic";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CivicLense — Report and track local issues in Southampton" },
      {
        name: "description",
        content:
          "See it. Report it. Confirm it. Track it. CivicLense is an independent community map of potholes, street lighting, fly-tipping and other local problems.",
      },
      { property: "og:title", content: "CivicLense — the community map of local issues" },
      {
        property: "og:description",
        content:
          "Report local infrastructure and environment problems, and confirm the ones that are still a problem near you.",
      },
    ],
  }),
  component: MapHome,
});

function MapHome() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [filters, setFilters] = useState<string[]>([]);
  const [baseStyle, setBaseStyle] = useState<BaseStyle>("minimal");
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom?: number; key: number } | null>(
    null,
  );

  const [view, setView] = useState<{
    zoom: number;
    bounds: { west: number; south: number; east: number; north: number };
  } | null>(null);

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: issues = [] } = useQuery({ queryKey: ["issues"], queryFn: fetchIssues });

  // Infrastructure assets are only loaded for the current viewport, and only when
  // zoomed in far enough for individual assets to be meaningful.
  const assetsEnabled = (view?.zoom ?? 0) >= 15.5;
  const boundsKey = view
    ? [view.bounds.west, view.bounds.south, view.bounds.east, view.bounds.north]
        .map((n) => n.toFixed(3))
        .join(",")
    : "";
  const { data: assets = [] } = useQuery({
    queryKey: ["assets", boundsKey],
    enabled: assetsEnabled,
    staleTime: 60_000,
    queryFn: () => fetchAssetsInBounds(view!.bounds),
  });

  const visible = useMemo(
    () => (filters.length ? issues.filter((i) => filters.includes(i.category_id)) : issues),
    [issues, filters],
  );
  const selected = visible.find((i) => i.id === selectedId) ?? null;
  const selectedAsset = assets.find((a) => a.id === selectedAssetId) ?? null;
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const styleKeys = Object.keys(BASE_STYLES) as BaseStyle[];

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden">
      <CivicMap
        issues={visible}
        categories={categories}
        baseStyle={baseStyle}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id);
          if (id) setSelectedAssetId(null);
        }}
        onSelectAsset={(id) => {
          setSelectedAssetId(id);
          setSelectedId(null);
        }}
        flyTo={flyTo}
        assets={assetsEnabled ? assets : []}
        onViewportChange={setView}
      />

      {/* Top chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 md:p-4">
        <div className="mx-auto flex max-w-6xl items-start gap-2 md:gap-3">
          <div className="civic-float pointer-events-auto flex h-12 items-center px-3">
            <Logo compact />
            <span className="ml-2 hidden font-display text-[17px] font-semibold tracking-tight lg:inline">
              Civic<span className="text-primary">Lense</span>
            </span>
          </div>
          <div className="pointer-events-auto min-w-0 flex-1 md:mx-auto md:max-w-md">
            <SearchBox
              onResult={(r) => {
                setFlyTo({ lat: r.lat, lng: r.lng, zoom: 15.5, key: Date.now() });
              }}
            />
          </div>
          <div className="pointer-events-auto hidden items-center gap-2 md:flex">
            <Button asChild className="h-12">
              <Link to="/report">Report an issue</Link>
            </Button>
            <div className="civic-float flex h-12 items-center px-2">
              <AccountButton />
            </div>
          </div>
        </div>
      </div>

      {/* Layer switcher */}
      <div className="absolute right-3 top-[68px] z-20 md:right-4 md:top-[84px]">
        <div className="civic-float flex flex-col overflow-hidden">
          <span className="flex h-9 items-center gap-1.5 border-b border-border px-2.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Layers className="h-3.5 w-3.5" /> Layers
          </span>
          {styleKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setBaseStyle(key)}
              className={
                "px-3 py-2 text-left text-xs font-medium transition-colors " +
                (baseStyle === key
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary")
              }
            >
              {BASE_STYLES[key].label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom chrome */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 space-y-3 p-3 pb-20 md:p-4 md:pb-6">
        <div className="mx-auto max-w-6xl">
          {selectedAsset && (
            <div className="pointer-events-auto mb-3 max-w-md">
              <AssetPreviewCard asset={selectedAsset} onClose={() => setSelectedAssetId(null)} />
            </div>
          )}
          {selected && (
            <div className="pointer-events-auto mb-3 max-w-md">
              <IssuePreviewCard
                issue={selected}
                category={categoryById.get(selected.category_id)}
                onClose={() => setSelectedId(null)}
              />
            </div>
          )}
          <div className="pointer-events-auto">
            <CategoryFilters
              categories={categories}
              selected={filters}
              onToggle={(id) =>
                setFilters((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                )
              }
              onClear={() => setFilters([])}
            />
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
