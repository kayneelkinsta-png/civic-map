/**
 * OS Open Greenspace import service.
 *
 * Streams the official Ordnance Survey OS OpenData download for the national
 * grid tiles that cover a given authority, parses the GML `GreenspaceSite`
 * features and returns them as British National Grid WKT polygons. Persistence,
 * validation, boundary filtering and ward assignment all happen in the database
 * import routine, so this module only reads and shapes the source.
 */

const PRODUCT = "OpenGreenspace";
const PRODUCT_URL = `https://api.os.uk/downloads/v1/products/${PRODUCT}`;

/** Provenance metadata recorded against the Data Sources entry. */
export const GREENSPACE_DATASET = {
  organisation: "Ordnance Survey",
  dataset_name: "OS Open Greenspace — Southampton extract",
  dataset_type: "greenspace_assets",
  source_url: `${PRODUCT_URL}/downloads?area={GRID}&format=GML&redirect`,
  licence: "Ordnance Survey OpenData Licence (http://os.uk/opendata/licence)",
  attribution:
    "Contains Ordnance Survey data © Crown copyright and database right 2026. Source: OS Open Greenspace.",
  update_frequency: "Biannual (OS Open Greenspace release cycle)",
  coverage: "Southampton City Council area, extracted from GB national grid tiles",
  source_id_field: "GreenspaceSite gml:id (OS TOID-based feature identifier)",
} as const;

/**
 * Source `function` values mapped to CivicLense asset types. Only distinctions
 * the source itself makes are used; every other function keeps the generic
 * greenspace type and the original value is preserved in metadata.
 */
const FUNCTION_TYPE: Record<string, string> = {
  "Public Park Or Garden": "park",
  "Play Space": "play_area",
};

export type AreaFeature = {
  external_asset_id: string;
  name: string | null;
  asset_type: string;
  /** MULTIPOLYGON WKT in EPSG:27700, exactly as supplied by the source. */
  wkt: string;
  source_version: string;
  metadata: Record<string, unknown>;
};

export type GreenspaceFetchResult = {
  version: string;
  gridTiles: string[];
  sourceRecords: number;
  features: AreaFeature[];
  malformed: number;
};

/** British National Grid 100 km square letters for an easting/northing pair. */
export function bngGridSquare(easting: number, northing: number): string | null {
  const letters = "ABCDEFGHJKLMNOPQRSTUVWXYZ";
  const e100k = Math.floor(easting / 100000);
  const n100k = Math.floor(northing / 100000);
  if (e100k < 0 || e100k > 6 || n100k < 0 || n100k > 12) return null;
  const l1 = (19 - n100k) - ((19 - n100k) % 5) + Math.floor((e100k + 10) / 5);
  const l2 = ((19 - n100k) * 5) % 25 + (e100k % 5);
  return `${letters[l1]}${letters[l2]}`;
}

/** Every 100 km grid tile touched by a bounding box in metres (EPSG:27700). */
export function gridTilesForBbox(bbox: {
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
}): string[] {
  const tiles = new Set<string>();
  for (let e = Math.floor(bbox.minx / 100000); e <= Math.floor(bbox.maxx / 100000); e += 1) {
    for (let n = Math.floor(bbox.miny / 100000); n <= Math.floor(bbox.maxy / 100000); n += 1) {
      const sq = bngGridSquare(e * 100000, n * 100000);
      if (sq) tiles.add(sq);
    }
  }
  return [...tiles];
}

/** Current published product version, e.g. "2026-04". */
export async function fetchProductVersion(): Promise<string> {
  const res = await fetch(PRODUCT_URL, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`OS product endpoint returned ${res.status}`);
  const json = (await res.json()) as { version?: string };
  return json.version ?? "unknown";
}

function u16(b: Uint8Array, o: number) {
  return b[o]! | (b[o + 1]! << 8);
}
function u32(b: Uint8Array, o: number) {
  return (b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24)) >>> 0;
}

/** Locates a single entry inside a ZIP archive and returns its deflated bytes. */
function zipEntry(buf: Uint8Array, suffix: string): { data: Uint8Array; stored: boolean } {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i > buf.length - 66000; i -= 1) {
    if (u32(buf, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP end-of-directory record not found");
  const count = u16(buf, eocd + 10);
  let ptr = u32(buf, eocd + 16);
  const decoder = new TextDecoder();
  for (let n = 0; n < count; n += 1) {
    if (u32(buf, ptr) !== 0x02014b50) throw new Error("ZIP directory entry malformed");
    const nameLen = u16(buf, ptr + 28);
    const extraLen = u16(buf, ptr + 30);
    const commentLen = u16(buf, ptr + 32);
    const method = u16(buf, ptr + 10);
    const compressedSize = u32(buf, ptr + 20);
    const localOffset = u32(buf, ptr + 42);
    const name = decoder.decode(buf.subarray(ptr + 46, ptr + 46 + nameLen));
    if (name.toLowerCase().endsWith(suffix)) {
      const lNameLen = u16(buf, localOffset + 26);
      const lExtraLen = u16(buf, localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      return { data: buf.subarray(start, start + compressedSize), stored: method === 0 };
    }
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`No "${suffix}" entry inside the OS download`);
}

function ringWkt(posList: string): string | null {
  const nums = posList.trim().split(/\s+/);
  if (nums.length < 8 || nums.length % 2 !== 0) return null;
  const pairs: string[] = [];
  for (let i = 0; i < nums.length; i += 2) pairs.push(`${nums[i]} ${nums[i + 1]}`);
  return `(${pairs.join(", ")})`;
}

const RING_RE =
  /<gml:(exterior|interior)>\s*<gml:LinearRing>\s*<gml:posList[^>]*>([^<]*)<\/gml:posList>/g;

/** Parses one `<ogsp:GreenspaceSite>` block. Returns null when unusable. */
function parseSite(
  xml: string,
  version: string,
  bbox: { minx: number; miny: number; maxx: number; maxy: number },
): AreaFeature | null {
  const id = /gml:id="([^"]+)"/.exec(xml)?.[1];
  if (!id) return null;

  const polygons: string[] = [];
  let current: string[] = [];
  let minx = Infinity;
  let miny = Infinity;
  let maxx = -Infinity;
  let maxy = -Infinity;

  RING_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RING_RE.exec(xml))) {
    const ring = ringWkt(m[2] ?? "");
    if (!ring) continue;
    if (m[1] === "exterior") {
      if (current.length) polygons.push(`(${current.join(", ")})`);
      current = [ring];
      const nums = (m[2] ?? "").trim().split(/\s+/).map(Number);
      for (let i = 0; i < nums.length; i += 2) {
        const x = nums[i]!;
        const y = nums[i + 1]!;
        if (x < minx) minx = x;
        if (x > maxx) maxx = x;
        if (y < miny) miny = y;
        if (y > maxy) maxy = y;
      }
    } else if (current.length) {
      current.push(ring);
    }
  }
  if (current.length) polygons.push(`(${current.join(", ")})`);
  if (!polygons.length) return null;

  // Cheap bounding-box pre-filter so only local features leave this process.
  if (maxx < bbox.minx || minx > bbox.maxx || maxy < bbox.miny || miny > bbox.maxy) return null;

  const fn = /<ogsp:function[^>]*>([^<]*)<\/ogsp:function>/.exec(xml)?.[1]?.trim() ?? null;
  const name =
    /<ogsp:distinctiveName1>([^<]*)<\/ogsp:distinctiveName1>/.exec(xml)?.[1]?.trim() || null;

  return {
    external_asset_id: id,
    name,
    asset_type: (fn && FUNCTION_TYPE[fn]) || "greenspace",
    wkt: `MULTIPOLYGON(${polygons.join(", ")})`,
    source_version: version,
    metadata: {
      source: "OS Open Greenspace",
      os_feature_id: id,
      function: fn,
      grid_reference_system: "EPSG:27700 (source), stored as EPSG:4326",
    },
  };
}

/**
 * Downloads the grid tiles covering the given British National Grid bounding
 * box and returns the greenspace features that intersect it. Geometry is passed
 * through untouched apart from WKT formatting — no simplification is applied.
 */
export async function fetchGreenspaceFeatures(bbox: {
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
}): Promise<GreenspaceFetchResult> {
  const version = await fetchProductVersion();
  const gridTiles = gridTilesForBbox(bbox);
  const features: AreaFeature[] = [];
  let sourceRecords = 0;
  let malformed = 0;

  for (const tile of gridTiles) {
    const url = `${PRODUCT_URL}/downloads?area=${tile}&format=GML&redirect`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OS download for tile ${tile} returned ${res.status}`);
    const zip = new Uint8Array(await res.arrayBuffer());
    const entry = zipEntry(zip, ".gml");

    const raw = entry.stored
      ? new Blob([entry.data as BlobPart]).stream()
      : new Blob([entry.data as BlobPart])
          .stream()
          .pipeThrough(new DecompressionStream("deflate-raw"));
    const reader = raw.pipeThrough(new TextDecoderStream()).getReader();

    let buffer = "";
    const CLOSE = "</ogsp:GreenspaceSite>";
    for (;;) {
      const { value, done } = await reader.read();
      if (value) buffer += value;
      let cut = buffer.indexOf(CLOSE);
      while (cut !== -1) {
        const block = buffer.slice(0, cut + CLOSE.length);
        buffer = buffer.slice(cut + CLOSE.length);
        const open = block.indexOf("<ogsp:GreenspaceSite");
        if (open !== -1) {
          sourceRecords += 1;
          const feature = parseSite(block.slice(open), version, bbox);
          if (feature) features.push(feature);
        }
        cut = buffer.indexOf(CLOSE);
      }
      if (buffer.length > 4_000_000) {
        // Only text before any open site element can be discarded safely
        // (the file also contains access-point features we do not import).
        const open = buffer.lastIndexOf("<ogsp:GreenspaceSite");
        if (open === -1) buffer = "";
        else {
          malformed += 1;
          buffer = buffer.slice(open);
        }
      }
      if (done) break;
    }
  }

  return { version, gridTiles, sourceRecords, features, malformed };
}

/** Counts of features per CivicLense asset type, for the import report. */
export function countByType(features: AreaFeature[]): Record<string, number> {
  return features.reduce<Record<string, number>>((acc, f) => {
    acc[f.asset_type] = (acc[f.asset_type] ?? 0) + 1;
    return acc;
  }, {});
}
