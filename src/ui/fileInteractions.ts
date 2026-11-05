import { Menu, type App, type TFile } from "obsidian";

/** Source string passed to the "file-menu" event so other plugins can tell where the menu came from. */
export const FILE_MENU_SOURCE = "recent-files-bases";

interface DragManager {
	dragFile: (evt: DragEvent, file: TFile) => unknown;
	onDragStart: (evt: DragEvent, dragData: unknown) => void;
}

/** Shows Obsidian's standard file context menu, including items contributed by other plugins. */
export function showFileMenu(app: App, file: TFile, evt: MouseEvent): void {
	evt.preventDefault();
	const menu = new Menu();
	app.workspace.trigger("file-menu", menu, file, FILE_MENU_SOURCE);
	menu.showAtMouseEvent(evt);
}

/**
 * Makes an element a drag source for a file, so it can be dropped into an editor (as a link),
 * a pane (to open it), or a folder in the file explorer.
 *
 * The drag manager is not part of the public API, so access is defensive and falls back to a
 * plain wikilink in the drag data.
 */
export function makeFileDraggable(app: App, el: HTMLElement, file: TFile): void {
	el.draggable = true;
	el.addEventListener("dragstart", (evt) => {
		const dragManager = (app as unknown as { dragManager?: Partial<DragManager> }).dragManager;
		if (typeof dragManager?.dragFile === "function" && typeof dragManager.onDragStart === "function") {
			dragManager.onDragStart(evt, dragManager.dragFile(evt, file));
			return;
		}
		const link = app.fileManager.generateMarkdownLink(file, "");
		evt.dataTransfer?.setData("text/plain", link);
	});
}
