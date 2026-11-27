import { Notice, type App, type Setting, type SettingDefinitionBase } from "obsidian";
import type RecentFilesBasesPlugin from "../main";
import type { RecentFilesUpdateTrigger } from "../settings";
import { findInvalidPatterns } from "../recent/exclusionRules";
import { ConfirmModal } from "./confirmModal";
import { markDestructive } from "./destructiveButton";

/**
 * One row of the settings tab. The shape is a subset of Obsidian's `SettingDefinitionRender`, so
 * the same list feeds `getSettingDefinitions()` on 1.13.0+ (rendering and settings search) and
 * the imperative `display()` fallback on older versions. `render` takes only the `Setting`, so the
 * fallback never needs `SettingGroup`, which older versions lack.
 */
export interface SettingRow extends SettingDefinitionBase {
	desc: string;
	render: (setting: Setting) => void;
}

/** Rewrites a setting's description to include any invalid patterns, or restores the base text. */
export function showPatternValidity(setting: Setting, baseDesc: string, patterns: string[]): void {
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

export function parsePatternLines(value: string): string[] {
	return value
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

type PatternKey = "omittedPathPatterns" | "omittedTagPatterns";

function patternRow(
	plugin: RecentFilesBasesPlugin,
	key: PatternKey,
	name: string,
	desc: string,
	placeholder: string,
): SettingRow {
	return {
		name,
		desc,
		aliases: ["exclude", "ignore", "regex"],
		render: (setting) => {
			setting.addTextArea((textArea) => {
				textArea.inputEl.rows = 6;
				textArea.setPlaceholder(placeholder);
				textArea.setValue(plugin.settings[key].join("\n"));
				textArea.onChange(async (value) => {
					plugin.settings[key] = parsePatternLines(value);
					showPatternValidity(setting, desc, plugin.settings[key]);
					await plugin.saveSettings();
				});
			});
			showPatternValidity(setting, desc, plugin.settings[key]);
		},
	};
}

/** Every setting the plugin exposes, in display order. */
export function buildSettingRows(app: App, plugin: RecentFilesBasesPlugin): SettingRow[] {
	return [
		{
			name: "Max tracked files",
			desc: "How many recently opened files the plugin remembers. Each base filters this list, so a narrow base can only show the files from it that match.",
			aliases: ["history size", "limit"],
			render: (setting) => {
				setting.addText((text) => {
					text.inputEl.type = "number";
					text.setValue(String(plugin.settings.maxTrackedFiles));
					text.onChange(async (value) => {
						const parsed = Number.parseInt(value, 10);
						if (!Number.isFinite(parsed) || parsed <= 0) return;
						await plugin.setMaxTrackedFiles(parsed);
					});
				});
			},
		},
		{
			name: "Track recency on",
			desc: "Update the recent list when a file is opened, or when you edit the active file.",
			aliases: ["update on", "file opened", "file edited"],
			render: (setting) => {
				setting.addDropdown((dropdown) => {
					dropdown
						.addOption("file-open" satisfies RecentFilesUpdateTrigger, "File opened")
						.addOption("file-edit" satisfies RecentFilesUpdateTrigger, "File edited")
						.setValue(plugin.settings.updateOn)
						.onChange(async (value) => {
							plugin.settings.updateOn = value as RecentFilesUpdateTrigger;
							await plugin.saveSettings();
						});
				});
			},
		},
		patternRow(
			plugin,
			"omittedPathPatterns",
			"Omitted path patterns",
			"Regular expressions, one per line. Paths matching any of them are never tracked.",
			"^daily/\n\\.excalidraw\\.md$",
		),
		patternRow(
			plugin,
			"omittedTagPatterns",
			"Omitted tag patterns",
			"Regular expressions, one per line. Files with a matching tag are never tracked.",
			"^archive$",
		),
		{
			name: "Clear history",
			desc: "Remove every file from the recent list. This cannot be undone.",
			aliases: ["reset", "delete"],
			render: (setting) => {
				setting.addButton((button) =>
					markDestructive(button.setButtonText("Clear history")).onClick(() => {
						const count = plugin.data.recentFiles.length;
						new ConfirmModal(app, {
							title: "Clear recent files history?",
							message: `This removes all ${count} tracked files from the recent list. Your notes are not affected. This cannot be undone.`,
							confirmText: "Clear history",
							onConfirm: async () => {
								await plugin.clearRecentFiles();
								new Notice("Recent files history cleared.");
							},
						}).open();
					}),
				);
			},
		},
	];
}
