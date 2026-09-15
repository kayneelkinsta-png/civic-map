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
};

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
  "id, reference, title, description, address_text, latitude, longitude, status, confirmation_count, last_confirmed_at, resolved_at, created_at, is_sample, category_id, authority_id, reporter_id";

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
): Promise<{ lat: number; lng: number; label: string } | null> {
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
        };
      }
    }
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q=${encodeURIComponent(trimmed)}`,
  ).catch(() => null);
  if (!res?.ok) return null;
  const rows = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!rows.length) return null;
  return {
    lat: Number(rows[0].lat),
    lng: Number(rows[0].lon),
    label: rows[0].display_name.split(",").slice(0, 2).join(", "),
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
