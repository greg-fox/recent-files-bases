import { BasesView } from "obsidian";
import type { BasesEntry, BasesViewRegistration, QueryController } from "obsidian";

export const RECENT_FILES_BASES_VIEW_TYPE = "recent-files";

export function createRecentFilesBasesViewRegistration(getRecentFilePaths: () => Set<string>): BasesViewRegistration {
	return {
		name: "Recent Files",
		icon: "clock",
		factory: (controller: QueryController, containerEl: HTMLElement) =>
			new RecentFilesBasesView(controller, containerEl, getRecentFilePaths),
	};
}

class RecentFilesBasesView extends BasesView {
	type = RECENT_FILES_BASES_VIEW_TYPE;

	private readonly containerEl: HTMLElement;
	private readonly getRecentFilePaths: () => Set<string>;

	constructor(controller: QueryController, containerEl: HTMLElement, getRecentFilePaths: () => Set<string>) {
		super(controller);
		this.containerEl = containerEl;
		this.getRecentFilePaths = getRecentFilePaths;
	}

	onDataUpdated(): void {
		this.render(this.data?.data ?? []);
	}

	private render(entries: BasesEntry[]) {
		this.containerEl.empty();
		const recentFilePaths = this.getRecentFilePaths();
		const filteredEntries = entries.filter((entry) => recentFilePaths.has(entry.file.path));

		const list = this.containerEl.createEl("ul", { cls: "recent-files-bases-list" });
		for (const entry of filteredEntries) {
			const li = list.createEl("li", { cls: "recent-files-bases-item" });
			const a = li.createEl("a", { cls: "recent-files-bases-link", href: "#" });
			a.setText(entry.file.basename);
			a.addEventListener("click", (evt) => {
				evt.preventDefault();
				void this.app.workspace.getLeaf(true).openFile(entry.file);
			});
		}

		if (filteredEntries.length === 0) {
			this.containerEl.createDiv({ text: "No results." });
		}
	}
}

