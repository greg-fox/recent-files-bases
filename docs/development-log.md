# Development log

Working notes from building the plugin, kept for reference. For user-facing release notes, see [CHANGELOG.md](../CHANGELOG.md).

## 2026-03-26 22:26

- Initialized work log for the plugin.

## 2026-03-26 22:30

- Replaced sample plugin behavior with a “Recent files → Bases” implementation skeleton.
- Added settings for recent list size, frontmatter stamping, and base filename.
- Added commands to generate/open a `.base` file that lists recently opened notes.
- Added modules for recent list storage, base template generation, and unique-path creation.
- Added unit tests (Vitest) for recent list logic and base YAML generation.

## 2026-03-26 22:41

- Removed commands for creating/opening a generated `.base` file.
- Registered a custom Bases view type named “Recent Files”.

## 2026-03-26 22:47

- Fixed plugin startup failure by calling `registerBasesView` with bound plugin context (`this.registerBasesView(...)`).
- Removed duplicate experimental Base registration from `main.ts` and kept only the “Recent Files” registration path.

## 2026-03-26 22:53

- Updated the Recent Files base view render logic to filter Base query entries using the plugin's tracked recent file paths.

## 2026-08-22 (rewrite from scratch)

- Reviewed the real `obsidian` package types (Bases API is present as of 1.10.0), the official Bases-view guide (`docs.obsidian.md/plugins/guides/bases-view`), and `tgrosinger/recent-files-obsidian` as prior art before redesigning.
- Removed the frontmatter-timestamp-stamping feature entirely; the plugin no longer writes to vault files. Recency is tracked only in the plugin's own data file.
- Rebuilt `src/` from scratch with pure logic separated from Obsidian-runtime glue, so nearly everything is unit-testable without a live Obsidian instance:
  - `recent/recentFilesStore.ts` — add/remove/rename/prune the tracked list.
  - `recent/exclusionRules.ts` — path-regex, tag-regex, and bookmark exclusion, pure.
  - `recent/tags.ts`, `recent/bookmarks.ts` — thin adapters reading frontmatter/inline tags and the Bookmarks core plugin's internal (undocumented) item tree, defensively.
  - `bases/orderByRecency.ts` — orders a Base query's already-filtered entries by tracked recency and caps them, pure and Obsidian-independent.
  - `bases/maxItemsOption.ts` — resolves/clamps the per-view "Max items" option.
  - `bases/recentFilesBasesView.ts` — the actual `BasesView` subclass and its registration, including a `Max items` slider view option, group support, hover-link preview, and mod-click-to-open-in-new-tab, following the official guide's pattern.
  - `settings.ts` (interface + defaults, pure) / `ui/settingsTab.ts` (the `PluginSettingTab`, runtime) — settings for max tracked files, update trigger (open vs. edit), omitted path/tag patterns, and omit-bookmarked-files, matching `recent-files-obsidian`'s settings shape per user request for "full parity" on exclusion filters.
  - `main.ts` — lifecycle only: tracks `file-open` or debounced `modify` events per the `updateOn` setting, prunes on rename/delete, re-prunes excluded files when exclusion settings change.
- Excluded from the vitest coverage report: `main.ts`, `src/ui/**`, `src/bases/recentFilesBasesView.ts`, `src/types.ts` — none have executable logic that can run outside a live Obsidian app or a real DOM; the logic they call into is fully tested instead.
- Added `settings.test.ts`, `recent/exclusionRules.test.ts`, `recent/tags.test.ts`, `recent/bookmarks.test.ts`, `bases/orderByRecency.test.ts`, `bases/maxItemsOption.test.ts`; kept and extended `recent/recentFilesStore.test.ts`. 40 tests passing, 100% statement/branch/function/line coverage on everything included in the report.
- Bumped `manifest.json`/`versions.json` `minAppVersion` to `1.10.0` (Bases API requirement); updated `package.json` name/description off the sample-plugin defaults.
- Rewrote `README.md` (was still sample-plugin boilerplate) to describe the actual plugin.
- Reinstalled `node_modules` to work around an unrelated npm optional-dependency bug (`@rollup/rollup-darwin-arm64` missing) that was blocking `vitest`.
- Verified: `tsc -noEmit`, `eslint .`, `vitest run --coverage`, and `npm run build` all pass clean.
