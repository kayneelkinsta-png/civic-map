import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  GREENSPACE_DATASET,
  countByType,
  fetchGreenspaceFeatures,
} from "@/lib/greenspace.server";
import {
  NAPTAN_DATASET,
  enrichPostcodeSectors,
  fetchNaptanBusStops,
} from "@/lib/naptan.server";

export type ImportReport = {
  dataset: string;
  source_url: string;
  source_records: number;
  bus_stop_records: number;
  inactive_skipped: number;
  postcode_sectors: number;
  considered: number;
  invalid: number;
  duplicates: number;
  outside_boundary: number;
  inserted: number;
  updated: number;
  marked_source_removed: number;
  total_in_database: number;
};

/** Authority the dataset is imported against — configuration, never hard-coded logic. */
const AUTHORITY_SLUG = "southampton-city-council";
const ASSET_TYPE = "bus_stop";

/**
 * Runs (or re-runs) the NaPTAN bus-stop import. Idempotent: existing assets are
 * matched on their ATCO code, new codes are added, and codes that disappear from
 * a later release are retained and flagged rather than deleted.
 */
export const runNaptanImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ImportReport> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) {
      throw new Error("Administrator access is required to run dataset imports.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: authority, error: authorityError } = await supabaseAdmin
      .from("authorities")
      .select("id")
      .eq("slug", AUTHORITY_SLUG)
      .maybeSingle();
    if (authorityError) throw authorityError;
    if (!authority) throw new Error(`Authority "${AUTHORITY_SLUG}" is not configured.`);

    // 1. Register (or reuse) the provenance record before touching any assets.
    const { data: existingSource } = await supabaseAdmin
      .from("data_sources")
      .select("id")
      .eq("organisation", NAPTAN_DATASET.organisation)
      .eq("dataset_name", NAPTAN_DATASET.dataset_name)
      .maybeSingle();

    const accessedAt = new Date().toISOString();
    const sourceRow = {
      organisation: NAPTAN_DATASET.organisation,
      dataset_name: NAPTAN_DATASET.dataset_name,
      dataset_type: NAPTAN_DATASET.dataset_type,
      source_url: NAPTAN_DATASET.source_url,
      licence: NAPTAN_DATASET.licence,
      attribution: NAPTAN_DATASET.attribution,
      update_frequency: NAPTAN_DATASET.update_frequency,
      coverage: NAPTAN_DATASET.coverage,
      source_id_field: NAPTAN_DATASET.source_id_field,
      authority_id: authority.id,
      accessed_at: accessedAt,
      import_status: "importing",
      is_active: true,
    };

    let sourceId = existingSource?.id;
    if (sourceId) {
      const { error } = await supabaseAdmin
        .from("data_sources")
        .update(sourceRow)
        .eq("id", sourceId);
      if (error) throw error;
    } else {
      const { data, error } = await supabaseAdmin
        .from("data_sources")
        .insert(sourceRow)
        .select("id")
        .single();
      if (error) throw error;
      sourceId = data.id;
    }

    try {
      // 2. Read the official source.
      const fetched = await fetchNaptanBusStops();
      // 3. Enrich with postcode sectors (non-fatal).
      const sectors = await enrichPostcodeSectors(fetched.stops);

      // 4. Persist: boundary filtering, validation, upsert and retirement all
      //    happen inside one transactional database routine.
      const { data: result, error: importError } = await supabaseAdmin.rpc(
        "import_infrastructure_assets",
        {
          _source_id: sourceId,
          _asset_type: ASSET_TYPE,
          _authority_id: authority.id,
          _payload: fetched.stops as unknown as never,
        },
      );
      if (importError) throw importError;
      const counts = result as unknown as {
        considered: number;
        invalid: number;
        duplicates: number;
        outside_boundary: number;
        inserted: number;
        updated: number;
        marked_source_removed: number;
      };

      const { count } = await supabaseAdmin
        .from("infrastructure_assets")
        .select("id", { count: "exact", head: true })
        .eq("source_id", sourceId);

      await supabaseAdmin
        .from("data_sources")
        .update({
          import_status: "imported",
          record_count: count ?? 0,
          last_imported_at: new Date().toISOString(),
        })
        .eq("id", sourceId);

      return {
        dataset: NAPTAN_DATASET.dataset_name,
        source_url: NAPTAN_DATASET.source_url,
        source_records: fetched.sourceRecords,
        bus_stop_records: fetched.busStopRecords,
        inactive_skipped: fetched.inactiveSkipped,
        postcode_sectors: sectors,
        total_in_database: count ?? 0,
        ...counts,
      };
    } catch (error) {
      await supabaseAdmin
        .from("data_sources")
        .update({ import_status: "failed" })
        .eq("id", sourceId);
      throw error;
    }
  });

export type GreenspaceReport = {
  dataset: string;
  version: string;
  grid_tiles: string[];
  source_records: number;
  in_bbox: number;
  by_type: Record<string, number>;
  considered: number;
  invalid: number;
  duplicates: number;
  outside_boundary: number;
  inserted: number;
  updated: number;
  ward_assigned: number;
  postcode_sectors: number;
  marked_source_removed: number;
  total_in_database: number;
};

/**
 * Runs (or re-runs) the OS Open Greenspace import for the configured authority.
 * Uses the same provenance pipeline as NaPTAN: register the source, read the
 * official download, persist through a transactional database routine keyed on
 * the source's own feature identifier, then retire anything absent from the
 * release without deleting it.
 */
export const runGreenspaceImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GreenspaceReport> => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) {
      throw new Error("Administrator access is required to run dataset imports.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: authority, error: authorityError } = await supabaseAdmin
      .from("authorities")
      .select("id")
      .eq("slug", AUTHORITY_SLUG)
      .maybeSingle();
    if (authorityError) throw authorityError;
    if (!authority) throw new Error(`Authority "${AUTHORITY_SLUG}" is not configured.`);

    // Grid tiles to download are derived from the authority's own ward coverage.
    const { data: bboxRows, error: bboxError } = await supabaseAdmin.rpc("authority_bng_bbox", {
      _authority_id: authority.id,
    });
    if (bboxError) throw bboxError;
    const bbox = (bboxRows as unknown as Array<{
      minx: number;
      miny: number;
      maxx: number;
      maxy: number;
    }>)?.[0];
    if (!bbox?.minx) {
      throw new Error("No ward boundaries are loaded for this authority, so the area to import cannot be determined.");
    }

    const fetched = await fetchGreenspaceFeatures(bbox);

    const { data: existingSource } = await supabaseAdmin
      .from("data_sources")
      .select("id")
      .eq("organisation", GREENSPACE_DATASET.organisation)
      .eq("dataset_name", GREENSPACE_DATASET.dataset_name)
      .maybeSingle();

    const sourceRow = {
      organisation: GREENSPACE_DATASET.organisation,
      dataset_name: GREENSPACE_DATASET.dataset_name,
      dataset_type: GREENSPACE_DATASET.dataset_type,
      source_url: GREENSPACE_DATASET.source_url.replace("{GRID}", fetched.gridTiles.join("|")),
      licence: GREENSPACE_DATASET.licence,
      attribution: GREENSPACE_DATASET.attribution,
      update_frequency: GREENSPACE_DATASET.update_frequency,
      coverage: GREENSPACE_DATASET.coverage,
      source_id_field: GREENSPACE_DATASET.source_id_field,
      source_version: fetched.version,
      authority_id: authority.id,
      accessed_at: new Date().toISOString(),
      import_status: "importing",
      is_active: true,
    };

    let sourceId = existingSource?.id;
    if (sourceId) {
      const { error } = await supabaseAdmin.from("data_sources").update(sourceRow).eq("id", sourceId);
      if (error) throw error;
    } else {
      const { data, error } = await supabaseAdmin
        .from("data_sources")
        .insert(sourceRow)
        .select("id")
        .single();
      if (error) throw error;
      sourceId = data.id;
    }

    try {
      const totals = {
        considered: 0,
        invalid: 0,
        duplicates: 0,
        outside_boundary: 0,
        inserted: 0,
        updated: 0,
        ward_assigned: 0,
      };
      const CHUNK = 120;
      for (let i = 0; i < fetched.features.length; i += CHUNK) {
        const batch = fetched.features.slice(i, i + CHUNK);
        const { data: result, error } = await supabaseAdmin.rpc("import_area_assets", {
          _source_id: sourceId,
          _authority_id: authority.id,
          _payload: batch as unknown as never,
        });
        if (error) throw error;
        const counts = result as unknown as typeof totals;
        for (const key of Object.keys(totals) as Array<keyof typeof totals>) {
          totals[key] += counts[key] ?? 0;
        }
      }

      const { data: removed, error: retireError } = await supabaseAdmin.rpc(
        "retire_missing_source_assets",
        {
          _source_id: sourceId,
          _keep: fetched.features.map((f) => f.external_asset_id),
        },
      );
      if (retireError) throw retireError;

      const postcodeSectors = await enrichSourcePostcodeSectors(supabaseAdmin, sourceId);

      const { count } = await supabaseAdmin
        .from("infrastructure_assets")
        .select("id", { count: "exact", head: true })
        .eq("source_id", sourceId);

      await supabaseAdmin
        .from("data_sources")
        .update({
          import_status: "imported",
          record_count: count ?? 0,
          last_imported_at: new Date().toISOString(),
        })
        .eq("id", sourceId);

      return {
        dataset: GREENSPACE_DATASET.dataset_name,
        version: fetched.version,
        grid_tiles: fetched.gridTiles,
        source_records: fetched.sourceRecords,
        in_bbox: fetched.features.length,
        by_type: countByType(fetched.features),
        postcode_sectors: postcodeSectors,
        marked_source_removed: (removed as unknown as number) ?? 0,
        total_in_database: count ?? 0,
        ...totals,
      };
    } catch (error) {
      await supabaseAdmin.from("data_sources").update({ import_status: "failed" }).eq("id", sourceId);
      throw error;
    }
  });

/**
 * Fills postcode sectors for a source's assets using the representative point
 * CivicLense calculated for each feature. Failures are non-fatal.
 */
async function enrichSourcePostcodeSectors(
  admin: { from: (t: string) => any },
  sourceId: string,
): Promise<number> {
  const { data } = await admin
    .from("infrastructure_assets")
    .select("id, latitude, longitude")
    .eq("source_id", sourceId)
    .is("postcode_sector", null)
    .limit(1000);
  const rows = (data ?? []) as Array<{ id: string; latitude: number; longitude: number }>;
  let filled = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const res = await fetch("https://api.postcodes.io/postcodes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        geolocations: chunk.map((r) => ({
          longitude: r.longitude,
          latitude: r.latitude,
          limit: 1,
          radius: 1000,
        })),
      }),
    }).catch(() => null);
    if (!res?.ok) continue;
    const json = (await res.json()) as {
      result?: Array<{ result?: Array<{ postcode?: string }> | null }> | null;
    };
    await Promise.all(
      (json.result ?? []).map(async (entry, k) => {
        const postcode = entry?.result?.[0]?.postcode;
        const row = chunk[k];
        if (!postcode || !row) return;
        await admin
          .from("infrastructure_assets")
          .update({ postcode_sector: postcode.slice(0, postcode.length - 2).trim() })
          .eq("id", row.id);
        filled += 1;
      }),
    );
  }
  return filled;
}
