# Vault Fork — Execution Plan (file-mapped)

Verified against the actual `The-Safe` repo (StakTrakr codebase) on 2026-08-06.
Base spec: `Vault Fork — Removal Spec` (pasted doc). This refines the existing
`Build and Modify plan info.rtf` sketch into concrete file targets, grouped
into PRs that respect the repo's own rules (`AGENTS.md`: one Plane issue +
worktree + PR to `dev` per runtime change; no direct pushes to `dev`/`main`).

Nothing here is "unrelated to the spreadsheet" and gets cut on that basis
alone — every item below traces to a line in the removal spec. Anything not
named in the spec (serial/cert, Type/Metal/Name/Year/Purity/Weight/Qty,
dates, prices, payment method, locations, retail price, notes, tags, images,
live spot, table sort/filter, disposal tracking, CSV/JSON/ZIP import-export,
Owner, Digital Gold, Order ID) is left untouched.

---

## 0. Whole-file deletions (safe to `git rm` outright)

These are dedicated single-feature modules — nothing else in the app should
import from them once their call sites are cut in Phase 1–7 below.

| File | Lines | Feature |
|---|---|---|
| `js/goldback.js` | 718 | Goldback/Silverback engine |
| `js/cloud-sync.js` | 6,193 | Dropbox sync engine |
| `js/cloud-storage.js` | 1,778 | Dropbox/Drive/OneDrive/pCloud/Box placeholders |
| `js/vault-crypto.js` | 188 | AES-256-GCM `.stvault` encryption |
| `js/vault.js` | 18 | Vault export/import entry point |
| `js/pcgs-api.js` | 734 | PCGS lookup API |
| `js/numista-lookup.js` | 282 | Numista lookup API |
| `js/numista-modal.js` | 47 | Numista results modal (legacy) |
| `js/catalog-numista-modal.js` | 1,555 | Numista results modal (current) |
| `js/catalog-manager.js` | 643 | Catalog lookup orchestration |
| `js/catalog-api.js` | 1,700 | Catalog API call log / provider glue |
| `js/catalog-providers.js` | 45 | Numista/PCGS provider registry |
| `js/bulkEdit.js` | 2,098 | Bulk Editor (beta) |
| `js/bulk-row-images.js` | 327 | Bulk Editor image handling |
| `js/bulk-image-cache.js` | 480 | Bulk Editor image cache |

**~16,800 lines removed by deletion alone**, before any surgical edits below.
Also delete the vendor libs these leave orphaned once confirmed unused
elsewhere: `vendor/forge.min.js` (AES for vault-crypto), `vendor/jspdf.umd.min.js`
+ `vendor/jspdf.plugin.autotable.min.js` (PDF export, Phase 7).
`vendor/jszip.min.js` and `vendor/lz-string.min.js` stay — ZIP/CSV/JSON export
is kept.

Do **not** delete `js/spot-ratio-chips.js` / `js/spot-ratio-math.js` (spot
ratio calculator, unrelated to Goldback/Constitutional despite touching the
same files in grep) or `js/image-cache*.js` / `image-processor.js` /
`image-frame.js` (general item image handling, kept — Images field stays).

---

## 1. Grading & Certification

**Remove:** Grade dropdown (AG–MS70/PF60–PF70), Authority dropdown
(PCGS/NGC/ANACS/ICG), Numista #, PCGS # + lookup link/icon, lookup settings,
PCGS/Numista modals, catalog API call log, Import Numista option.
**Keep:** Cert/Serial # as a plain text field.

- `index.html` — remove Grade/Authority `<select>` row and Numista#/PCGS#
  inputs + lookup icon in the Add/Edit Item modal; remove the two catalog
  modal markup blocks (`catalog-numista-modal`, PCGS "Item Found" modal).
  Collapse the row so Cert # moves up (CSS/DOM order, not a new component).
- `js/constants.js` — remove `GRADE_OPTIONS`/`AUTHORITY_OPTIONS` (or
  equivalent), remove Numista/PCGS keys from `ALLOWED_STORAGE_KEYS`.
- `js/events.js`, `js/init.js`, `js/settings.js`, `js/settings-listeners.js` —
  remove listeners/init calls that wire up lookup buttons and the catalog
  API log tab (already partly covered in Phase 6).
- `js/inventory.js`, `js/inventory-table.js`, `js/inventory-import.js`,
  `js/inventory-backup.js`, `js/csv-export.js`, `js/diff-engine.js`,
  `js/diff-modal.js`, `js/diff-modal-settings.js`, `js/changeLog.js`,
  `js/search.js`, `js/filters.js`, `js/sorting.js`, `js/autocomplete.js`,
  `js/field-meta.js`, `js/types.js`, `js/card-view.js`, `js/viewModal.js`,
  `js/detailsModal.js`, `js/clone-picker.js`, `js/seed-data.js` — each has a
  `numista`/`pcgs` reference (field definitions, import/export column
  mapping, diff rendering, autocomplete indices, seed fixtures). Grep
  `numista\|pcgs` case-insensitive per file and strip the field, not the
  whole file — these are shared, multi-feature modules.
- `js/api.js`, `js/spotLookup.js` — remove the Numista/PCGS API client calls
  (the price/spot-lookup logic in these files is unrelated and stays).

## 2. Catalog & Descriptive Metadata

**Remove:** Country, Denomination, Composition, Shape, Diameter, Length,
Width, Thickness, Orientation, Technique, Mintage, Rarity Index, KM
Reference, Commemorative toggle + description, Obverse/Reverse/Edge
Description, Capsule toggle + Capsule Notes.

- `index.html` — delete the "Catalog Data" collapsible `<section>` and the
  commemorative/obverse/reverse/edge sub-block from the Add/Edit modal;
  delete the Capsule toggle row.
- `js/constants.js`, `js/field-meta.js`, `js/types.js` — remove these field
  definitions from the item schema/field registry.
- `js/inventory-table.js`, `js/sorting.js`, `js/filters.js` — remove
  Mintage/Rarity from the sort menu and any filter chips.
- `js/inventory-import.js`, `js/inventory-backup.js`, `js/csv-export.js`,
  `js/diff-engine.js`, `js/diff-modal.js` — drop these columns from
  import/export mapping and diff rendering.
- `js/autocomplete.js` — remove any autocomplete indices built from these
  fields (composition/shape/etc., if present).
- Notes field itself is untouched — confirm it still renders as a standalone
  free-text field after the sub-block above it is deleted.

## 3. Constitutional Silver & Goldback

**Remove:** Constitutional by-denomination calculator, coin-count/face-value
inputs, junk-silver melt line; Goldback/Silverback units, denomination
presets, Goldback pricing engine, Goldback Price History modal, Goldback
ticker filter entry.

- `js/goldback.js` — delete whole file (Phase 0).
- `index.html` — remove "Constitutional" from the Type `<select>`, remove
  its conditional form block; remove "Goldback"/"Silverback" from the Unit
  dropdown; remove the Goldback Price History modal markup; shrink the
  weight-unit dropdown to oz/g/kg/lb.
- `js/constants.js` — remove Constitutional/Goldback entries from
  `TYPE_OPTIONS`/`UNIT_OPTIONS`/Metal Order/ticker filter list; remove
  Goldback storage keys from `ALLOWED_STORAGE_KEYS`.
- `js/events.js`, `js/init.js`, `js/state.js` — remove the conditional
  form-block toggle logic and Goldback modal state.
- `js/inventory.js`, `js/inventory-table.js`, `js/card-view.js`,
  `js/viewModal.js`, `js/diff-modal.js`, `js/settings.js`,
  `js/inventory-backup.js`, `js/api.js`, `js/api-health.js`,
  `js/market-data.js`, `js/market-charts.js`, `js/priceHistory.js`,
  `js/retail.js`, `js/about.js`, `js/utils.js`, `js/spotLookup.js`,
  `js/settings-listeners.js`, `js/catalog-api.js` — each has a Goldback
  reference (pricing-engine hook, ticker entry, About "what's new" mention,
  etc.); strip per-file, don't delete (all are shared modules).
- **Careful:** `js/spot-ratio-chips.js` and `js/spot-ratio-math.js` matched
  the "goldback" grep but implement the general spot-ratio calculator
  (metal-to-metal ratio chips), which is not in the removal spec — leave
  these files intact, just confirm no dangling Goldback-only branch inside
  them.

## 4. Cloud Sync & Encrypted Backup

**Remove:** Dropbox connect/auto-sync/Sync Now/history/Settings modal +
placeholder cards for Drive/OneDrive/pCloud/Box; AES-256-GCM `.stvault`
export/import, vault password prompts, Restore Preview/Review Changes
modals.

- `js/cloud-sync.js`, `js/cloud-storage.js`, `js/vault-crypto.js`,
  `js/vault.js` — delete whole files (Phase 0).
- `vendor/forge.min.js` — delete once confirmed unused elsewhere (it backs
  vault-crypto's AES-GCM).
- `index.html` — remove the entire Settings → Cloud tab markup; remove
  "Encrypted Backup" from the Inventory export/import menu; remove Restore
  Preview / Review Changes modal markup (confirm these modals aren't reused
  by plain ZIP/JSON restore — if `diff-modal.js` reuses the same modal shell
  for ordinary import review, keep the shell and only strip the
  vault-password path).
- `js/settings.js`, `js/settings-listeners.js`, `js/events.js`, `js/init.js`,
  `js/state.js` — remove Cloud tab registration, Dropbox listeners, and
  vault import/export menu entries.
- `js/constants.js` — remove Dropbox tokens / vault keys from
  `ALLOWED_STORAGE_KEYS` and any `cleanupStorage()` whitelist.
- `js/diff-engine.js`, `js/diff-modal.js`, `js/diff-modal-settings.js`,
  `js/changeLog.js`, `js/priceHistory.js`, `js/market-data.js`, `js/retail.js`,
  `js/api-health.js`, `js/spot.js` — each references `cloud-sync`; confirm
  these are sync-status hooks (safe to strip) and not shared diff/changelog
  infrastructure also used by plain import (which stays).

## 5. Multi-Currency

**Remove:** Display currency selector, Open Exchange Rates integration, 24h
price-comparison basis picker. **Result:** fixed GBP everywhere, no dropdown.

- `index.html` — collapse Settings → Currency panel to a static "GBP" label;
  remove the currency `<select>`.
- `js/constants.js` — remove currency list / exchange-rate storage keys from
  `ALLOWED_STORAGE_KEYS`.
- `js/settings.js`, `js/settings-listeners.js` — remove the currency-switch
  handler.
- `js/api.js`, `js/spotLookup.js`, `js/market-data.js`, `js/spot.js`,
  `js/utils-format.js` — these already do GBP formatting for this user's
  data; strip the Open Exchange Rates fetch call and any non-GBP branch,
  leave the GBP formatting path as the only path.
- `js/csv-export.js`, `js/inventory.js`, `js/inventory-import.js`,
  `js/inventory-backup.js`, `js/card-view.js`, `js/detailsModal.js`,
  `js/viewModal.js`, `js/market-charts.js`, `js/charts.js`, `js/retail.js`,
  `js/about.js`, `js/goldback.js`(deleted), `js/diff-engine.js`,
  `js/diff-modal.js`, `js/changeLog.js`, `js/bulkEdit.js`(deleted),
  `js/inventory-table.js`, `js/init.js`, `js/state.js` — each has a
  `currency` string reference; audit is whether it's a live-switch branch
  (remove) or just a "£" label/format helper (keep as-is, now the only
  path).

## 6. Bulk Editor & Full Change Log

**Remove:** Bulk Editor multi-select batch tool; Catalog API history tab and
Cloud log tab from the Activity Log; per-field undo log grid.
**Result:** Activity Log modal has exactly two tabs — Changelog and Spot
Price history.

- `js/bulkEdit.js`, `js/bulk-row-images.js`, `js/bulk-image-cache.js` —
  delete whole files (Phase 0).
- `index.html` — remove "Open Bulk Editor" button from Settings →
  Inventory; remove the Bulk Editor modal markup; remove the Catalog/Cloud
  tab headers from the Activity Log modal.
- `js/events.js`, `js/init.js` — remove Bulk Editor button wiring and modal
  bootstrap (both matched `bulkEdit` in grep — these are the entry points).
- `js/changeLog.js` — simplify tab list to `["changelog", "spotPrice"]`;
  remove the Catalog API history and Cloud log tab renderers and the
  per-field undo grid renderer.

## 7. Other Removals

**Remove:** PDF export report; "Breakdown by Purchase Location" chart/modal.
**Keep:** "Breakdown by Type" (fold into per-owner summary if that's
cleaner, otherwise leave as its own tile).

- `js/inventory.js` — remove `buildInventoryPDF()`/`generatePDF` and the
  `window.jspdf` usage block (confirmed at line ~2484–2495: `jsPDF` doc
  builder for the printable report).
- `vendor/jspdf.umd.min.js`, `vendor/jspdf.plugin.autotable.min.js` —
  delete once confirmed unused elsewhere.
- `index.html` — remove "Export PDF" option from the Export menu.
- `js/detailsModal.js` — this is the actual home of the location-breakdown
  chart (confirmed): remove the `locationChart` panel, its title
  ("Breakdown by Purchase Location"), and the `createPieChart(...)` call
  that builds it (~lines 265, 304–306); keep the metal-breakdown chart in
  the same file untouched.
- `js/init.js`, `js/state.js` — remove `elements.locationChart` /
  `chartInstances.locationChart` references (`init.js:438`, `state.js:26,143`).
- CSS: after the tile is removed, confirm the summary grid reflows without a
  manual layout fix (spec says it should — this is a smoke-test item, not a
  CSS rewrite).

---

## Explicitly kept (do not touch)

Serial/Cert #, Type, Metal, Name, Year, Purity, Weight (oz/g/kg/lb),
Quantity, Purchase Date, Purchase Price (each/lot), Payment Method,
Purchase/Storage Location, Retail Price, Notes, Tags, Images, live spot
prices, item table + sort/filter, disposal tracking, CSV/JSON/ZIP
import-export, Owner field, Digital Gold metal type, Order ID field,
Breakdown by Type chart, spot-ratio chip calculator.

---

## Suggested PR sequencing (per `AGENTS.md`: one Plane issue + worktree + PR each)

1. **PR 1 — Grading & Catalog lookup** (Phase 1): highest file-count but
   mostly deletions of clearly-scoped code.
2. **PR 2 — Catalog/descriptive metadata + Capsule** (Phase 2): pure field
   removal, low risk, no deleted files.
3. **PR 3 — Constitutional & Goldback** (Phase 3): deletes `goldback.js`,
   touches pricing/ticker code — needs the most manual QA of the market
   cards after.
4. **PR 4 — Cloud sync & encrypted backup** (Phase 4): largest deletion by
   line count (~8,200 lines across cloud-sync/cloud-storage/vault-crypto);
   isolated enough to be low-risk once entry points are cut.
5. **PR 5 — Multi-currency** (Phase 5): small diff, but touches many
   formatting call sites — do this after cloud/goldback so `currency` grep
   noise from those files is already gone.
6. **PR 6 — Bulk Editor & Activity Log tabs** (Phase 6): deletes
   `bulkEdit.js` + image-cache helpers; simplifies `changeLog.js`.
7. **PR 7 — PDF export & location chart** (Phase 7): smallest, do last as a
   cleanup pass; also drop the two now-orphaned vendor libs.
8. **PR 8 — Global housekeeping**: final `ALLOWED_STORAGE_KEYS` sweep in
   `js/constants.js`, `cleanupStorage()` check, `js/about.js` "what's new"
   note, README/docs mention of the Vault fork, `tests/playwright/coverage-map.csv`
   update reflecting every removed/adjusted spec.

## Per-PR checklist

- [ ] Repo search for the feature's grep terms returns zero hits outside
      `CHANGELOG.md`/docs.
- [ ] `npm run lint` clean.
- [ ] Remove/adjust the matching Playwright specs (search
      `tests/playwright/**` for the same grep terms first; update
      `tests/playwright/coverage-map.csv`).
- [ ] `npm run test:core` passes.
- [ ] Manual check: Add/Edit Item modal has no dead gaps where a removed row
      used to be.
- [ ] Manual check: Settings page reflects the removed tabs/entries.
- [ ] STRK Plane issue ID in commit message + PR body; PR opened against
      `dev`, never pushed directly.

## Not yet verified (needs a pass before coding starts)

- Whether `diff-modal.js`'s "Restore Preview / Review Changes" UI is
  vault-specific or shared with plain ZIP/JSON restore — confirm before
  deleting any of its modal shell in Phase 4.
- Whether `Breakdown by Type` should be folded into the per-owner summary or
  left as its own tile — spec allows either; pick one before touching
  `detailsModal.js` layout.
- Full field-by-field confirmation that every row in Phase 1/2's field list
  (Country, Denomination, Composition, etc.) actually exists in
  `js/constants.js`'s field registry under those exact keys — the grep above
  found the *modules* that reference metadata fields generically but not a
  field-by-field key inventory.
