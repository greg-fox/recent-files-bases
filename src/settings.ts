import { App, PluginSettingTab, Setting } from "obsidian";
import RecentFilesBasesPlugin from "./main";

export interface RecentFilesBasesSettings {
	/**
	 * Maximum number of entries stored in the plugin’s recent list.
	 * (Independent from how many are shown in a Base view.)
	 */
	maxRecentFiles: number;

	/**
	 * If enabled, stamp a numeric frontmatter property on opened markdown files.
	 * This enables Bases to filter/sort by “recently opened”.
	 */
	stampFrontmatterOnOpen: boolean;

	/**
	 * Frontmatter key used when stamping opened time.
	 * Stored as a unix epoch millisecond number.
	 */
	frontmatterKey: string;
}

export const DEFAULT_SETTINGS: RecentFilesBasesSettings = {
	maxRecentFiles: 50,
	stampFrontmatterOnOpen: true,
	frontmatterKey: "recently_opened_ms",
};

export class RecentFilesBasesSettingTab extends PluginSettingTab {
	plugin: RecentFilesBasesPlugin;

	constructor(app: App, plugin: RecentFilesBasesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Max recent files")
			.setDesc("How many recently opened files to keep in the plugin’s internal list.")
			.addText((text) => {
				text.inputEl.type = "number";
				text.setValue(String(this.plugin.settings.maxRecentFiles));
				text.onChange(async (value) => {
					const parsed = Number.parseInt(value, 10);
					if (!Number.isFinite(parsed) || parsed <= 0) return;
					this.plugin.settings.maxRecentFiles = parsed;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Stamp frontmatter on open")
			.setDesc("Write a timestamp to front matter when you open a file")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.stampFrontmatterOnOpen)
					.onChange(async (value) => {
						this.plugin.settings.stampFrontmatterOnOpen = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Frontmatter key")
			.setDesc("The frontmatter property name that will store the unix epoch (ms).")
			.addText((text) => {
				text.setPlaceholder("For example, recently_opened_ms");
				text.setValue(this.plugin.settings.frontmatterKey);
				text.onChange(async (value) => {
					const trimmed = value.trim();
					if (!trimmed) return;
					this.plugin.settings.frontmatterKey = trimmed;
					await this.plugin.saveSettings();
				});
			});
	}
}
