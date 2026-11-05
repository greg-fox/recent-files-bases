import { BasesView, Keymap, parsePropertyId } from "obsidian";
import type { BasesEntry, BasesPropertyId, BasesViewRegistration, HoverParent, HoverPopover, QueryController } from "obsidian";
import type { RecentFileEntry } from "../types";
import type { Unsubscribe } from "../utils/changeNotifier";
import { orderGroupsByRecency } from "./orderByRecency";
import { makeFileDraggable, showFileMenu } from "../ui/fileInteractions";
import { formatRelativeTime, refreshRelativeLabels, type RelativeTimeLabel } from "./relativeTime";
import { DEFAULT_MAX_ITEMS, MAX_ITEMS_OPTION_KEY, MAX_MAX_ITEMS, MIN_MAX_ITEMS, resolveMaxItems } from "./maxItemsOption";

export const RECENT_FILES_BASES_VIEW_TYPE = "recent-files-list";

const SHOW_LAST_OPENED_OPTION_KEY = "showLastOpened";

/** How often "5m ago" style labels are refreshed while the view sits open. */
const LAST_OPENED_REFRESH_MS = 60_000;

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
	private readonly source: RecentFilesSource;
	/** Labels on screen right now; replaced on every render so the timer never holds stale elements. */
	private lastOpenedLabels: RelativeTimeLabel[] = [];
	private lastOpenedTimerStarted = false;

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
		this.lastOpenedLabels = [];

		const maxItems = resolveMaxItems(this.config.get(MAX_ITEMS_OPTION_KEY));
		const recentFiles = this.source.getRecentFiles();
		const order = this.config.getOrder();
		const properties: BasesPropertyId[] = order.length > 0 ? order : DEFAULT_PROPERTIES;
		const showLastOpened = this.config.get(SHOW_LAST_OPENED_OPTION_KEY) === true;
		const openedAtByPath = new Map(recentFiles.map((recent) => [recent.path, recent.openedAtMs]));
		const nowMs = Date.now();

		let renderedAnyGroup = false;

		const groups = this.data.groupedData;
		const matchesByGroup = orderGroupsByRecency(
			recentFiles,
			groups.map((group) => group.entries),
			(entry) => entry.file.path,
			maxItems,
		);

		for (const [index, group] of groups.entries()) {
			const matches = matchesByGroup[index] ?? [];
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
					const labelEl = itemEl.createSpan({
						cls: "recent-files-bases-last-opened",
						text: formatRelativeTime(openedAtMs, nowMs),
						attr: { title: new Date(openedAtMs).toLocaleString() },
					});
					this.lastOpenedLabels.push({ el: labelEl, openedAtMs });
				}
			}
		}

		if (this.lastOpenedLabels.length > 0) this.startLastOpenedTimer();

		if (!renderedAnyGroup) {
			this.containerEl.createDiv({
				cls: "recent-files-bases-empty",
				text: "No recently opened files match this base.",
			});
		}
	}

	/**
	 * Starts one timer per view, only once the view actually shows timestamps. Each tick only
	 * rewrites label text that changed: no re-render, no vault or metadata access. Ticks are
	 * skipped while the view is hidden or the window is in the background.
	 */
	private startLastOpenedTimer(): void {
		if (this.lastOpenedTimerStarted) return;
		this.lastOpenedTimerStarted = true;
		this.registerInterval(
			window.setInterval(() => {
				if (this.lastOpenedLabels.length === 0 || document.hidden || !this.containerEl.isShown()) return;
				refreshRelativeLabels(this.lastOpenedLabels, Date.now());
			}, LAST_OPENED_REFRESH_MS),
		);
	}

	private renderEntry(listEl: HTMLElement, entry: BasesEntry, properties: BasesPropertyId[]): HTMLElement {
		const { app } = this;
		const itemEl = listEl.createEl("li", { cls: "recent-files-bases-item" });
		itemEl.addEventListener("contextmenu", (evt) => showFileMenu(app, entry.file, evt));
		makeFileDraggable(app, itemEl, entry.file);

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
			// renderTo gives links, tags, lists, and dates the same rendering as the built-in views.
			const propertyEl = itemEl.createSpan({ cls: "recent-files-bases-property" });
			value.renderTo(propertyEl, app.renderContext);
			renderedAny = true;
		}

		if (!renderedAny) {
			itemEl.setText(entry.file.basename);
		}

		// Without a file name column there is no link to click, so make the whole row open the file.
		if (!properties.includes("file.name")) {
			itemEl.addClass("recent-files-bases-item-clickable");
			itemEl.addEventListener("click", (evt) => {
				if (evt.button !== 0) return;
				// Leave clicks on links rendered inside property values to those links.
				if (evt.target instanceof Element && evt.target.closest("a")) return;
				void app.workspace.openLinkText(entry.file.path, "", Keymap.isModEvent(evt));
			});
		}

		return itemEl;
	}
}
