import { Plugin, type TAbstractFile, type TFile } from "obsidian";
import { createRecentFilesBasesViewRegistration, RECENT_FILES_BASES_VIEW_TYPE } from "./bases/recentFilesBasesView";
import { DEFAULT_SETTINGS, type RecentFilesBasesSettings, RecentFilesBasesSettingTab } from "./settings";
import type { PluginData } from "./types";
import { stampFrontmatterOpenedAt } from "./recent/frontmatterStamp";
import { RecentFilesStore } from "./recent/recentFilesStore";

const DEFAULT_DATA: PluginData = {
	recentFiles: [],
};

export default class RecentFilesBasesPlugin extends Plugin {
	settings: RecentFilesBasesSettings;
	data: PluginData;

	async onload() {
		await this.loadPluginState();

		this.addSettingTab(new RecentFilesBasesSettingTab(this.app, this));
		this.registerRecentFilesBasesView();

		this.registerEvent(this.app.workspace.on("file-open", this.onFileOpen));
		this.registerEvent(this.app.vault.on("rename", this.onFileRename));
		this.registerEvent(this.app.vault.on("delete", this.onFileDelete));
	}

	onunload() {}

	private readonly onFileOpen = async (file: TFile | null) => {
		if (!file) return;

		const store = new RecentFilesStore({ maxLength: this.settings.maxRecentFiles });
		this.data.recentFiles = store.add(this.data.recentFiles, file);
		await this.savePluginState();

		if (this.settings.stampFrontmatterOnOpen && file.extension === "md") {
			await stampFrontmatterOpenedAt(this.app, file, this.settings.frontmatterKey, Date.now());
		}
	};

	private readonly onFileRename = async (file: TAbstractFile, oldPath: string) => {
		// TAbstractFile doesn't expose basename in the same shape, so derive it.
		const newBasename = file.name.replace(/\.[^/.]+$/, "");
		const store = new RecentFilesStore({ maxLength: this.settings.maxRecentFiles });
		this.data.recentFiles = store.rename(this.data.recentFiles, oldPath, file.path, newBasename);
		await this.savePluginState();
	};

	private readonly onFileDelete = async (file: TAbstractFile) => {
		const store = new RecentFilesStore({ maxLength: this.settings.maxRecentFiles });
		this.data.recentFiles = store.remove(this.data.recentFiles, file.path);
		await this.savePluginState();
	};

	async loadPluginState() {
		const loaded = (await this.loadData()) as Partial<{ settings: RecentFilesBasesSettings; data: PluginData }> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded?.settings ?? {});
		this.data = Object.assign({}, DEFAULT_DATA, loaded?.data ?? {});
	}

	async savePluginState() {
		await this.saveData({ settings: this.settings, data: this.data });
	}

	async saveSettings() {
		await this.savePluginState();
	}

	private registerRecentFilesBasesView() {
		// Bases views require Obsidian 1.10+. If the API isn't present at runtime, do nothing.
		if (!("registerBasesView" in this) || typeof this.registerBasesView !== "function") return;

		// Call on `this` directly so Plugin internals are bound correctly.
		this.registerBasesView(
			RECENT_FILES_BASES_VIEW_TYPE,
			createRecentFilesBasesViewRegistration(() => new Set(this.data.recentFiles.map((file) => file.path))),
		);
	}
}