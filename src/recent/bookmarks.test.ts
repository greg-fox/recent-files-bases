import { describe, expect, it } from "vitest";
import type { App } from "obsidian";
import { getBookmarkedPaths } from "./bookmarks";

function fakeApp(getEnabledPluginById: (id: string) => unknown): App {
	return { internalPlugins: { getEnabledPluginById } } as unknown as App;
}

describe("getBookmarkedPaths", () => {
	it("returns an empty set when the bookmarks plugin is not enabled", () => {
		const app = fakeApp(() => null);
		expect(getBookmarkedPaths(app)).toEqual(new Set());
	});

	it("collects top-level bookmarked file paths", () => {
		const app = fakeApp(() => ({ items: [{ path: "a.md" }, { path: "b.md" }] }));
		expect(getBookmarkedPaths(app)).toEqual(new Set(["a.md", "b.md"]));
	});

	it("recurses into bookmark groups", () => {
		const app = fakeApp(() => ({
			items: [{ path: "a.md" }, { items: [{ path: "b.md" }, { items: [{ path: "c.md" }] }] }],
		}));
		expect(getBookmarkedPaths(app)).toEqual(new Set(["a.md", "b.md", "c.md"]));
	});

	it("skips group items without a path", () => {
		const app = fakeApp(() => ({ items: [{ items: [{ path: "b.md" }] }] }));
		expect(getBookmarkedPaths(app)).toEqual(new Set(["b.md"]));
	});

	it("returns an empty set when the plugin has no items array", () => {
		const app = fakeApp(() => ({}));
		expect(getBookmarkedPaths(app)).toEqual(new Set());
	});

	it("returns an empty set instead of throwing when internalPlugins has an unexpected shape", () => {
		const app = { internalPlugins: undefined } as unknown as App;
		expect(getBookmarkedPaths(app)).toEqual(new Set());
	});

	it("returns an empty set when getEnabledPluginById throws", () => {
		const app = fakeApp(() => {
			throw new Error("boom");
		});
		expect(getBookmarkedPaths(app)).toEqual(new Set());
	});
});
