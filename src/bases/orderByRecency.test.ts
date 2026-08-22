import { describe, expect, it } from "vitest";
import { orderByRecency } from "./orderByRecency";

interface Item {
	path: string;
	label: string;
}

const getPath = (item: Item) => item.path;

describe("orderByRecency", () => {
	it("orders items by recency, most recent first", () => {
		const recentFiles = [{ path: "b.md" }, { path: "a.md" }, { path: "c.md" }];
		const items: Item[] = [
			{ path: "a.md", label: "a" },
			{ path: "b.md", label: "b" },
			{ path: "c.md", label: "c" },
		];

		expect(orderByRecency(recentFiles, items, getPath, 10).map((i) => i.path)).toEqual([
			"b.md",
			"a.md",
			"c.md",
		]);
	});

	it("excludes items that aren't in the recency list", () => {
		const recentFiles = [{ path: "a.md" }];
		const items: Item[] = [
			{ path: "a.md", label: "a" },
			{ path: "b.md", label: "b" },
		];

		expect(orderByRecency(recentFiles, items, getPath, 10).map((i) => i.path)).toEqual(["a.md"]);
	});

	it("excludes recent paths that have no matching item (filtered out by the base)", () => {
		const recentFiles = [{ path: "a.md" }, { path: "b.md" }];
		const items: Item[] = [{ path: "a.md", label: "a" }];

		expect(orderByRecency(recentFiles, items, getPath, 10).map((i) => i.path)).toEqual(["a.md"]);
	});

	it("caps the result at maxItems", () => {
		const recentFiles = [{ path: "a.md" }, { path: "b.md" }, { path: "c.md" }];
		const items: Item[] = recentFiles.map((r) => ({ path: r.path, label: r.path }));

		expect(orderByRecency(recentFiles, items, getPath, 2).map((i) => i.path)).toEqual(["a.md", "b.md"]);
	});

	it("keeps the first occurrence when items contains duplicate paths", () => {
		const recentFiles = [{ path: "a.md" }];
		const first: Item = { path: "a.md", label: "first" };
		const second: Item = { path: "a.md", label: "second" };

		expect(orderByRecency(recentFiles, [first, second], getPath, 10)).toEqual([first]);
	});

	it("returns an empty array when there is no overlap", () => {
		expect(orderByRecency([{ path: "a.md" }], [{ path: "b.md", label: "b" }], getPath, 10)).toEqual([]);
	});
});
