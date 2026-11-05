# Recent Files Bases

An [Obsidian](https://obsidian.md) plugin that adds a custom [Bases](https://help.obsidian.md/bases) view listing your recently opened files, in list format.

## What it does

The plugin tracks the files you open (or, optionally, edit) in a small internal list, most-recent-first. It registers a new Bases view type, **Recent files**, that you can select from the view menu of any `.base` file. That view:

- Shows only files that are both in your recent list **and** pass the Base's own filters. Point a Base at a folder, tag, or property filter, add the Recent files view, and you get a recency-ordered list scoped to that filter.
- Sorts strictly by recency, most recent first, regardless of the Base's configured sort.
- Displays whichever properties you've selected in the Base's Properties menu, same as other Bases views.
- Supports a per-view **Max items per group** slider (view options, top-right of the Bases toolbar) to cap how many entries are shown. When the Base is grouped, the cap applies to each group separately, so a view with 3 groups and a cap of 10 can show up to 30 entries.
- Optional **Show last opened** toggle (view options) adds a relative timestamp to each row, such as "5m ago". Hover it for the full date and time.
- Links open on click; Cmd/Ctrl-click (or middle-click) opens in a new tab, and hovering shows Obsidian's native link preview.

The plugin does not write anything to your notes. Recency is tracked internally in the plugin's own data file, not in file frontmatter.

## Settings

- **Max tracked files** — how many recently opened files the plugin remembers in total (default 500). Every Base filters this one shared list, so a Base scoped to a single folder shows only the tracked files in that folder, which can be fewer than its **Max items** slider allows.
- **Track recency on** — update the list when a file is opened, or when its content changes.
- **Omitted path patterns** / **Omitted tag patterns** — regular expressions (one per line); matching files are never tracked.
- **Omit bookmarked files** — skip files that are bookmarked.

## Development

```bash
npm install
npm run dev      # watch mode
npm run build    # typecheck + production bundle
npm run lint
npm run test          # unit tests
npm run test:coverage # unit tests with coverage report
```

Source lives in `src/`. Pure logic (the recency store, exclusion rules, tag/bookmark lookups, recency ordering) is split out from the Obsidian-runtime glue (`main.ts`, `src/ui/`, `src/bases/recentFilesBasesView.ts`) so it can be unit tested outside a live Obsidian instance; the runtime-glue files are excluded from the coverage report for the same reason (see `vitest.config.ts`).

## Manually installing

Copy `main.js`, `styles.css`, and `manifest.json` to `<Vault>/.obsidian/plugins/recent-files-bases/`, then enable the plugin under **Settings → Community plugins**.

## Prior art

[recent-files-obsidian](https://github.com/tgrosinger/recent-files-obsidian) provides a similar recent-files list as a sidebar panel rather than a Bases view; its settings shape (path/tag/bookmark exclusion, open-vs-edit tracking) informed this plugin's settings.
