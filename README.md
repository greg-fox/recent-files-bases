# Recent Files Bases

An [Obsidian](https://obsidian.md) plugin that adds a custom [Bases](https://help.obsidian.md/bases) view listing your recently opened files, in list format.

## What it does

The plugin tracks the files you open (or, optionally, edit) in a small internal list, most-recent-first. It registers a new Bases view type, **Recent files**, that you can select from the view menu of any `.base` file. That view:

- Shows only files that are both in your recent list **and** pass the Base's own filters. Point a Base at a folder, tag, or property filter, add the Recent files view, and you get a recency-ordered list scoped to that filter.
- Sorts strictly by recency, most recent first, regardless of the Base's configured sort.
- Displays whichever properties you've selected in the Base's Properties menu, same as other Bases views.
- Supports a per-view **Max items** slider (view options, top-right of the Bases toolbar) to cap how many entries are shown. The cap applies to the whole view: when the Base is grouped, the most recent entries across all groups are kept.
- Optional **Show last opened** toggle (view options) adds a relative timestamp to each row, such as "5m ago". Hover it for the full date and time. Timestamps refresh once a minute while the view is visible, by updating label text only, with no re-render or vault access.
- Links open on click; Cmd/Ctrl-click (or middle-click) opens in a new tab, and hovering shows Obsidian's native link preview.

The plugin does not write anything to your notes. Recency is tracked internally in the plugin's own data file, not in file frontmatter.

## Settings

- **Max tracked files** — how many recently opened files the plugin remembers in total (default 500). Every Base filters this one shared list, so a Base scoped to a single folder shows only the tracked files in that folder, which can be fewer than its **Max items** slider allows.
- **Track recency on** — update the list when a file is opened, or when its content changes.
- **Omitted path patterns** / **Omitted tag patterns** — regular expressions (one per line); matching files are never tracked.
- **Clear history**: removes every file from the recent list after you confirm. Your notes are not affected.

## Development

```bash
npm install
npm run dev      # watch mode
npm run build    # typecheck + production bundle
npm run lint
npm run test          # unit tests
npm run test:coverage # unit tests with coverage report
```

Source lives in `src/`. Pure logic (the recency store, exclusion rules, tag lookups, recency ordering) is split out from the Obsidian-runtime glue. `main.ts` is tested against a small runtime stub of the `obsidian` package (`src/__mocks__/obsidian.ts`, aliased in `vitest.config.ts`), since the real package ships type definitions only. The DOM-rendering files (`src/ui/`, `src/bases/recentFilesBasesView.ts`) are excluded from the coverage report.

## Releasing

1. Bump `version` in `manifest.json` and add the matching entry to `versions.json` (`npm version <x.y.z>` does both).
2. Move the **Unreleased** notes in `CHANGELOG.md` under the new version.
3. Push a tag that exactly matches the version, with no leading `v`: `git tag 1.0.0 && git push origin 1.0.0`.
4. The **Release Obsidian plugin** workflow checks the tag against `manifest.json` and `versions.json`, runs lint, tests, and the build, then creates a draft GitHub release with `main.js`, `manifest.json`, and `styles.css` attached.
5. Review the draft on GitHub and publish it.

## Manually installing

Copy `main.js`, `styles.css`, and `manifest.json` to `<Vault>/.obsidian/plugins/recent-files-bases/`, then enable the plugin under **Settings → Community plugins**.

## Prior art

[recent-files-obsidian](https://github.com/tgrosinger/recent-files-obsidian) provides a similar recent-files list as a sidebar panel rather than a Bases view; its settings shape (path and tag exclusion, open-vs-edit tracking) informed this plugin's settings.
