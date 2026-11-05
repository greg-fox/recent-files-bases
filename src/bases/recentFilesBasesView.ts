import { BasesView, Keymap, parsePropertyId } from "obsidian";
import type { BasesEntry, BasesPropertyId, BasesViewRegistration, HoverParent, HoverPopover, QueryController } from "obsidian";
import type { RecentFileEntry } from "../types";
import { orderByRecency } from "./orderByRecency";
import { formatRelativeTime } from "./relativeTime";
import { DEFAULT_MAX_ITEMS, MAX_ITEMS_OPTION_KEY, MAX_MAX_ITEMS, MIN_MAX_ITEMS, resolveMaxItems } from "./maxItemsOption";

export const RECENT_FILES_BASES_VIEW_TYPE = "recent-files-list";

const SHOW_LAST_OPENED_OPTION_KEY = "showLastOpened";

const DEFAULT_PROPERTIES: BasesPropertyId[] = ["file.name"];

export function createRecentFilesBasesViewRegistration(getRecentFiles: () => RecentFileEntry[]): BasesViewRegistration {
	return {
		name: "Recent files",
		icon: "clock",
		factory: (controller: QueryController, containerEl: HTMLElement) =>
			new RecentFilesBasesView(controller, containerEl, getRecentFiles),
		options: () => [
			{
				type: "slider",
				key: MAX_ITEMS_OPTION_KEY,
				displayName: "Max items",
				default: DEFAULT_MAX_ITEMS,
				min: MIN_MAX_ITEMS,
				max: MAX_MAX_ITEMS,
				step: 1,
			},
			{
				type: "toggle",
				key: SHOW_LAST_OPENED_OPTION_KEY,
				displayName: "Show last opened",
				default: false,
			},
		],
	};
}

export class RecentFilesBasesView extends BasesView implements HoverParent {
	readonly type = RECENT_FILES_BASES_VIEW_TYPE;
	hoverPopover: HoverPopover | null = null;

	private readonly containerEl: HTMLElement;
	private readonly getRecentFiles: () => RecentFileEntry[];

	constructor(controller: QueryController, parentEl: HTMLElement, getRecentFiles: () => RecentFileEntry[]) {
		super(controller);
		this.containerEl = parentEl.createDiv("recent-files-bases-view");
		this.getRecentFiles = getRecentFiles;
	}

	onDataUpdated(): void {
		this.containerEl.empty();

		const maxItems = resolveMaxItems(this.config.get(MAX_ITEMS_OPTION_KEY));
		const recentFiles = this.getRecentFiles();
		const order = this.config.getOrder();
		const properties: BasesPropertyId[] = order.length > 0 ? order : DEFAULT_PROPERTIES;
		const showLastOpened = this.config.get(SHOW_LAST_OPENED_OPTION_KEY) === true;
		const openedAtByPath = new Map(recentFiles.map((recent) => [recent.path, recent.openedAtMs]));
		const nowMs = Date.now();

		let renderedAnyGroup = false;

		for (const group of this.data.groupedData) {
			const matches = orderByRecency(recentFiles, group.entries, (entry) => entry.file.path, maxItems);
			if (matches.length === 0) continue;
			renderedAnyGroup = true;

			const groupEl = this.containerEl.createDiv("recent-files-bases-group");
			if (group.hasKey()) {
				groupEl.createDiv({ cls: "recent-files-bases-group-title", text: group.key?.toString() ?? "" });
			}

			const listEl = groupEl.createEl("ul", { cls: "recent-files-bases-list" });
			for (const entry of matches) {
				const itemEl = this.renderEntry(listEl, entry, properties);
				const openedAtMs = openedAtByPath.get(entry.file.path);
				if (showLastOpened && openedAtMs !== undefined) {
					itemEl.createSpan({
						cls: "recent-files-bases-last-opened",
						text: formatRelativeTime(openedAtMs, nowMs),
						attr: { title: new Date(openedAtMs).toLocaleString() },
					});
				}
			}
		}

		if (!renderedAnyGroup) {
			this.containerEl.createDiv({
				cls: "recent-files-bases-empty",
				text: "No recently opened files match this base.",
			});
		}
	}

	private renderEntry(listEl: HTMLElement, entry: BasesEntry, properties: BasesPropertyId[]): HTMLElement {
		const { app } = this;
		const itemEl = listEl.createEl("li", { cls: "recent-files-bases-item" });

		let renderedAny = false;
		for (const propertyId of properties) {
			const { type, name } = parsePropertyId(propertyId);

			if (type === "file" && name === "name") {
				const linkEl = itemEl.createEl("a", {
					cls: "recent-files-bases-link",
					text: entry.file.basename,
					href: "#",
				});
				linkEl.addEventListener("click", (evt) => {
					if (evt.button !== 0 && evt.button !== 1) return;
					evt.preventDefault();
					const newLeaf = Keymap.isModEvent(evt);
					void app.workspace.openLinkText(entry.file.path, "", newLeaf);
				});
				linkEl.addEventListener("mouseover", (evt) => {
					app.workspace.trigger("hover-link", {
						event: evt,
						source: RECENT_FILES_BASES_VIEW_TYPE,
						hoverParent: this,
						targetEl: linkEl,
						linktext: entry.file.path,
					});
				});
				renderedAny = true;
				continue;
			}

			const value = entry.getValue(propertyId);
			if (!value || !value.isTruthy()) continue;

			if (renderedAny) {
				itemEl.createSpan({ cls: "recent-files-bases-separator", text: " · " });
			}
			itemEl.createSpan({ cls: "recent-files-bases-property", text: value.toString() });
			renderedAny = true;
		}

		if (!renderedAny) {
			itemEl.setText(entry.file.basename);
		}
		return itemEl;
	}
}
