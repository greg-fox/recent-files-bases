import { App, PluginSettingTab, Setting } from "obsidian";
import type RecentFilesBasesPlugin from "../main";
import type { RecentFilesUpdateTrigger } from "../settings";
import { findInvalidPatterns } from "../recent/exclusionRules";

/** Rewrites a setting's description to include any invalid patterns, or restores the base text. */
function showPatternValidity(setting: Setting, baseDesc: string, patterns: string[]): void {
	const invalid = findInvalidPatterns(patterns);
	setting.descEl.empty();
	setting.descEl.createSpan({ text: baseDesc });
	if (invalid.length > 0) {
		setting.descEl.createDiv({
			cls: "recent-files-bases-invalid-pattern",
			text: `Ignored, not valid regular expressions: ${invalid.join(", ")}`,
		});
	}
}

function parsePatternLines(value: string): string[] {
	return value
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

export class RecentFilesBasesSettingTab extends PluginSettingTab {
	private readonly plugin: RecentFilesBasesPlugin;

	constructor(app: App, plugin: RecentFilesBasesPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Max tracked files")
			.setDesc("How many recently opened files the plugin remembers. Each base filters this list, so a narrow base can only show the files from it that match.")
			.addText((text) => {
				text.inputEl.type = "number";
				text.setValue(String(this.plugin.settings.maxTrackedFiles));
				text.onChange(async (value) => {
					const parsed = Number.parseInt(value, 10);
					if (!Number.isFinite(parsed) || parsed <= 0) return;
					await this.plugin.setMaxTrackedFiles(parsed);
				});
			});

		new Setting(containerEl)
			.setName("Track recency on")
			.setDesc("Update the recent list when a file is opened, or when you edit the active file.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("file-open" satisfies RecentFilesUpdateTrigger, "File opened")
					.addOption("file-edit" satisfies RecentFilesUpdateTrigger, "File edited")
					.setValue(this.plugin.settings.updateOn)
					.onChange(async (value) => {
						this.plugin.settings.updateOn = value as RecentFilesUpdateTrigger;
						await this.plugin.saveSettings();
					});
			});

		const pathDesc = "Regular expressions, one per line. Paths matching any of them are never tracked.";
		const pathSetting = new Setting(containerEl).setName("Omitted path patterns").addTextArea((textArea) => {
			textArea.inputEl.rows = 6;
			textArea.setPlaceholder("^daily/\n\\.excalidraw\\.md$");
			textArea.setValue(this.plugin.settings.omittedPathPatterns.join("\n"));
			textArea.onChange(async (value) => {
				this.plugin.settings.omittedPathPatterns = parsePatternLines(value);
				showPatternValidity(pathSetting, pathDesc, this.plugin.settings.omittedPathPatterns);
				await this.plugin.saveSettings();
			});
		});
		showPatternValidity(pathSetting, pathDesc, this.plugin.settings.omittedPathPatterns);

		const tagDesc = "Regular expressions, one per line. Files with a matching tag are never tracked.";
		const tagSetting = new Setting(containerEl).setName("Omitted tag patterns").addTextArea((textArea) => {
			textArea.inputEl.rows = 6;
			textArea.setPlaceholder("^archive$");
			textArea.setValue(this.plugin.settings.omittedTagPatterns.join("\n"));
			textArea.onChange(async (value) => {
				this.plugin.settings.omittedTagPatterns = parsePatternLines(value);
				showPatternValidity(tagSetting, tagDesc, this.plugin.settings.omittedTagPatterns);
				await this.plugin.saveSettings();
			});
		});
		showPatternValidity(tagSetting, tagDesc, this.plugin.settings.omittedTagPatterns);

		new Setting(containerEl)
			.setName("Omit bookmarked files")
			.setDesc("Don't track files that are bookmarked.")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.omitBookmarkedFiles).onChange(async (value) => {
					this.plugin.settings.omitBookmarkedFiles = value;
					await this.plugin.saveSettings();
					});
			});
	}
}
