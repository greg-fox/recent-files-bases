import { describe, expect, it } from "vitest";
import { sanitizePluginData, sanitizeSettings } from "./persistence";
import { DEFAULT_SETTINGS } from "./settings";

describe("sanitizeSettings", () => {
	it("returns defaults for missing or non-object input", () => {
		expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
		expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
		expect(sanitizeSettings("nope")).toEqual(DEFAULT_SETTINGS);
	});

	it("keeps valid stored values", () => {
		const stored = {
			maxTrackedFiles: 10,
			updateOn: "file-edit",
			omittedPathPatterns: ["^daily/"],
			omittedTagPatterns: ["^archive$"],
		};
		expect(sanitizeSettings(stored)).toEqual(stored);
	});

	it("drops settings that no longer exist, such as omitBookmarkedFiles", () => {
		expect(sanitizeSettings({ omitBookmarkedFiles: true })).toEqual(DEFAULT_SETTINGS);
	});

	it("falls back per field on bad values", () => {
		const result = sanitizeSettings({
			maxTrackedFiles: "lots",
			updateOn: "sometimes",
			omittedPathPatterns: "^daily/",
			omittedTagPatterns: ["ok", 3],
		});
		expect(result).toEqual({ ...DEFAULT_SETTINGS, omittedTagPatterns: ["ok"] });
	});

	it("rejects zero, negative, and fractional max tracked files", () => {
		expect(sanitizeSettings({ maxTrackedFiles: 0 }).maxTrackedFiles).toBe(DEFAULT_SETTINGS.maxTrackedFiles);
		expect(sanitizeSettings({ maxTrackedFiles: -5 }).maxTrackedFiles).toBe(DEFAULT_SETTINGS.maxTrackedFiles);
		expect(sanitizeSettings({ maxTrackedFiles: 2.5 }).maxTrackedFiles).toBe(DEFAULT_SETTINGS.maxTrackedFiles);
	});
});

describe("sanitizePluginData", () => {
	it("returns an empty list for missing input", () => {
		expect(sanitizePluginData(undefined)).toEqual({ recentFiles: [] });
		expect(sanitizePluginData({ recentFiles: "x" })).toEqual({ recentFiles: [] });
	});

	it("drops malformed entries and de-duplicates by path", () => {
		const good = { path: "a.md", basename: "a", openedAtMs: 2 };
		const result = sanitizePluginData({
			recentFiles: [good, { path: "b.md" }, null, { ...good, openedAtMs: 1 }, { path: "c.md", basename: "c", openedAtMs: NaN }],
		});
		expect(result).toEqual({ recentFiles: [good] });
	});
});
