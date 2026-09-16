import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
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
