import { Plugin, TFile, type TAbstractFile } from "obsidian";
import { createRecentFilesBasesViewRegistration, RECENT_FILES_BASES_VIEW_TYPE } from "./bases/recentFilesBasesView";
import { DEFAULT_SETTINGS, type RecentFilesBasesSettings } from "./settings";
import { RecentFilesBasesSettingTab } from "./ui/settingsTab";
import { RecentFilesStore } from "./recent/recentFilesStore";
import { isExcluded } from "./recent/exclusionRules";
import { getFileTags } from "./recent/tags";
import { getBookmarkedPaths } from "./recent/bookmarks";
import type { PluginData } from "./types";
import { ChangeNotifier } from "./utils/changeNotifier";

const DEFAULT_DATA: PluginData = {
	recentFiles: [],
};

const EDIT_TRACKING_DEBOUNCE_MS = 2000;

export default class RecentFilesBasesPlugin extends Plugin {
	settings: RecentFilesBasesSettings;
	data: PluginData;

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
		await this.commitRecentFiles();
	}

	async saveSettings() {
		await this.commitRecentFiles();
	}

	/** Drops tracked files that no longer pass the current exclusion settings. Called from the settings tab. */
	async pruneExcludedFiles() {
		this.data.recentFiles = this.data.recentFiles.filter((tracked) => {
			const file = this.app.vault.getFileByPath(tracked.path);
			if (!file) return true; // Deletion is handled by the delete event, not here.
			return !this.isFileExcluded(file);
		});
		await this.commitRecentFiles();
	}

	private readonly onFileOpen = async (file: TFile | null) => {
		if (!file || this.settings.updateOn !== "file-open") return;
		await this.trackFile(file);
	};

	private readonly onFileModify = (file: TAbstractFile) => {
		if (this.settings.updateOn !== "file-edit" || !(file instanceof TFile)) return;

		const existingTimer = this.editDebounceTimers.get(file.path);
		if (existingTimer !== undefined) window.clearTimeout(existingTimer);

		const timer = window.setTimeout(() => {
			this.editDebounceTimers.delete(file.path);
			void this.trackFile(file);
		}, EDIT_TRACKING_DEBOUNCE_MS);
		this.editDebounceTimers.set(file.path, timer);
	};

	private readonly onFileRename = async (file: TAbstractFile, oldPath: string) => {
		const newBasename = file.name.replace(/\.[^/.]+$/, "");
		const store = new RecentFilesStore({ maxLength: this.settings.maxTrackedFiles });
		this.data.recentFiles = store.rename(this.data.recentFiles, oldPath, file.path, newBasename);
		await this.commitRecentFiles();
	};

	private readonly onFileDelete = async (file: TAbstractFile) => {
		const store = new RecentFilesStore({ maxLength: this.settings.maxTrackedFiles });
		this.data.recentFiles = store.remove(this.data.recentFiles, file.path);
		await this.savePluginState();
	};

	private readonly trackFile = async (file: TFile) => {
		if (this.isFileExcluded(file)) return;

		const store = new RecentFilesStore({ maxLength: this.settings.maxTrackedFiles });
		this.data.recentFiles = store.add(this.data.recentFiles, file);
		await this.savePluginState();
	};

	private isFileExcluded(file: TFile): boolean {
		return isExcluded(
			{
				path: file.path,
				tags: getFileTags(this.app, file),
				isBookmarked: getBookmarkedPaths(this.app).has(file.path),
			},
			this.settings,
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
				getRecentFiles: () => this.data.recentFiles,
				subscribe: (listener) => this.recentFilesChanged.subscribe(listener),
			}),
		);
	}
}
