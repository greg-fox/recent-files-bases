import type { App, TFile } from "obsidian";

export async function stampFrontmatterOpenedAt(app: App, file: TFile, key: string, openedAtMs: number): Promise<void> {
	// Only markdown files have frontmatter; callers should already enforce this, but keep it safe.
	if (file.extension !== "md") return;

	await app.fileManager.processFrontMatter(file, (fm) => {
		(fm as Record<string, unknown>)[key] = openedAtMs;
	});
}

