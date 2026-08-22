import type { App, TFile } from "obsidian";

/** Frontmatter and inline tags for a file, normalized without a leading "#". */
export function getFileTags(app: App, file: TFile): string[] {
	const cache = app.metadataCache.getFileCache(file);

	const frontmatterTags = cache?.frontmatter?.tags as string | string[] | undefined;
	const fromFrontmatter = Array.isArray(frontmatterTags)
		? frontmatterTags.map(String)
		: frontmatterTags
			? [String(frontmatterTags)]
			: [];

	const fromInline = (cache?.tags ?? []).map((t) => t.tag.replace(/^#/, ""));

	return [...fromFrontmatter, ...fromInline];
}
