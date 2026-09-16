import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { assetLabel, assetMeta, type InfrastructureAsset } from "@/lib/civic";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Compact infrastructure asset card shown when an asset marker is tapped. */
export function AssetPreviewCard({
  asset,
  onClose,
}: {
  asset: InfrastructureAsset;
  onClose: () => void;
}) {
  const meta = assetMeta(asset.asset_type);

  const { data: context } = useQuery({
    queryKey: ["asset-context", asset.id],
    staleTime: 300_000,
    queryFn: async () => {
      const [authority, ward, source] = await Promise.all([
        asset.authority_id
          ? supabase.from("authorities").select("name").eq("id", asset.authority_id).maybeSingle()
          : Promise.resolve({ data: null }),
        asset.ward_id
          ? supabase.from("wards").select("name").eq("id", asset.ward_id).maybeSingle()
          : Promise.resolve({ data: null }),
        asset.source_id
          ? supabase
              .from("data_sources")
              .select("organisation, dataset_name, licence")
              .eq("id", asset.source_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return {
        authority: (authority.data as { name: string } | null)?.name ?? null,
        ward: (ward.data as { name: string } | null)?.name ?? null,
        source: source.data as
          | { organisation: string; dataset_name: string; licence: string | null }
          | null,
      };
    },
  });

  const rows: Array<[string, string]> = [];
  if (asset.external_asset_id) rows.push(["ATCO code", asset.external_asset_id]);
  if (context?.ward) rows.push(["Ward", context.ward]);
  if (asset.postcode_sector) rows.push(["Postcode sector", asset.postcode_sector]);
  rows.push(["Location", `${asset.latitude.toFixed(5)}, ${asset.longitude.toFixed(5)}`]);
  if (context?.authority) rows.push(["Authority", context.authority]);
  if (context?.source) rows.push(["Source", `${context.source.organisation} · ${context.source.dataset_name}`]);
  const updated = formatDate(asset.source_updated_at);
  if (updated) rows.push(["Last source update", updated]);

  return (
    <div className="civic-float relative p-4 shadow-panel">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close infrastructure preview"
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span aria-hidden>{meta.emoji} </span>
        {meta.label}
      </p>
      <h3 className="mt-1 pr-8 text-base font-semibold leading-snug">{assetLabel(asset)}</h3>
      <dl className="mt-2 space-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="w-36 shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
      {asset.status !== "operational" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Status: <span className="capitalize">{asset.status.replace(/_/g, " ")}</span>
        </p>
      )}
      {asset.is_sample && (
        <p className="mt-2 text-xs text-muted-foreground">Demo asset record.</p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Infrastructure record, not a community report.
      </p>
    </div>
  );
}
