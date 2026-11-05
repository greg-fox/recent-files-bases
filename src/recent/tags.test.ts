import { afterEach, describe, expect, it, vi } from "vitest";
import * as obsidian from "obsidian";
import type { App, CachedMetadata, TFile } from "obsidian";
import { getFileTags } from "./tags";

// Frontmatter parsing is Obsidian's job (getAllTags); these tests cover only what this module adds.
const getAllTags = vi.spyOn(obsidian, "getAllTags");

function fakeApp(fileCache: CachedMetadata | null): App {
	return { metadataCache: { getFileCache: () => fileCache } } as unknown as App;
}

// eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast -- test double; getFileTags only reads app.metadataCache, never the file itself
const file = {} as TFile;

afterEach(() => {
	getAllTags.mockReset();
});

describe("getFileTags", () => {
	it("returns an empty array when there is no cache, without calling getAllTags", () => {
		expect(getFileTags(fakeApp(null), file)).toEqual([]);
		expect(getAllTags).not.toHaveBeenCalled();
	});

	it("returns an empty array when getAllTags returns null", () => {
		getAllTags.mockReturnValue(null);
		expect(getFileTags(fakeApp({}), file)).toEqual([]);
	});

	it("passes the file cache to getAllTags", () => {
		const cache: CachedMetadata = { frontmatter: { tags: "project" } };
		getAllTags.mockReturnValue([]);
		getFileTags(fakeApp(cache), file);
		expect(getAllTags).toHaveBeenCalledWith(cache);
	});

	it("strips the leading # from every tag", () => {
		getAllTags.mockReturnValue(["#project", "#area/work"]);
		expect(getFileTags(fakeApp({}), file)).toEqual(["project", "area/work"]);
	});

	it("de-duplicates tags found in both frontmatter and body", () => {
		getAllTags.mockReturnValue(["#todo", "#project", "#todo"]);
		expect(getFileTags(fakeApp({}), file)).toEqual(["todo", "project"]);
	});
});
