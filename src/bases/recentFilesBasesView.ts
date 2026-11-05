import { BasesView, Keymap, parsePropertyId } from "obsidian";
import type { BasesEntry, BasesPropertyId, BasesViewRegistration, HoverParent, HoverPopover, QueryController } from "obsidian";
import type { RecentFileEntry } from "../types";
import type { Unsubscribe } from "../utils/changeNotifier";
import { orderByRecency } from "./orderByRecency";
import { DEFAULT_MAX_ITEMS, MAX_ITEMS_OPTION_KEY, MAX_MAX_ITEMS, MIN_MAX_ITEMS, resolveMaxItems } from "./maxItemsOption";

export const RECENT_FILES_BASES_VIEW_TYPE = "recent-files-list";

const DEFAULT_PROPERTIES: BasesPropertyId[] = ["file.name"];

/** What a Recent files view needs from the plugin: the current list, and a way to hear about changes to it. */
export interface RecentFilesSource {
	getRecentFiles: () => RecentFileEntry[];
	subscribe: (listener: () => void) => Unsubscribe;
}

export function createRecentFilesBasesViewRegistration(source: RecentFilesSource): BasesViewRegistration {
	return {
		name: "Recent files",
		icon: "clock",
		factory: (controller: QueryController, containerEl: HTMLElement) =>
			new RecentFilesBasesView(controller, containerEl, source),
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
		],
	};
}

export class RecentFilesBasesView extends BasesView implements HoverParent {
	readonly type = RECENT_FILES_BASES_VIEW_TYPE;
	hoverPopover: HoverPopover | null = null;

	private readonly containerEl: HTMLElement;
	private readonly source: RecentFilesSource;

	constructor(controller: QueryController, parentEl: HTMLElement, source: RecentFilesSource) {
		super(controller);
		this.containerEl = parentEl.createDiv("recent-files-bases-view");
		this.source = source;
		// Bases only calls onDataUpdated when the query result changes. Opening a file does not
		// change the query result, so re-render whenever the tracked recent list changes too.
		this.register(
			source.subscribe(() => {
				// Skip until Bases has delivered the first query result.
				if (this.data) this.onDataUpdated();
			}),
		);
	}

	onDataUpdated(): void {
		this.containerEl.empty();

		const maxItems = resolveMaxItems(this.config.get(MAX_ITEMS_OPTION_KEY));
		const recentFiles = this.source.getRecentFiles();
		const order = this.config.getOrder();
		const properties: BasesPropertyId[] = order.length > 0 ? order : DEFAULT_PROPERTIES;

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
				this.renderEntry(listEl, entry, properties);
			}
		}

		if (!renderedAnyGroup) {
			this.containerEl.createDiv({
				cls: "recent-files-bases-empty",
				text: "No recently opened files match this base.",
			});
		}
	}

	private renderEntry(listEl: HTMLElement, entry: BasesEntry, properties: BasesPropertyId[]): void {
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
				const openFromEvent = (evt: MouseEvent) => {
					evt.preventDefault();
					// Middle-click always opens a new tab; otherwise honour Cmd/Ctrl modifiers.
					const newLeaf = evt.button === 1 ? "tab" : Keymap.isModEvent(evt);
					void app.workspace.openLinkText(entry.file.path, "", newLeaf);
				};
				linkEl.addEventListener("click", (evt) => {
					if (evt.button !== 0) return;
					openFromEvent(evt);
				});
				// Browsers do not fire "click" for the middle button; they fire "auxclick".
				linkEl.addEventListener("auxclick", (evt) => {
					if (evt.button !== 1) return;
					openFromEvent(evt);
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
	}
}
