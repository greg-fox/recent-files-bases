# Changelog

All notable changes to this plugin are documented here. Versions follow [Semantic Versioning](https://semver.org/), and each version matches a GitHub release tag.

## [Unreleased]

### Added

- **Show last opened** view option that adds a relative timestamp to each row. Timestamps refresh once a minute while the view is visible.
- Right-click opens the standard file menu, and entries can be dragged into notes as links.
- Invalid regular expressions in exclusion settings are listed under the setting.

### Changed

- Property values render with Bases' native renderer (clickable links, tags, dates).
- **Max items** caps the whole view instead of each group separately.
- Default **Max tracked files** raised from 50 to 500.
- **File edited** tracking only counts edits to the active file.

### Fixed

- Open views refresh as soon as the recent list changes.
- Editing exclusion patterns no longer deletes history; exclusions apply when the list is read.
- Middle-click opens entries in a new tab.
- Comma- or space-separated and `#`-prefixed frontmatter tags are matched by tag exclusions.
- Lowering **Max tracked files** trims the list immediately.
- Rows stay clickable when **file name** is hidden.
- Malformed data in `data.json` falls back to defaults instead of breaking the plugin.
- Renaming or deleting untracked files no longer rewrites the plugin's data file.

## [1.0.0]

Initial release.

### Added

- **Recent files** Bases view type, available from the view menu of any `.base` file.
- The view lists files that are both recently opened and matched by the Base's filters, ordered by recency.
- Respects the Base's grouping and selected properties.
- **Max items** view option to cap the number of entries shown.
- Click to open, Cmd/Ctrl-click to open in a new tab, and hover for a link preview.
- Settings for **Max tracked files**, **Track recency on** (file opened or file edited), **Omitted path patterns**, **Omitted tag patterns**, and **Omit bookmarked files**.
- Recency is stored in the plugin's own data file. The plugin never writes to notes.

[Unreleased]: https://github.com/greg-fox/recent-files-bases/compare/1.0.0...HEAD
[1.0.0]: https://github.com/greg-fox/recent-files-bases/releases/tag/1.0.0
