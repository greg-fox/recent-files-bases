export type RecentFilesUpdateTrigger = "file-open" | "file-edit";

export interface RecentFilesBasesSettings {
	/** How many recently opened files the plugin remembers, across all Bases views. */
	maxTrackedFiles: number;

	/** Whether the recent list updates when a file is opened, or when its content changes. */
	updateOn: RecentFilesUpdateTrigger;

	/** Regex patterns (one per line in settings UI); matching paths are never tracked. */
	omittedPathPatterns: string[];

	/** Regex patterns (one per line in settings UI); files with a matching tag are never tracked. */
	omittedTagPatterns: string[];

	/** If true, bookmarked files are never tracked. */
	omitBookmarkedFiles: boolean;
}

export const DEFAULT_SETTINGS: RecentFilesBasesSettings = {
	maxTrackedFiles: 50,
	updateOn: "file-open",
	omittedPathPatterns: [],
	omittedTagPatterns: [],
	omitBookmarkedFiles: false,
};
