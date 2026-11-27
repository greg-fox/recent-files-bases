import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { App, SettingDefinitionBase } from "obsidian";
import {
	ButtonComponent,
	DropdownComponent,
	FakeElement,
	Modal,
	Setting,
	TextAreaComponent,
	TextComponent,
	mockApi,
} from "../__mocks__/obsidian";
import type RecentFilesBasesPlugin from "../main";
import { DEFAULT_SETTINGS } from "../settings";
import type { ConfirmOptions } from "./confirmModal";
import { buildSettingRows, parsePatternLines } from "./settingDefinitions";
import { RecentFilesBasesSettingTab } from "./settingsTab";

const EXPECTED_NAMES = [
	"Max tracked files",
	"Track recency on",
	"Omitted path patterns",
	"Omitted tag patterns",
	"Clear history",
];

function createPlugin() {
	return {
		settings: { ...DEFAULT_SETTINGS, omittedPathPatterns: ["^daily/"], omittedTagPatterns: [] as string[] },
		data: { recentFiles: [{ path: "a.md" }, { path: "b.md" }] },
		saveSettings: vi.fn(async () => {}),
		setMaxTrackedFiles: vi.fn(async () => {}),
		clearRecentFiles: vi.fn(async () => {}),
	};
}

type FakePlugin = ReturnType<typeof createPlugin>;

const app = {} as App;
const asPlugin = (plugin: FakePlugin) => plugin as unknown as RecentFilesBasesPlugin;

/** Renders one row into a fresh fake Setting, as the declarative path would. */
function renderRow(plugin: FakePlugin, name: string): Setting {
	const row = buildSettingRows(app, asPlugin(plugin)).find((r) => r.name === name);
	if (!row) throw new Error(`No row named ${name}`);
	const setting = new Setting(new FakeElement());
	row.render(setting as never);
	return setting;
}

function descText(setting: Setting): string[] {
	return (setting.descEl.children as FakeElement[]).map((el) => el.text ?? "");
}

describe("RecentFilesBasesSettingTab", () => {
	it("exposes every setting through getSettingDefinitions for settings search", () => {
		const tab = new RecentFilesBasesSettingTab(app, asPlugin(createPlugin()));
		const defs = tab.getSettingDefinitions() as SettingDefinitionBase[];
		expect(defs.map((d) => d.name)).toEqual(EXPECTED_NAMES);
		for (const def of defs) {
			expect(def.desc).toBeTruthy();
			expect("render" in def).toBe(true);
		}
	});

	it("renders the same rows imperatively from display() for Obsidian before 1.13.0", () => {
		const tab = new RecentFilesBasesSettingTab(app, asPlugin(createPlugin()));
		const containerEl = tab.containerEl as unknown as FakeElement;
		containerEl.children.push("stale");
		// eslint-disable-next-line @typescript-eslint/no-deprecated -- exercising the pre-1.13.0 fallback
		tab.display();
		const rows = containerEl.children as Setting[];
		expect(rows.map((s) => s.name)).toEqual(EXPECTED_NAMES);
		expect(descText(rows[0]!)[0]).toMatch(/^How many recently opened files/);
		for (const row of rows) expect(row.components).toHaveLength(1);
	});
});

describe("setting rows", () => {
	let plugin: FakePlugin;

	beforeEach(() => {
		plugin = createPlugin();
		Modal.opened = [];
	});

	afterEach(() => {
		mockApi.version = "1.13.0";
	});

	it("only applies positive whole numbers to Max tracked files", async () => {
		const text = renderRow(plugin, "Max tracked files").components[0] as TextComponent;
		expect(text.inputEl.type).toBe("number");
		expect(text.value).toBe(String(DEFAULT_SETTINGS.maxTrackedFiles));
		await text.changeHandler?.("0");
		await text.changeHandler?.("abc");
		expect(plugin.setMaxTrackedFiles).not.toHaveBeenCalled();
		await text.changeHandler?.("120");
		expect(plugin.setMaxTrackedFiles).toHaveBeenCalledWith(120);
	});

	it("saves the Track recency on choice", async () => {
		const dropdown = renderRow(plugin, "Track recency on").components[0] as DropdownComponent;
		expect(Object.keys(dropdown.options)).toEqual(["file-open", "file-edit"]);
		await dropdown.changeHandler?.("file-edit");
		expect(plugin.settings.updateOn).toBe("file-edit");
		expect(plugin.saveSettings).toHaveBeenCalledOnce();
	});

	it("parses pattern lines and lists invalid expressions under the setting", async () => {
		const setting = renderRow(plugin, "Omitted path patterns");
		const textArea = setting.components[0] as TextAreaComponent;
		expect(textArea.value).toBe("^daily/");
		expect(descText(setting)).toHaveLength(1);

		await textArea.changeHandler?.("  ^archive/ \n\n(unclosed\n");
		expect(plugin.settings.omittedPathPatterns).toEqual(["^archive/", "(unclosed"]);
		expect(plugin.saveSettings).toHaveBeenCalledOnce();
		expect(descText(setting)[1]).toBe("Ignored, not valid regular expressions: (unclosed");
	});

	it("writes tag patterns to their own setting", async () => {
		const textArea = renderRow(plugin, "Omitted tag patterns").components[0] as TextAreaComponent;
		await textArea.changeHandler?.("^archive$");
		expect(plugin.settings.omittedTagPatterns).toEqual(["^archive$"]);
		expect(plugin.settings.omittedPathPatterns).toEqual(["^daily/"]);
	});

	it("clears history only after confirmation", async () => {
		const button = renderRow(plugin, "Clear history").components[0] as ButtonComponent;
		expect(button.destructive).toBe(true);
		await button.clickHandler?.();
		expect(plugin.clearRecentFiles).not.toHaveBeenCalled();
		expect(Modal.opened).toHaveLength(1);

		const { options } = Modal.opened[0] as unknown as { options: ConfirmOptions };
		expect(options.message).toContain("all 2 tracked files");
		await options.onConfirm();
		expect(plugin.clearRecentFiles).toHaveBeenCalledOnce();
	});

	it("falls back to setWarning on Obsidian versions before 1.13.0", () => {
		mockApi.version = "1.10.0";
		const button = renderRow(plugin, "Clear history").components[0] as ButtonComponent;
		expect(button.warning).toBe(true);
		expect(button.destructive).toBe(false);
	});
});

describe("parsePatternLines", () => {
	it("trims lines and drops blanks", () => {
		expect(parsePatternLines(" a \n\n b\n")).toEqual(["a", "b"]);
	});
});
