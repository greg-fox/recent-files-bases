import { DEFAULT_SETTINGS, type RecentFilesBasesSettings } from "./settings";
import type { PluginData, RecentFileEntry } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown, fallback: string[]): string[] {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : fallback;
}

/** Coerces whatever was stored in data.json into valid settings, falling back per field. */
export function sanitizeSettings(raw: unknown): RecentFilesBasesSettings {
	const input = isRecord(raw) ? raw : {};
	const max = Number(input.maxTrackedFiles);
	return {
		maxTrackedFiles: Number.isInteger(max) && max > 0 ? max : DEFAULT_SETTINGS.maxTrackedFiles,
		updateOn: input.updateOn === "file-edit" || input.updateOn === "file-open" ? input.updateOn : DEFAULT_SETTINGS.updateOn,
		omittedPathPatterns: stringArray(input.omittedPathPatterns, [...DEFAULT_SETTINGS.omittedPathPatterns]),
		omittedTagPatterns: stringArray(input.omittedTagPatterns, [...DEFAULT_SETTINGS.omittedTagPatterns]),
	};
}

function isRecentFileEntry(value: unknown): value is RecentFileEntry {
	return (
		isRecord(value) &&
		typeof value.path === "string" &&
		typeof value.basename === "string" &&
		typeof value.openedAtMs === "number" &&
		Number.isFinite(value.openedAtMs)
	);
}

/** Keeps only well-formed recent-file entries, de-duplicated by path (first occurrence wins). */
export function sanitizePluginData(raw: unknown): PluginData {
	const input = isRecord(raw) ? raw : {};
	const entries = Array.isArray(input.recentFiles) ? input.recentFiles.filter(isRecentFileEntry) : [];
	const seen = new Set<string>();
	const recentFiles = entries.filter((entry) => {
		if (seen.has(entry.path)) return false;
		seen.add(entry.path);
		return true;
	});
	return { recentFiles };
}
