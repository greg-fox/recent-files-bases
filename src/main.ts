import { Plugin, TFile, type TAbstractFile } from "obsidian";
import { createRecentFilesBasesViewRegistration, RECENT_FILES_BASES_VIEW_TYPE } from "./bases/recentFilesBasesView";
import { DEFAULT_SETTINGS, type RecentFilesBasesSettings } from "./settings";
import { RecentFilesBasesSettingTab } from "./ui/settingsTab";
import { RecentFilesStore } from "./recent/recentFilesStore";
import { compileExclusionRules, isExcluded, type CompiledExclusionRules } from "./recent/exclusionRules";
import { getFileTags } from "./recent/tags";
import { getBookmarkedPaths } from "./recent/bookmarks";
import type { PluginData, RecentFileEntry } from "./types";
import { ChangeNotifier } from "./utils/changeNotifier";

const DEFAULT_DATA: PluginData = {
	recentFiles: [],
};

const EDIT_TRACKING_DEBOUNCE_MS = 2000;

export default class RecentFilesBasesPlugin extends Plugin {
	settings: RecentFilesBasesSettings;
	data: PluginData;

	private compiledRules: CompiledExclusionRules | null = null;
	private readonly editDebounceTimers = new Map<string, number>();
	private readonly recentFilesChanged = new ChangeNotifier();

	async onload() {
		await this.loadPluginState();

		this.addSettingTab(new RecentFilesBasesSettingTab(this.app, this));
		this.registerRecentFilesBasesView();

		this.registerEvent(this.app.workspace.on("file-open", this.onFileOpen));
		this.registerEvent(this.app.vault.on("modify", this.onFileModify));
		this.registerEvent(this.app.vault.on("rename", this.onFileRename));
		this.registerEvent(this.app.vault.on("delete", this.onFileDelete));
	}

	onunload() {
		for (const timer of this.editDebounceTimers.values()) {
			window.clearTimeout(timer);
		}
		this.editDebounceTimers.clear();
	}

	async loadPluginState() {
		const loaded = (await this.loadData()) as Partial<{ settings: RecentFilesBasesSettings; data: PluginData }> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded?.settings ?? {});
		this.data = Object.assign({}, DEFAULT_DATA, loaded?.data ?? {});
	}

	async savePluginState() {
		await this.saveData({ settings: this.settings, data: this.data });
	}

	/** Persists state and tells any open Recent files views to re-render. */
	private async commitRecentFiles() {
		this.recentFilesChanged.notify();
		await this.savePluginState();
	}

	async saveSettings() {
		this.compiledRules = null; // Recompile on next use.
		// Exclusion settings change what the views show, so refresh them too.
		await this.commitRecentFiles();
	}

	/** Applies a changed "Max tracked files" setting immediately instead of on the next open. */
	async setMaxTrackedFiles(maxTrackedFiles: number) {
		this.settings.maxTrackedFiles = maxTrackedFiles;
		const store = new RecentFilesStore({ maxLength: maxTrackedFiles });
		this.data.recentFiles = store.trim(this.data.recentFiles);
		await this.commitRecentFiles();
	}

	/**
	 * The tracked list with the current exclusion rules applied. Exclusions are applied
	 * at read time rather than by deleting stored entries, so editing a pattern (including
	 * a half-typed one like "." that matches everything) never destroys history.
	 */
	getVisibleRecentFiles(): RecentFileEntry[] {
		return this.data.recentFiles.filter((tracked) => {
			const file = this.app.vault.getFileByPath(tracked.path);
			if (!file) return true; // Deletion is handled by the delete event, not here.
			return !this.isFileExcluded(file);
		});
	}

	private readonly onFileOpen = async (file: TFile | null) => {
		if (!file || this.settings.updateOn !== "file-open") return;
		await this.trackFile(file);
	};

	private readonly onFileModify = (file: TAbstractFile) => {
		if (this.settings.updateOn !== "file-edit" || !(file instanceof TFile)) return;
		// "modify" also fires for Sync, other plugins, and background writes. Only count edits
		// to the file the user is actually looking at.
		if (file !== this.app.workspace.getActiveFile()) return;

		const existingTimer = this.editDebounceTimers.get(file.path);
		if (existingTimer !== undefined) window.clearTimeout(existingTimer);

		const timer = window.setTimeout(() => {
			this.editDebounceTimers.delete(file.path);
			void this.trackFile(file);
		}, EDIT_TRACKING_DEBOUNCE_MS);
		this.editDebounceTimers.set(file.path, timer);
	};

	private isTracked(path: string): boolean {
		return this.data.recentFiles.some((tracked) => tracked.path === path);
	}

	private readonly onFileRename = async (file: TAbstractFile, oldPath: string) => {
		// Folder deletes/renames emit one event per file; only touch disk when it matters.
		if (!this.isTracked(oldPath)) return;
		const newBasename = file.name.replace(/\.[^/.]+$/, "");
		const store = new RecentFilesStore({ maxLength: this.settings.maxTrackedFiles });
		this.data.recentFiles = store.rename(this.data.recentFiles, oldPath, file.path, newBasename);
		await this.commitRecentFiles();
	};

	private readonly onFileDelete = async (file: TAbstractFile) => {
		if (!this.isTracked(file.path)) return;
		const store = new RecentFilesStore({ maxLength: this.settings.maxTrackedFiles });
		this.data.recentFiles = store.remove(this.data.recentFiles, file.path);
		await this.commitRecentFiles();
	};

	private readonly trackFile = async (file: TFile) => {
		if (this.isFileExcluded(file)) return;

		const store = new RecentFilesStore({ maxLength: this.settings.maxTrackedFiles });
		this.data.recentFiles = store.add(this.data.recentFiles, file);
		await this.commitRecentFiles();
	};

	private isFileExcluded(file: TFile): boolean {
		this.compiledRules ??= compileExclusionRules(this.settings);
		const rules = this.compiledRules;
		return isExcluded(
			{
				path: file.path,
				tags: rules.tagRegexes.length > 0 ? getFileTags(this.app, file) : [],
				// Walking the bookmark tree is only worth doing when the setting is on.
				isBookmarked: rules.omitBookmarkedFiles && getBookmarkedPaths(this.app).has(file.path),
			},
			rules,
		);
	}

	private registerRecentFilesBasesView() {
		if (typeof this.registerBasesView !== "function") {
			console.warn("Recent Files Bases: registerBasesView is unavailable; this plugin requires Obsidian 1.10+.");
			return;
		}

		this.registerBasesView(
			RECENT_FILES_BASES_VIEW_TYPE,
			createRecentFilesBasesViewRegistration({
				getRecentFiles: () => this.getVisibleRecentFiles(),
				subscribe: (listener) => this.recentFilesChanged.subscribe(listener),
			}),
		);
	}
}
