/**
 * Minimal runtime stand-in for the `obsidian` package, which ships type definitions only.
 * Aliased in vitest.config.ts so modules that import Obsidian classes can load under Node.
 * Only what the plugin touches at load or in tests is implemented.
 */

export class TFile {
	path: string;
	name: string;
	basename: string;
	extension: string;

	constructor(path: string) {
		this.path = path;
		this.name = path.split("/").pop() ?? path;
		const dot = this.name.lastIndexOf(".");
		this.basename = dot > 0 ? this.name.slice(0, dot) : this.name;
		this.extension = dot > 0 ? this.name.slice(dot + 1) : "";
	}
}

export class Component {
	private readonly cleanups: (() => void)[] = [];

	register(cleanup: () => void): void {
		this.cleanups.push(cleanup);
	}

	registerEvent(_ref: unknown): void {}

	registerInterval(id: number): number {
		this.register(() => window.clearInterval(id));
		return id;
	}

	unload(): void {
		for (const cleanup of this.cleanups.splice(0)) cleanup();
	}
}

export class Plugin extends Component {
	app: unknown;
	manifest: unknown;
	private stored: unknown;

	constructor(app: unknown, manifest: unknown) {
		super();
		this.app = app;
		this.manifest = manifest;
	}

	async loadData(): Promise<unknown> {
		return this.stored;
	}

	async saveData(data: unknown): Promise<void> {
		this.stored = data;
	}

	addSettingTab(_tab: unknown): void {}
}

export class PluginSettingTab {
	constructor(
		public app: unknown,
		public plugin: unknown,
	) {}
}

export class Setting {}

export class Menu {}

export class BasesView extends Component {
	constructor(_controller: unknown) {
		super();
	}
}

export const Keymap = {
	isModEvent: () => false,
};

export function parsePropertyId(id: string): { type: string; name: string } {
	const dot = id.indexOf(".");
	return { type: id.slice(0, dot), name: id.slice(dot + 1) };
}
