# Phase 1 assessment: making Southampton "Authority #001"

Read-only inspection. Nothing was changed, imported or deleted.

Headline: the data model is already about 80% authority-generic. Southampton is hard-coded in only a handful of places, mostly app configuration and copy — not in the core tables. No redesign is needed; the work is additive.

## 1. Already fits the target architecture (do not rebuild)

- **Authorities** — generic: name, slug, type (Southampton is stored as `unitary`), official code, country, region, website, boundary, active flag, plus a free-form `reporting_info`. Country/region tables already exist (4 countries, 1 region).
- **Assets** — generic: type, point or polygon geometry, authority, ward, postcode sector, source dataset, original source ID, source version, status, provenance flags. Original source identifiers are retained (ATCO codes, OS IDs) and uniqueness is per source, so two authorities can never collide.
- **Issues, confirmations, comments, photos, status history** — all authority/ward-linked, none Southampton-specific.
- **Reporting destinations** — already keyed on authority + category, and the resolver already refuses to return another authority's route. It is UK-ready as written.
- **Data sources** — publisher, dataset, licence, attribution, coverage, version, identifier field, record count, status, retrieval date; optionally scoped to an authority.
- **Provenance separation** — official / derived / community data are already distinct and stay distinct.

## 2. Needs modification

| Area | Gap |
| --- | --- |
| Geographies | Only a `wards` table exists. Scotland, Wales and Northern Ireland use electoral wards, communities and district electoral areas. Needs a geography *type* and effective/valid-from dates. |
| Organisations | Organisations only exist as councils, or as free text on a reporting route. Contractors (Enerveo), transport bodies and utilities have no record of their own. |
| Asset ownership | Assets carry a "responsible organisation" but no separate "owner". |
| Categories | 11 categories exist; the target list has 16 (missing road markings, play equipment, street furniture, road signs, graffiti). No local-terminology mapping table yet. |
| Reporting destinations | Conditions are a single yes/no flag; verification is only a date; organisation is text. |
| Data sources | No API endpoint field, no "last successful refresh" separate from last import. |
| Authority adapters | No per-authority configuration record at all. |

## 3 & 4. Where Southampton is hard-coded

- Map default centre/zoom constant used by the map and the report flow.
- Import pipeline: a fixed council slug, the NaPTAN area code 198, and greenspace coverage text.
- Page titles, descriptions, the About page, the search placeholder, and "Southampton" as the fallback location label on issue and profile lists.
- Database: `resolve_authority` silently falls back to the oldest authority when a point matches no boundary. Today that always means Southampton. UK-wide this would misfile reports.
- Southampton's own boundary is empty, so the boundary lookup never actually runs.

## 5. Functions that must become authority-aware

`resolve_authority` (drop the fallback, load real boundaries), the two import pipelines (take an authority as a parameter), `authority_bng_bbox` (already parameterised), and the Insights functions (already aggregate by authority; need optional filtering).

## 6-8. Direct answers

- **Reporting resolver:** yes, UK-wide without redesign. Only conditions and verification need enriching.
- **Asset model:** yes, multi-authority today. Only owner-vs-responsible separation is missing.
- **Geography:** partly. Ward polygons work for England and Scotland; Wales and Northern Ireland need the generalised geography type.

## 9. Security implications

Public read / admin write is correct and unchanged. One future concern: administrator and moderator rights are global, so a Manchester moderator would be able to act on Southampton. Authority-scoped roles are needed before any second authority goes live — not before the migration itself.

## 10. Minimum database changes

1. Add a boundary polygon for Southampton, then remove the "nearest fallback" behaviour so unmatched points return nothing.
2. Add a geography type and effective date to the geography table, defaulting existing rows to "ward".
3. Add an organisations table; link existing reporting routes and asset responsibility to it, keeping the current text as-is.
4. Add an owner organisation field to assets (nullable).
5. Add an authority configuration/adapter record, with Southampton's current import settings as row #001.

All are additive. No existing row changes meaning.

## 11. Minimum code changes

1. Move map centre/zoom, search placeholder and area name into authority configuration read from the database.
2. Change imports to accept the authority and its dataset codes rather than a fixed slug.
3. Replace the "Southampton" text fallbacks with the location's own authority name.
4. Leave map rendering, layer toggles, report flow, confirmations, Insights and Admin untouched.

## 12. Risks to the live app

- Removing the authority fallback before Southampton has a boundary would leave new reports unassigned — load the boundary first, in the same step.
- Import functions currently assume one council; changing their signature must keep the existing Admin buttons working.
- Postcode-sector data is sparse; unrelated to this migration but it will look emptier when compared across authorities.
- Nothing in this plan touches the 1,178 assets, 15 reports, 17 wards, 14 routes or 3 datasets.

## 13. Recommended sequence

1. Load Southampton's real boundary and tighten the authority lookup.
2. Generalise geography (type + dates), defaulting everything to ward.
3. Introduce organisations; connect reporting routes and asset responsibility.
4. Add the authority configuration record and move hard-coded settings into it.
5. Parameterise the import pipelines.
6. Extend categories and add local terminology mapping.
7. Add authority-scoped roles — required before a second authority.
8. Only then trial a second authority (Manchester) with no new core code.

Steps 1-5 make Southampton Authority #001 with zero visible change. Steps 6-8 are prerequisites for the second authority.
