/**
 * NaPTAN (National Public Transport Access Nodes) import service.
 *
 * Reusable fetch + normalise step for the Department for Transport's official
 * NaPTAN API. This module only reads the source and shapes records; persistence
 * and provenance live in the database import routine so the same pipeline can
 * be reused for other datasets later.
 */

/** Provenance metadata recorded against the Data Sources entry. */
export const NAPTAN_DATASET = {
  organisation: "Department for Transport",
  dataset_name: "NaPTAN bus stops — Southampton (ATCO area 198)",
  dataset_type: "transport_assets",
  /** Exact endpoint used by the import. */
  source_url:
    "https://naptan.api.dft.gov.uk/v1/access-nodes?atcoAreaCodes=198&dataFormat=csv",
  licence: "UK Open Government Licence (OGL)",
  attribution:
    "Contains public sector information licensed under the Open Government Licence. Source: NaPTAN, Department for Transport.",
  update_frequency: "Daily",
  coverage: "Southampton (NaPTAN ATCO area 198 / administrative area 052)",
  source_id_field: "ATCOCode",
} as const;

/** NaPTAN stop types that represent a bus stop / bus station bay. */
const BUS_STOP_TYPES = new Set(["BCT", "BCS"]);

export type NaptanStop = {
  external_asset_id: string;
  name: string | null;
  latitude: number;
  longitude: number;
  source_updated_at: string | null;
  postcode_sector?: string | null;
  metadata: Record<string, unknown>;
};

export type NaptanFetchResult = {
  /** Every row returned by the endpoint. */
  sourceRecords: number;
  /** Rows that are bus stops (other access node types are skipped). */
  busStopRecords: number;
  /** Bus stops the source marks as inactive — skipped. */
  inactiveSkipped: number;
  stops: NaptanStop[];
};

/** Minimal RFC4180 CSV parser (the NaPTAN export quotes fields containing commas). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else if (ch !== "\r") field += ch;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Downloads the Southampton NaPTAN extract and returns normalised bus stops. */
export async function fetchNaptanBusStops(): Promise<NaptanFetchResult> {
  const res = await fetch(NAPTAN_DATASET.source_url, {
    headers: { accept: "text/csv" },
  });
  if (!res.ok) {
    throw new Error(`NaPTAN endpoint returned ${res.status}`);
  }
  const rows = parseCsv((await res.text()).replace(/^\uFEFF/, ""));
  const header = rows.shift();
  if (!header) throw new Error("NaPTAN response was empty");
  const col = (name: string) => header.indexOf(name);
  const idx = {
    atco: col("ATCOCode"),
    naptan: col("NaptanCode"),
    name: col("CommonName"),
    indicator: col("Indicator"),
    street: col("Street"),
    bearing: col("Bearing"),
    locality: col("LocalityName"),
    parentLocality: col("ParentLocalityName"),
    lat: col("Latitude"),
    lng: col("Longitude"),
    stopType: col("StopType"),
    busStopType: col("BusStopType"),
    modified: col("ModificationDateTime"),
    status: col("Status"),
  };

  let sourceRecords = 0;
  let busStopRecords = 0;
  let inactiveSkipped = 0;
  const stops: NaptanStop[] = [];

  for (const r of rows) {
    if (r.length < header.length - 2) continue;
    sourceRecords += 1;
    const stopType = r[idx.stopType] ?? "";
    if (!BUS_STOP_TYPES.has(stopType)) continue;
    busStopRecords += 1;
    if ((r[idx.status] ?? "").toLowerCase() === "inactive") {
      inactiveSkipped += 1;
      continue;
    }
    const lat = Number(r[idx.lat]);
    const lng = Number(r[idx.lng]);
    const atco = (r[idx.atco] ?? "").trim();
    stops.push({
      external_asset_id: atco,
      name: (r[idx.name] ?? "").trim() || null,
      latitude: Number.isFinite(lat) ? lat : Number.NaN,
      longitude: Number.isFinite(lng) ? lng : Number.NaN,
      source_updated_at: (r[idx.modified] ?? "").trim()
        ? new Date(r[idx.modified] as string).toISOString()
        : null,
      metadata: {
        source: "NaPTAN",
        atco_code: atco,
        naptan_code: (r[idx.naptan] ?? "").trim() || null,
        stop_type: stopType,
        bus_stop_type: (r[idx.busStopType] ?? "").trim() || null,
        indicator: (r[idx.indicator] ?? "").trim() || null,
        street: (r[idx.street] ?? "").trim() || null,
        bearing: (r[idx.bearing] ?? "").trim() || null,
        locality: (r[idx.locality] ?? "").trim() || null,
        parent_locality: (r[idx.parentLocality] ?? "").trim() || null,
      },
    });
  }

  return { sourceRecords, busStopRecords, inactiveSkipped, stops };
}

/**
 * Adds a postcode sector to each stop using the Office for National Statistics
 * backed postcodes.io reverse-geocoding service. Failures are non-fatal: a stop
 * simply keeps a blank sector.
 */
export async function enrichPostcodeSectors(stops: NaptanStop[]): Promise<number> {
  const CHUNK = 100;
  let enriched = 0;
  const chunks: NaptanStop[][] = [];
  for (let i = 0; i < stops.length; i += CHUNK) chunks.push(stops.slice(i, i + CHUNK));

  for (let i = 0; i < chunks.length; i += 4) {
    const batch = chunks.slice(i, i + 4);
    const results = await Promise.all(
      batch.map(async (chunk) => {
        const res = await fetch("https://api.postcodes.io/postcodes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            geolocations: chunk.map((s) => ({
              longitude: s.longitude,
              latitude: s.latitude,
              limit: 1,
              radius: 500,
            })),
          }),
        }).catch(() => null);
        if (!res?.ok) return null;
        return (await res.json()) as {
          result?: Array<{ result?: Array<{ postcode?: string }> | null }> | null;
        };
      }),
    );
    results.forEach((json, n) => {
      const chunk = batch[n];
      if (!json?.result || !chunk) return;
      json.result.forEach((entry, k) => {
        const postcode = entry?.result?.[0]?.postcode;
        const stop = chunk[k];
        if (!postcode || !stop) return;
        stop.postcode_sector = postcode.slice(0, postcode.length - 2).trim();
        enriched += 1;
      });
    });
  }
  return enriched;
}
