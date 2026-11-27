import { App, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import type RecentFilesBasesPlugin from "../main";
import { buildSettingRows } from "./settingDefinitions";

export class RecentFilesBasesSettingTab extends PluginSettingTab {
	private readonly plugin: RecentFilesBasesPlugin;

	constructor(app: App, plugin: RecentFilesBasesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Obsidian 1.13.0+ renders the tab from these definitions and indexes them for settings
	 * search. Older versions never call this and use display() instead.
	 */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return buildSettingRows(this.app, this.plugin);
	}

	/** Fallback renderer for Obsidian 1.10 to 1.12, built from the same rows. */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		for (const row of buildSettingRows(this.app, this.plugin)) {
			row.render(new Setting(containerEl).setName(row.name).setDesc(row.desc));
		}
	}
}
