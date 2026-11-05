import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TFile, type App, type BasesViewRegistration, type PluginManifest } from "obsidian";
import RecentFilesBasesPlugin from "./main";
import type { RecentFilesSource } from "./bases/recentFilesBasesView";
import { DEFAULT_SETTINGS } from "./settings";

// Capture the source the plugin hands to the view, without rendering any DOM.
const viewSources: RecentFilesSource[] = [];
vi.mock("./bases/recentFilesBasesView", () => ({
	RECENT_FILES_BASES_VIEW_TYPE: "recent-files-list",
	createRecentFilesBasesViewRegistration: (source: RecentFilesSource) => {
		viewSources.push(source);
		return { name: "Recent files" };
	},
}));

type Handler = (...args: unknown[]) => unknown;

// The real TFile type has no public constructor; the test stub takes a path.
const makeFile = (path: string): TFile => new (TFile as unknown as new (path: string) => TFile)(path);

/** A fake App that records event handlers so tests can fire vault/workspace events directly. */
function createHarness(options: { files?: string[]; tags?: Record<string, string[]> } = {}) {
	const handlers = new Map<string, Handler>();
	const files = new Map((options.files ?? []).map((path) => [path, makeFile(path)]));
	let activeFile: TFile | null = null;

	const on = (name: string, handler: Handler) => {
		handlers.set(name, handler);
		return { name };
	};

	const app = {
		workspace: { on, getActiveFile: () => activeFile },
		vault: { on, getFileByPath: (path: string) => files.get(path) ?? null },
		metadataCache: {
			getFileCache: (file: TFile) => ({ frontmatter: { tags: options.tags?.[file.path] ?? [] } }),
		},
	};

	const plugin = new RecentFilesBasesPlugin(app as unknown as App, {} as PluginManifest);
	const registerBasesView = vi.fn<(id: string, registration: BasesViewRegistration) => boolean>(() => true);
	(plugin as unknown as { registerBasesView: typeof registerBasesView }).registerBasesView = registerBasesView;
	const saveData = vi.spyOn(plugin, "saveData");

	return {
		plugin,
		saveData,
		registerBasesView,
		file: (path: string) => {
			const existing = files.get(path);
			if (existing) return existing;
			const created = makeFile(path);
			files.set(path, created);
			return created;
		},
		setActiveFile: (file: TFile | null) => {
			activeFile = file;
		},
		fire: async (name: string, ...args: unknown[]) => {
			const handler = handlers.get(name);
			if (!handler) throw new Error(`No handler registered for ${name}`);
			await handler(...args);
		},
		paths: () => plugin.data.recentFiles.map((entry) => entry.path),
	};
}

/** A document stand-in whose visibility tests can flip, firing "visibilitychange". */
const fakeDocument = {
	hidden: false,
	listeners: new Map<string, Set<() => void>>(),
	addEventListener(type: string, cb: () => void) {
		if (!this.listeners.has(type)) this.listeners.set(type, new Set());
		this.listeners.get(type)?.add(cb);
	},
	removeEventListener(type: string, cb: () => void) {
		this.listeners.get(type)?.delete(cb);
	},
	setHidden(hidden: boolean) {
		this.hidden = hidden;
		for (const cb of this.listeners.get("visibilitychange") ?? []) cb();
	},
};

const SAVE_DELAY_MS = 2000;

beforeEach(() => {
	viewSources.length = 0;
	fakeDocument.hidden = false;
	fakeDocument.listeners.clear();
	vi.useFakeTimers();
	vi.stubGlobal("window", globalThis);
	vi.stubGlobal("document", fakeDocument);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("loading state", () => {
	it("starts from defaults when nothing is stored", async () => {
		const { plugin } = createHarness();
		await plugin.onload();
		expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
		expect(plugin.data.recentFiles).toEqual([]);
	});

	it("sanitizes stored settings and entries", async () => {
		const { plugin } = createHarness();
		await plugin.saveData({
			settings: { maxTrackedFiles: "lots", updateOn: "file-edit" },
			data: { recentFiles: [{ path: "a.md", basename: "a", openedAtMs: 1 }, { path: 42 }] },
		});
		await plugin.onload();
		expect(plugin.settings.maxTrackedFiles).toBe(DEFAULT_SETTINGS.maxTrackedFiles);
		expect(plugin.settings.updateOn).toBe("file-edit");
		expect(plugin.data.recentFiles).toEqual([{ path: "a.md", basename: "a", openedAtMs: 1 }]);
	});

	it("registers the Bases view when the API exists", async () => {
		const { plugin, registerBasesView } = createHarness();
		await plugin.onload();
		expect(registerBasesView).toHaveBeenCalledWith("recent-files-list", expect.objectContaining({ name: "Recent files" }));
	});

	it("warns instead of throwing when registerBasesView is missing", async () => {
		const { plugin } = createHarness();
		(plugin as unknown as { registerBasesView: unknown }).registerBasesView = undefined;
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		await expect(plugin.onload()).resolves.toBeUndefined();
		expect(warn).toHaveBeenCalled();
	});
});

describe("tracking on file open", () => {
	it("adds opened files most-recent-first and saves", async () => {
		const h = createHarness();
		await h.plugin.onload();
		await h.fire("file-open", h.file("a.md"));
		await h.fire("file-open", h.file("b.md"));
		expect(h.paths()).toEqual(["b.md", "a.md"]);
		expect(h.saveData).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
		expect(h.saveData).toHaveBeenCalledTimes(1);
	});

	it("ignores a null file", async () => {
		const h = createHarness();
		await h.plugin.onload();
		await h.fire("file-open", null);
		expect(h.paths()).toEqual([]);
		expect(h.saveData).not.toHaveBeenCalled();
	});

	it("ignores opens when tracking on edit", async () => {
		const h = createHarness();
		await h.plugin.onload();
		h.plugin.settings.updateOn = "file-edit";
		await h.fire("file-open", h.file("a.md"));
		expect(h.paths()).toEqual([]);
	});

	it("does not track files matching a path or tag exclusion", async () => {
		const h = createHarness({ tags: { "t.md": ["archive"] } });
		await h.plugin.onload();
		h.plugin.settings.omittedPathPatterns = ["^daily/"];
		h.plugin.settings.omittedTagPatterns = ["^archive$"];
		await h.plugin.saveSettings();

		for (const path of ["daily/today.md", "t.md", "keep.md"]) {
			await h.fire("file-open", h.file(path));
		}
		expect(h.paths()).toEqual(["keep.md"]);
	});
});

describe("tracking on edit", () => {
	it("debounces edits to the active file", async () => {
		const h = createHarness();
		await h.plugin.onload();
		h.plugin.settings.updateOn = "file-edit";
		const file = h.file("a.md");
		h.setActiveFile(file);

		await h.fire("modify", file);
		await h.fire("modify", file);
		expect(h.paths()).toEqual([]);

		await vi.advanceTimersByTimeAsync(2000);
		expect(h.paths()).toEqual(["a.md"]);
		expect(h.saveData).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
		expect(h.saveData).toHaveBeenCalledTimes(1);
	});

	it("ignores edits to files that are not active", async () => {
		const h = createHarness();
		await h.plugin.onload();
		h.plugin.settings.updateOn = "file-edit";
		h.setActiveFile(h.file("active.md"));

		await h.fire("modify", h.file("background.md"));
		await vi.advanceTimersByTimeAsync(2000);
		expect(h.paths()).toEqual([]);
	});

	it("ignores edits when tracking on open", async () => {
		const h = createHarness();
		await h.plugin.onload();
		const file = h.file("a.md");
		h.setActiveFile(file);

		await h.fire("modify", file);
		await vi.advanceTimersByTimeAsync(2000);
		expect(h.paths()).toEqual([]);
	});

	it("cancels pending edit timers on unload", async () => {
		const h = createHarness();
		await h.plugin.onload();
		h.plugin.settings.updateOn = "file-edit";
		const file = h.file("a.md");
		h.setActiveFile(file);

		await h.fire("modify", file);
		h.plugin.onunload();
		await vi.advanceTimersByTimeAsync(2000);
		expect(h.paths()).toEqual([]);
	});
});

describe("rename and delete", () => {
	it("renames a tracked entry and saves", async () => {
		const h = createHarness();
		await h.plugin.onload();
		await h.fire("file-open", h.file("old.md"));
		h.saveData.mockClear();

		await h.fire("rename", h.file("folder/new.md"), "old.md");
		expect(h.plugin.data.recentFiles[0]).toMatchObject({ path: "folder/new.md", basename: "new" });
		await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
		expect(h.saveData).toHaveBeenCalledTimes(1);
	});

	it("deletes a tracked entry and saves", async () => {
		const h = createHarness();
		await h.plugin.onload();
		await h.fire("file-open", h.file("a.md"));
		h.saveData.mockClear();

		await h.fire("delete", h.file("a.md"));
		expect(h.paths()).toEqual([]);
		await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
		expect(h.saveData).toHaveBeenCalledTimes(1);
	});

	it("skips saving for untracked files", async () => {
		const h = createHarness();
		await h.plugin.onload();
		await h.fire("rename", h.file("x.md"), "untracked.md");
		await h.fire("delete", h.file("untracked.md"));
		await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
		expect(h.saveData).not.toHaveBeenCalled();
	});
});

describe("batched saves", () => {
	it("writes once for a burst of opens, with the latest list", async () => {
		const h = createHarness();
		await h.plugin.onload();
		for (const path of ["a.md", "b.md", "c.md"]) {
			await h.fire("file-open", h.file(path));
			await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS / 2);
		}
		expect(h.saveData).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
		expect(h.saveData).toHaveBeenCalledTimes(1);
		expect(h.saveData.mock.calls[0]?.[0]).toMatchObject({
			data: { recentFiles: [{ path: "c.md" }, { path: "b.md" }, { path: "a.md" }] },
		});
	});

	it("writes a pending change immediately when the app is hidden", async () => {
		const h = createHarness();
		await h.plugin.onload();
		await h.fire("file-open", h.file("a.md"));

		fakeDocument.setHidden(true);
		await vi.advanceTimersByTimeAsync(0);
		expect(h.saveData).toHaveBeenCalledTimes(1);

		// The batched write was replaced, not duplicated.
		await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
		expect(h.saveData).toHaveBeenCalledTimes(1);
	});

	it("does not write on hide or show when nothing is pending", async () => {
		const h = createHarness();
		await h.plugin.onload();
		fakeDocument.setHidden(true);
		fakeDocument.setHidden(false);
		await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
		expect(h.saveData).not.toHaveBeenCalled();
	});

	it("writes a pending change on unload", async () => {
		const h = createHarness();
		await h.plugin.onload();
		await h.fire("file-open", h.file("a.md"));

		h.plugin.onunload();
		await vi.advanceTimersByTimeAsync(0);
		expect(h.saveData).toHaveBeenCalledTimes(1);
	});

	it("writes settings changes immediately", async () => {
		const h = createHarness();
		await h.plugin.onload();
		await h.plugin.saveSettings();
		expect(h.saveData).toHaveBeenCalledTimes(1);
	});
});

describe("clear history", () => {
	it("empties the list, saves immediately, and refreshes views", async () => {
		const h = createHarness();
		await h.plugin.onload();
		await h.fire("file-open", h.file("a.md"));
		await h.fire("file-open", h.file("b.md"));
		const listener = vi.fn();
		viewSources[0]?.subscribe(listener);

		await h.plugin.clearRecentFiles();
		expect(h.paths()).toEqual([]);
		expect(h.saveData).toHaveBeenCalledTimes(1);
		expect(h.saveData.mock.calls[0]?.[0]).toMatchObject({ data: { recentFiles: [] } });
		expect(listener).toHaveBeenCalledTimes(1);

		// No stale batched write from the earlier opens lands afterwards.
		await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
		expect(h.saveData).toHaveBeenCalledTimes(1);
	});
});

describe("settings changes", () => {
	it("hides newly excluded files without deleting them", async () => {
		const h = createHarness();
		await h.plugin.onload();
		await h.fire("file-open", h.file("daily/today.md"));
		await h.fire("file-open", h.file("notes/a.md"));

		h.plugin.settings.omittedPathPatterns = ["."];
		await h.plugin.saveSettings();
		expect(h.plugin.getVisibleRecentFiles()).toEqual([]);
		expect(h.paths()).toEqual(["notes/a.md", "daily/today.md"]);

		h.plugin.settings.omittedPathPatterns = ["^daily/"];
		await h.plugin.saveSettings();
		expect(h.plugin.getVisibleRecentFiles().map((entry) => entry.path)).toEqual(["notes/a.md"]);
	});

	it("keeps entries for files missing from the vault visible", async () => {
		const h = createHarness();
		await h.plugin.saveData({ data: { recentFiles: [{ path: "gone.md", basename: "gone", openedAtMs: 1 }] } });
		await h.plugin.onload();
		h.plugin.settings.omittedPathPatterns = ["."];
		await h.plugin.saveSettings();
		expect(h.plugin.getVisibleRecentFiles().map((entry) => entry.path)).toEqual(["gone.md"]);
	});

	it("trims the list immediately when max tracked files is lowered", async () => {
		const h = createHarness();
		await h.plugin.onload();
		for (const path of ["a.md", "b.md", "c.md"]) await h.fire("file-open", h.file(path));

		await h.plugin.setMaxTrackedFiles(2);
		expect(h.plugin.settings.maxTrackedFiles).toBe(2);
		expect(h.paths()).toEqual(["c.md", "b.md"]);
	});
});

describe("view source", () => {
	it("notifies subscribed views on track, rename, delete, and settings changes", async () => {
		const h = createHarness();
		await h.plugin.onload();
		const source = viewSources[0];
		if (!source) throw new Error("view source was not registered");

		const listener = vi.fn();
		const unsubscribe = source.subscribe(listener);

		await h.fire("file-open", h.file("a.md"));
		await h.fire("rename", h.file("b.md"), "a.md");
		await h.fire("delete", h.file("b.md"));
		await h.plugin.saveSettings();
		expect(listener).toHaveBeenCalledTimes(4);

		unsubscribe();
		await h.fire("file-open", h.file("c.md"));
		expect(listener).toHaveBeenCalledTimes(4);
	});

	it("serves the visible (exclusion-filtered) list to views", async () => {
		const h = createHarness();
		await h.plugin.onload();
		await h.fire("file-open", h.file("daily/today.md"));
		await h.fire("file-open", h.file("notes/a.md"));
		h.plugin.settings.omittedPathPatterns = ["^daily/"];
		await h.plugin.saveSettings();

		expect(viewSources[0]?.getRecentFiles().map((entry) => entry.path)).toEqual(["notes/a.md"]);
	});
});
