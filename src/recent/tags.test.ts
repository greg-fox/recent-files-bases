import { describe, expect, it } from "vitest";
import type { App, TFile } from "obsidian";
import { getFileTags } from "./tags";

function fakeApp(fileCache: unknown): App {
	return {
		metadataCache: {
			getFileCache: () => fileCache,
		},
	} as unknown as App;
}

// eslint-disable-next-line obsidianmd/no-tfile-tfolder-cast -- test double; getFileTags only reads app.metadataCache, never the file itself
const file = {} as TFile;

describe("getFileTags", () => {
	it("returns an empty array when there is no cache", () => {
		expect(getFileTags(fakeApp(null), file)).toEqual([]);
	});

	it("returns an empty array when frontmatter has no tags", () => {
		expect(getFileTags(fakeApp({ frontmatter: {} }), file)).toEqual([]);
	});

	it("normalizes a single string frontmatter tag into an array", () => {
		expect(getFileTags(fakeApp({ frontmatter: { tags: "project" } }), file)).toEqual(["project"]);
	});

	it("passes through an array of frontmatter tags", () => {
		expect(getFileTags(fakeApp({ frontmatter: { tags: ["project", "todo"] } }), file)).toEqual([
			"project",
			"todo",
		]);
	});

	it("includes inline tags with the leading # stripped", () => {
		const cache = { frontmatter: { tags: "project" }, tags: [{ tag: "#todo" }, { tag: "#urgent" }] };
		expect(getFileTags(fakeApp(cache), file)).toEqual(["project", "todo", "urgent"]);
	});
});
