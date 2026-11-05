import type { App, TFile } from "obsidian";

/**
 * Splits a raw frontmatter tag value into individual tags. Obsidian accepts a YAML list,
 * a single string, or a comma/space separated string, with or without a leading "#".
 */
function normalizeFrontmatterTags(raw: unknown): string[] {
	const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
	return values
		.flatMap((value) => String(value).split(/[,\s]+/))
		.map((tag) => tag.trim().replace(/^#/, ""))
		.filter((tag) => tag.length > 0);
}

/**
 * Frontmatter and inline tags for a file, normalized without a leading "#" and de-duplicated.
 * Mirrors Obsidian's `getAllTags`, which is not used directly so this stays testable outside Obsidian.
 */
export function getFileTags(app: App, file: TFile): string[] {
	const cache = app.metadataCache.getFileCache(file);
	const frontmatter = cache?.frontmatter as Record<string, unknown> | undefined;

	const fromFrontmatter = [
		...normalizeFrontmatterTags(frontmatter?.tags),
		...normalizeFrontmatterTags(frontmatter?.tag),
	];
	const fromInline = (cache?.tags ?? []).map((t) => t.tag.replace(/^#/, ""));

	return [...new Set([...fromFrontmatter, ...fromInline])];
}
