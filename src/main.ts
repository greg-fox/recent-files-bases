import { Notice, Plugin, TFile, type TAbstractFile } from "obsidian";
import { createRecentFilesBasesViewRegistration, RECENT_FILES_BASES_VIEW_TYPE } from "./bases/recentFilesBasesView";
import type { RecentFilesBasesSettings } from "./settings";
import { sanitizePluginData, sanitizeSettings } from "./persistence";
import { RecentFilesBasesSettingTab } from "./ui/settingsTab";
import { RecentFilesStore } from "./recent/recentFilesStore";
import { compileExclusionRules, isExcluded, type CompiledExclusionRules } from "./recent/exclusionRules";
import { getFileTags } from "./recent/tags";
import type { PluginData, RecentFileEntry } from "./types";
import { ChangeNotifier } from "./utils/changeNotifier";

const EDIT_TRACKING_DEBOUNCE_MS = 2000;
/** Recent-list changes are batched into one write this long after the last change. */
const SAVE_DEBOUNCE_MS = 2000;

export default class RecentFilesBasesPlugin extends Plugin {
	settings: RecentFilesBasesSettings = sanitizeSettings(undefined);
	data: PluginData = sanitizePluginData(undefined);

	private compiledRules: CompiledExclusionRules | null = null;
	private readonly editDebounceTimers = new Map<string, number>();
	private readonly recentFilesChanged = new ChangeNotifier();
	private saveTimer: number | null = null;

	async onload() {
		await this.loadPluginState();

		this.addSettingTab(new RecentFilesBasesSettingTab(this.app, this));
		this.registerRecentFilesBasesView();

		this.registerEvent(this.app.workspace.on("file-open", this.onFileOpen));
		this.registerEvent(this.app.vault.on("modify", this.onFileModify));
		this.registerEvent(this.app.vault.on("rename", this.onFileRename));
		this.registerEvent(this.app.vault.on("delete", this.onFileDelete));
		// Mobile can suspend the app without unloading plugins; write pending changes first.
		this.registerDomEvent(document, "visibilitychange", () => {
			if (document.hidden) void this.flushSave();
		});
	}

	onunload() {
		for (const timer of this.editDebounceTimers.values()) {
			window.clearTimeout(timer);
		}
		this.editDebounceTimers.clear();
		void this.flushSave();
	}

	async loadPluginState() {
		const loaded = (await this.loadData()) as Partial<{ settings: unknown; data: unknown }> | null;
		this.settings = sanitizeSettings(loaded?.settings);
		this.data = sanitizePluginData(loaded?.data);
	}

	/** Writes everything now, replacing any pending batched write. */
	async savePluginState() {
		this.cancelPendingSave();
		await this.saveData({ settings: this.settings, data: this.data });
	}

	/** Writes a pending batched change immediately, if there is one. */
	async flushSave() {
		if (this.saveTimer === null) return;
		await this.savePluginState();
	}

	private cancelPendingSave() {
		if (this.saveTimer === null) return;
		window.clearTimeout(this.saveTimer);
		this.saveTimer = null;
	}

	/**
	 * Refreshes open views now and batches the disk write, so opening several notes in a row
	 * costs one write (and one Sync upload) instead of one per note.
	 */
	private commitRecentFiles() {
		this.recentFilesChanged.notify();
		this.cancelPendingSave();
		this.saveTimer = window.setTimeout(() => {
			this.saveTimer = null;
			void this.savePluginState();
		}, SAVE_DEBOUNCE_MS);
	}

	/** Refreshes open views and writes immediately; used for deliberate user actions. */
	private async commitNow() {
		this.recentFilesChanged.notify();
		await this.savePluginState();
	}

	async saveSettings() {
		this.compiledRules = null; // Recompile on next use.
		// Exclusion settings change what the views show, so refresh them too.
		await this.commitNow();
	}

	/** Empties the tracked list. The settings tab asks for confirmation before calling this. */
	async clearRecentFiles() {
		this.data.recentFiles = [];
		await this.commitNow();
	}

	/** Applies a changed "Max tracked files" setting immediately instead of on the next open. */
	async setMaxTrackedFiles(maxTrackedFiles: number) {
		this.settings.maxTrackedFiles = maxTrackedFiles;
		const store = new RecentFilesStore({ maxLength: maxTrackedFiles });
		this.data.recentFiles = store.trim(this.data.recentFiles);
		await this.commitNow();
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

	private readonly onFileOpen = (file: TFile | null) => {
		if (!file || this.settings.updateOn !== "file-open") return;
		this.trackFile(file);
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
			this.trackFile(file);
		}, EDIT_TRACKING_DEBOUNCE_MS);
		this.editDebounceTimers.set(file.path, timer);
	};

	private isTracked(path: string): boolean {
		return this.data.recentFiles.some((tracked) => tracked.path === path);
	}

	private readonly onFileRename = (file: TAbstractFile, oldPath: string) => {
		// Folder deletes/renames emit one event per file; only touch disk when it matters.
		if (!this.isTracked(oldPath)) return;
		const newBasename = file.name.replace(/\.[^/.]+$/, "");
		const store = new RecentFilesStore({ maxLength: this.settings.maxTrackedFiles });
		this.data.recentFiles = store.rename(this.data.recentFiles, oldPath, file.path, newBasename);
		this.commitRecentFiles();
	};

	private readonly onFileDelete = (file: TAbstractFile) => {
		if (!this.isTracked(file.path)) return;
		const store = new RecentFilesStore({ maxLength: this.settings.maxTrackedFiles });
		this.data.recentFiles = store.remove(this.data.recentFiles, file.path);
		this.commitRecentFiles();
	};

	private readonly trackFile = (file: TFile) => {
		if (this.isFileExcluded(file)) return;

		const store = new RecentFilesStore({ maxLength: this.settings.maxTrackedFiles });
		this.data.recentFiles = store.add(this.data.recentFiles, file);
		this.commitRecentFiles();
	};

	private isFileExcluded(file: TFile): boolean {
		this.compiledRules ??= compileExclusionRules(this.settings);
		const rules = this.compiledRules;
		return isExcluded(
			{
				path: file.path,
				tags: rules.tagRegexes.length > 0 ? getFileTags(this.app, file) : [],
			},
			rules,
		);
	}

	private registerRecentFilesBasesView() {
		if (typeof this.registerBasesView !== "function") {
			console.warn("Recent Files Bases: registerBasesView is unavailable; this plugin requires Obsidian 1.10+.");
			// Mobile has no visible console, so say it on screen too.
			new Notice("Recent files layout unavailable: this plugin needs Obsidian 1.10 or later.");
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
