# Changelog

All notable changes to this plugin are documented here. Versions follow [Semantic Versioning](https://semver.org/), and each version matches a GitHub release tag.

## [Unreleased]

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
