import { supabase } from "@/integrations/supabase/client";

export const SOUTHAMPTON = { lat: 50.9097, lng: -1.4044, zoom: 12.4 };

export type IssueStatus = "NEW" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "REOPENED";

export type Category = {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  colour: string;
  sort_order: number;
};

export type Issue = {
  id: string;
  reference: string;
  title: string;
  description: string;
  address_text: string | null;
  latitude: number;
  longitude: number;
  status: IssueStatus;
  confirmation_count: number;
  last_confirmed_at: string | null;
  resolved_at: string | null;
  created_at: string;
  is_sample: boolean;
  category_id: string;
  authority_id: string | null;
  reporter_id: string | null;
  ward_id: string | null;
  postcode: string | null;
  postcode_sector: string | null;
  location_accuracy: string;
  severity: number;
  asset_id: string | null;
};

export type InfrastructureAsset = {
  id: string;
  asset_type: string;
  external_asset_id: string | null;
  name: string | null;
  latitude: number;
  longitude: number;
  status: string;
  authority_id: string | null;
  source_id: string | null;
  source_updated_at: string | null;
  source_version: string | null;
  geometry_type: string;
  is_sample: boolean;
  metadata: Record<string, unknown>;
  ward_id: string | null;
  postcode_sector: string | null;
};

export const ASSET_META: Record<string, { emoji: string; label: string }> = {
  streetlight: { emoji: "💡", label: "Street light" },
  bin: { emoji: "🗑️", label: "Bin" },
  tree: { emoji: "🌳", label: "Tree" },
  bench: { emoji: "🪑", label: "Bench" },
  traffic_light: { emoji: "🚦", label: "Traffic light" },
  bus_stop: { emoji: "🚏", label: "Bus stop" },
  public_toilet: { emoji: "🚻", label: "Public toilet" },
  road: { emoji: "🛣️", label: "Road infrastructure" },
  council_property: { emoji: "🏛️", label: "Council property" },
  playground: { emoji: "🛝", label: "Playground equipment" },
  park: { emoji: "🏞️", label: "Park or garden" },
  play_area: { emoji: "🛝", label: "Play space" },
  greenspace: { emoji: "🌿", label: "Greenspace" },
  other: { emoji: "📍", label: "Public infrastructure" },
};

export function assetMeta(type: string) {
  return ASSET_META[type] ?? ASSET_META["other"]!;
}

export function assetLabel(asset: InfrastructureAsset): string {
  const meta = assetMeta(asset.asset_type);
  if (asset.name) return asset.name;
  return asset.external_asset_id ? `${meta.label} #${asset.external_asset_id}` : meta.label;
}

export const STATUS_META: Record<
  IssueStatus,
  { label: string; dot: string; chip: string }
> = {
  NEW: {
    label: "Unresolved",
    dot: "bg-signal-open",
    chip: "bg-signal-open-soft text-signal-open",
  },
  REOPENED: {
    label: "Reopened",
    dot: "bg-signal-open",
    chip: "bg-signal-open-soft text-signal-open",
  },
  ACKNOWLEDGED: {
    label: "Acknowledged",
    dot: "bg-signal-ack",
    chip: "bg-signal-ack-soft text-signal-ack",
  },
  IN_PROGRESS: {
    label: "In progress",
    dot: "bg-signal-progress",
    chip: "bg-signal-progress-soft text-signal-progress",
  },
  RESOLVED: {
    label: "Resolved",
    dot: "bg-signal-resolved",
    chip: "bg-signal-resolved-soft text-signal-resolved",
  },
};

export function timeAgo(value: string | null | undefined): string {
  if (!value) return "never";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30.4);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  return `${Math.round(months / 12)} year${months < 24 ? "" : "s"} ago`;
}

export function ageInDays(value: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Public-safe display handle, e.g. "Kayne · SO15". */
export function displayHandle(
  profile: { first_name?: string | null; postcode_district?: string | null } | null | undefined,
): string {
  if (!profile?.first_name) return "A resident";
  return profile.postcode_district
    ? `${profile.first_name} · ${profile.postcode_district}`
    : profile.first_name;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("issue_categories")
    .select("id, slug, name, emoji, colour, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as Category[];
}

const ISSUE_FIELDS =
  "id, reference, title, description, address_text, latitude, longitude, status, confirmation_count, last_confirmed_at, resolved_at, created_at, is_sample, category_id, authority_id, reporter_id, ward_id, postcode, postcode_sector, location_accuracy, severity, asset_id";

export async function fetchIssues(): Promise<Issue[]> {
  const { data, error } = await supabase
    .from("issues")
    .select(ISSUE_FIELDS)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as Issue[];
}

export async function fetchIssue(id: string): Promise<Issue | null> {
  const { data, error } = await supabase
    .from("issues")
    .select(ISSUE_FIELDS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Issue) ?? null;
}

export async function signedPhotoUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("issue-photos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Look up a UK postcode or place name using the free postcodes.io / Nominatim services. */
export async function geocode(
  query: string,
): Promise<{ lat: number; lng: number; label: string; postcode?: string } | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const postcodeLike = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d?[A-Z]{0,2}$/i.test(trimmed);

  if (postcodeLike) {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(trimmed)}`,
    ).catch(() => null);
    if (res?.ok) {
      const json = (await res.json()) as {
        result?: { latitude: number; longitude: number; postcode: string };
      };
      if (json.result) {
        return {
          lat: json.result.latitude,
          lng: json.result.longitude,
          label: json.result.postcode,
          postcode: json.result.postcode,
        };
      }
    }
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q=${encodeURIComponent(trimmed)}`,
  ).catch(() => null);
  if (!res?.ok) return null;
  const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  const hit = rows[0];
  if (!hit) return null;
  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    label: hit.display_name.split(",").slice(0, 2).join(", "),
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&lat=${lat}&lon=${lng}`,
  ).catch(() => null);
  if (!res?.ok) return null;
  const json = (await res.json()) as { display_name?: string };
  if (!json.display_name) return null;
  return json.display_name.split(",").slice(0, 3).join(", ");
}

/** Nearest UK postcode for a coordinate, used to attach postcode + sector to a report. */
export async function reversePostcode(lat: number, lng: number): Promise<string | null> {
  const res = await fetch(
    `https://api.postcodes.io/postcodes?lon=${lng}&lat=${lat}&limit=1&radius=500`,
  ).catch(() => null);
  if (!res?.ok) return null;
  const json = (await res.json()) as { result?: Array<{ postcode: string }> | null };
  return json.result?.[0]?.postcode ?? null;
}

const ASSET_FIELDS =
  "id, asset_type, external_asset_id, name, latitude, longitude, status, authority_id, source_id, source_updated_at, source_version, geometry_type, is_sample, metadata, ward_id, postcode_sector";

export type AreaAsset = {
  id: string;
  name: string | null;
  asset_type: string;
  geojson: unknown;
};

/**
 * Greenspace (polygon) features for the visible map area. Kept separate from
 * point assets so the map can show areas earlier than individual street
 * furniture without flooding the view.
 */
export async function fetchAreaAssetsInBounds(bounds: {
  west: number;
  south: number;
  east: number;
  north: number;
}): Promise<AreaAsset[]> {
  const { data, error } = await supabase.rpc("area_assets_in_bounds", {
    _west: bounds.west,
    _south: bounds.south,
    _east: bounds.east,
    _north: bounds.north,
    _limit: 400,
  });
  if (error) throw error;
  return (data ?? []) as AreaAsset[];
}

/** Viewport-scoped asset load. Assets are only meaningful at close zoom levels. */
export async function fetchAssetsInBounds(bounds: {
  west: number;
  south: number;
  east: number;
  north: number;
}): Promise<InfrastructureAsset[]> {
  const { data, error } = await supabase
    .from("infrastructure_assets")
    .select(ASSET_FIELDS)
    .gte("longitude", bounds.west)
    .lte("longitude", bounds.east)
    .gte("latitude", bounds.south)
    .lte("latitude", bounds.north)
    .eq("geometry_type", "point")
    .limit(1500);
  if (error) throw error;
  return (data ?? []) as InfrastructureAsset[];
}

export async function fetchAsset(id: string): Promise<InfrastructureAsset | null> {
  const { data, error } = await supabase
    .from("infrastructure_assets")
    .select(ASSET_FIELDS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as InfrastructureAsset) ?? null;
}

export type NearbyAsset = {
  id: string;
  label: string;
  emoji: string;
  typeLabel: string;
  externalId: string | null;
  metres: number | null;
};

/**
 * Existing assets close to a report location, offered to the resident as an
 * optional link. Nothing is attached automatically — the resident chooses.
 */
export async function fetchNearbyAssets(
  lat: number,
  lng: number,
  radiusMetres = 150,
): Promise<NearbyAsset[]> {
  const dLat = radiusMetres / 111_320;
  const dLng = radiusMetres / (111_320 * Math.cos((lat * Math.PI) / 180) || 1);
  const bounds = { west: lng - dLng, east: lng + dLng, south: lat - dLat, north: lat + dLat };

  const [points, areas] = await Promise.all([
    fetchAssetsInBounds(bounds).catch(() => [] as InfrastructureAsset[]),
    fetchAreaAssetsInBounds(bounds).catch(() => [] as AreaAsset[]),
  ]);

  const pointItems: NearbyAsset[] = points.map((a) => {
    const meta = assetMeta(a.asset_type);
    const dy = (a.latitude - lat) * 111_320;
    const dx = (a.longitude - lng) * 111_320 * Math.cos((lat * Math.PI) / 180);
    return {
      id: a.id,
      label: assetLabel(a),
      emoji: meta.emoji,
      typeLabel: meta.label,
      externalId: a.external_asset_id,
      metres: Math.round(Math.sqrt(dx * dx + dy * dy)),
    };
  });

  const areaItems: NearbyAsset[] = areas.map((a) => {
    const meta = assetMeta(a.asset_type);
    return {
      id: a.id,
      label: a.name ?? meta.label,
      emoji: meta.emoji,
      typeLabel: meta.label,
      externalId: null,
      metres: null,
    };
  });

  return [...pointItems.sort((a, b) => (a.metres ?? 0) - (b.metres ?? 0)).slice(0, 8), ...areaItems.slice(0, 4)];
}

export type InsightsSummary = {
  total_reports: number;
  unresolved_reports: number;
  resolved_reports: number;
  confirmation_total: number;
  median_age_days: number | null;
  median_resolution_days: number | null;
};

export async function fetchInsightsSummary(): Promise<InsightsSummary | null> {
  const { data, error } = await supabase.rpc("insights_summary");
  if (error) throw error;
  return (data?.[0] as InsightsSummary) ?? null;
}

export async function fetchInsightsByWard() {
  const { data, error } = await supabase.rpc("insights_by_ward");
  if (error) throw error;
  return data ?? [];
}

export async function fetchInsightsBySector() {
  const { data, error } = await supabase.rpc("insights_by_sector");
  if (error) throw error;
  return data ?? [];
}

export async function fetchInsightsTrend(months = 12) {
  const { data, error } = await supabase.rpc("insights_trend", { _months: months });
  if (error) throw error;
  return data ?? [];
}

export type ReportingDestination = {
  id: string;
  organisation_name: string;
  service_type: string;
  reporting_method: string;
  reporting_url: string | null;
  api_status: string;
  source: string | null;
  source_url: string | null;
  last_verified_at: string | null;
};

/**
 * Routing lookup: issue -> authority + category -> reporting destination.
 * Returns null when no verified destination has been recorded yet.
 * Nothing is submitted anywhere; this only exposes the routing information.
 */
export async function fetchReportingDestination(
  authorityId: string | null,
  categoryId: string | null,
) {
  const { data, error } = await supabase.rpc("resolve_reporting_destination", {
    _authority_id: authorityId as string,
    _category_id: categoryId as string,
  });
  if (error) throw error;
  return ((data as ReportingDestination[] | null)?.[0] as ReportingDestination) ?? null;
}
