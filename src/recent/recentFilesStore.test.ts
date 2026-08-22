import { describe, expect, it } from "vitest";
import { RecentFilesStore } from "./recentFilesStore";
import type { RecentFileEntry } from "../types";

describe("RecentFilesStore", () => {
	it("adds to front and de-dupes by path", () => {
		let now = 1000;
		const store = new RecentFilesStore({ maxLength: 10, nowMs: () => now });

		let entries: RecentFileEntry[] = [];
		entries = store.add(entries, { path: "a.md", basename: "a" });
		now = 2000;
		entries = store.add(entries, { path: "b.md", basename: "b" });
		now = 3000;
		entries = store.add(entries, { path: "a.md", basename: "a" });

		expect(entries.map((e) => e.path)).toEqual(["a.md", "b.md"]);
		expect(entries[0]?.openedAtMs).toBe(3000);
	});

	it("prunes to maxLength", () => {
		let now = 1;
		const store = new RecentFilesStore({ maxLength: 2, nowMs: () => now++ });

		let entries: RecentFileEntry[] = [];
		entries = store.add(entries, { path: "a.md", basename: "a" });
		entries = store.add(entries, { path: "b.md", basename: "b" });
		entries = store.add(entries, { path: "c.md", basename: "c" });

		expect(entries.map((e) => e.path)).toEqual(["c.md", "b.md"]);
	});

	it("removes by path", () => {
		const store = new RecentFilesStore({ maxLength: 10, nowMs: () => 1 });
		const entries: RecentFileEntry[] = [
			{ path: "a.md", basename: "a", openedAtMs: 1 },
			{ path: "b.md", basename: "b", openedAtMs: 2 },
		];

		expect(store.remove(entries, "a.md").map((e) => e.path)).toEqual(["b.md"]);
	});

	it("renames an entry", () => {
		const store = new RecentFilesStore({ maxLength: 10, nowMs: () => 1 });
		const entries: RecentFileEntry[] = [{ path: "a.md", basename: "a", openedAtMs: 1 }];

		const renamed = store.rename(entries, "a.md", "renamed.md", "renamed");
		expect(renamed).toEqual([{ path: "renamed.md", basename: "renamed", openedAtMs: 1 }]);
	});
});

