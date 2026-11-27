# Changelog

All notable changes to this plugin are documented here. Versions follow [Semantic Versioning](https://semver.org/), and each version matches a GitHub release tag.

## [Unreleased]

## [1.0.1]

### Added

- All plugin settings (**Max tracked files**, **Track recency on**, **Omitted path patterns**, **Omitted tag patterns**, and **Clear history**) now appear in Obsidian's settings search on Obsidian 1.13.0 and later. Older versions keep the existing settings tab.
- Release assets (`main.js`, `manifest.json`, `styles.css`) include signed GitHub build provenance attestations. Verify a download with `gh attestation verify main.js --repo greg-fox/recent-files-bases`.

### Changed

- Destructive buttons (**Clear history** and its confirmation) use Obsidian's destructive button style on 1.13.0 and later.

## [1.0.0]

Initial release.

### Added

- **Recent files** Bases view type, available from the view menu of any `.base` file.
- The view lists files that are both recently opened and matched by the Base's filters, ordered by recency.
- Respects the Base's grouping and selected properties. Property values render with Bases' native renderer (clickable links, tags, dates).
- **Max items** view option to cap the number of entries shown. The cap applies to the whole view, not to each group separately.
- **Show last opened** view option that adds a relative timestamp to each row. Timestamps refresh once a minute while the view is visible.
- Click to open, Cmd/Ctrl-click or middle-click to open in a new tab, and hover for a link preview. Rows stay clickable when **file name** is hidden.
- Right-click opens the standard file menu, and entries can be dragged into notes as links.
- Open views refresh as soon as the recent list changes.
- Settings for **Max tracked files** (default 500), **Track recency on** (file opened, or edits to the active file), **Omitted path patterns**, and **Omitted tag patterns**.
- Exclusion patterns apply when the list is read, so editing them never deletes history. Invalid regular expressions are listed under the setting.
- Tag exclusions use Obsidian's `getAllTags`, so every frontmatter tag format is matched.
- Lowering **Max tracked files** trims the list immediately.
- **Clear history** setting, with a confirmation dialog, to empty the recent list.
- Recency is stored in the plugin's own data file. The plugin never writes to notes.
- Changes to the recent list are written to disk in one batch about two seconds after the last change, and immediately when the app is hidden or the plugin unloads. This reduces disk writes and Sync uploads when opening several notes in a row.
- Renaming or deleting untracked files does not rewrite the plugin's data file.
- Malformed data in `data.json` falls back to defaults instead of breaking the plugin.
- When Obsidian is too old to support plugin Bases views, a notice says so.

[Unreleased]: https://github.com/greg-fox/recent-files-bases/compare/1.0.1...HEAD
[1.0.1]: https://github.com/greg-fox/recent-files-bases/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/greg-fox/recent-files-bases/releases/tag/1.0.0
