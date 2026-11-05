import { getAllTags, type App, type TFile } from "obsidian";

/**
 * Frontmatter and inline tags for a file, without the leading "#" and de-duplicated.
 * Obsidian's `getAllTags` handles every frontmatter format (lists, comma or space separated
 * strings, the `tag` key) and returns tags with a "#" prefix.
 */
export function getFileTags(app: App, file: TFile): string[] {
	const cache = app.metadataCache.getFileCache(file);
	if (!cache) return [];
	const tags = getAllTags(cache) ?? [];
	return [...new Set(tags.map((tag) => tag.replace(/^#/, "")))];
}
