import { Menu, type App, type TFile } from "obsidian";

/** Source string passed to the "file-menu" event so other plugins can tell where the menu came from. */
export const FILE_MENU_SOURCE = "recent-files-bases";

/** Shows Obsidian's standard file context menu, including items contributed by other plugins. */
export function showFileMenu(app: App, file: TFile, evt: MouseEvent): void {
	evt.preventDefault();
	const menu = new Menu();
	app.workspace.trigger("file-menu", menu, file, FILE_MENU_SOURCE);
	menu.showAtMouseEvent(evt);
}

/**
 * Makes an element a drag source for a file. The drag carries a markdown link, so dropping
 * into an editor inserts a link. Uses only public APIs (no internal drag manager), so drops
 * onto panes or the file explorer are not supported.
 */
export function makeFileDraggable(app: App, el: HTMLElement, file: TFile): void {
	el.draggable = true;
	el.addEventListener("dragstart", (evt) => {
		const link = app.fileManager.generateMarkdownLink(file, "");
		evt.dataTransfer?.setData("text/plain", link);
	});
}
