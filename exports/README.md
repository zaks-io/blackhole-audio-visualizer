# Production configuration export

Captured September 9, 2026 from the production deployment `healthy-shark-885`
with Convex CLI 1.45.0 using the official
[`convex export --prod`](https://docs.convex.dev/cli/reference/export) command.
Snapshot timestamp: `1788968745491268198`.

- `production-config-2026-09-09.json` preserves all 128 presets and 17 playlists.
- `unsupported-presets-2026-09-09.json` records the validation failures for 51 legacy
  presets. They reference the removed `Skybox.starLensingStrength` parameter or
  undefined color palettes. No compatibility behavior was added.
- `../apps/web/config/presets.json` starts with the 77 supported presets and all 17
  playlists. The app imports this file directly; exports are not bundled.

The configuration preserves names, parameters, values, timing, palettes, camera
settings, and playlist items. `_id` becomes `id`; ownership, visibility, creation
time, and update metadata are omitted because they have no consumer in the local
app. No user account records, credentials, generated media, or conversations are
included. The full raw ZIP snapshot is retained outside the repository.

The original playlists contain 31 references to deleted presets across seven
playlists. References to unsupported archived presets are also unresolved in the
bundled collection. All item references remain intact. The editor shows unavailable
entries and prevents playback until they are removed.

SHA-256 hashes of the original snapshot JSONL records:

| Table     | SHA-256                                                            |
| --------- | ------------------------------------------------------------------ |
| presets   | `ef9e8ce4ee5808b7c9b40b51ddd55450bfe03b08324efa681bc099707fd04719` |
| playlists | `aaf2b0435e16d9446ab957d675a9f5d399248c3d8f6b068dc2f8f3f6dd86d017` |

Subsequent changes belong in `apps/web/config/presets.json`. Keep this export
archive unchanged as the record of the migration.
