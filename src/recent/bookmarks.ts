import type { App } from "obsidian";

interface BookmarkItem {
	path?: string;
	items?: BookmarkItem[];
}

interface BookmarksPluginInstance {
	items: BookmarkItem[];
}

/**
 * The Bookmarks core plugin exposes no public API for reading bookmarked
 * items, so this reaches into the internal plugin registry. Obsidian does
 * not guarantee this shape stays stable across versions, so every access
 * is defensive and falls back to "no bookmarks" rather than throwing.
 */
export function getBookmarkedPaths(app: App): Set<string> {
	try {
		const internalPlugins = (
			app as unknown as {
				internalPlugins?: { getEnabledPluginById?: (id: string) => BookmarksPluginInstance | null };
			}
		).internalPlugins;
		const bookmarksPlugin = internalPlugins?.getEnabledPluginById?.("bookmarks");
		if (!bookmarksPlugin) return new Set();

		const paths = new Set<string>();
		const collect = (items: BookmarkItem[] | undefined) => {
			for (const item of items ?? []) {
				if (item.path) paths.add(item.path);
				if (item.items) collect(item.items);
			}
		};
		collect(bookmarksPlugin.items);
		return paths;
	} catch {
		return new Set();
	}
}
