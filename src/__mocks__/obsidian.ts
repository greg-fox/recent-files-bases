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

	registerDomEvent(
		el: { addEventListener: (type: string, cb: () => void) => void; removeEventListener: (type: string, cb: () => void) => void },
		type: string,
		callback: () => void,
	): void {
		el.addEventListener(type, callback);
		this.register(() => el.removeEventListener(type, callback));
	}

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

/** Records the elements and components created under it so tests can inspect rendered output. */
export class FakeElement {
	children: unknown[] = [];
	cls?: string;
	text?: string;

	empty(): void {
		this.children = [];
	}

	createSpan(o: { cls?: string; text?: string } = {}): FakeElement {
		return this.createChild(o);
	}

	createDiv(o: { cls?: string; text?: string } = {}): FakeElement {
		return this.createChild(o);
	}

	private createChild(o: { cls?: string; text?: string }): FakeElement {
		const el = new FakeElement();
		el.cls = o.cls;
		el.text = o.text;
		this.children.push(el);
		return el;
	}
}

/** Shared by the fake value components: stores the value and the registered change handler. */
class FakeValueComponent {
	value = "";
	placeholder = "";
	changeHandler?: (value: string) => unknown;
	inputEl: { type?: string; rows?: number } = {};

	setValue(value: string): this {
		this.value = value;
		return this;
	}

	setPlaceholder(placeholder: string): this {
		this.placeholder = placeholder;
		return this;
	}

	onChange(cb: (value: string) => unknown): this {
		this.changeHandler = cb;
		return this;
	}
}

export class TextComponent extends FakeValueComponent {}

export class TextAreaComponent extends FakeValueComponent {}

export class DropdownComponent extends FakeValueComponent {
	options: Record<string, string> = {};

	addOption(value: string, display: string): this {
		this.options[value] = display;
		return this;
	}
}

export class ButtonComponent {
	text = "";
	destructive = false;
	warning = false;
	clickHandler?: () => unknown;

	setButtonText(text: string): this {
		this.text = text;
		return this;
	}

	setDestructive(): this {
		this.destructive = true;
		return this;
	}

	setWarning(): this {
		this.warning = true;
		return this;
	}

	onClick(cb: () => unknown): this {
		this.clickHandler = cb;
		return this;
	}
}

export class Setting {
	name = "";
	descEl = new FakeElement();
	components: unknown[] = [];

	constructor(containerEl: FakeElement) {
		containerEl.children.push(this);
	}

	setName(name: string): this {
		this.name = name;
		return this;
	}

	setDesc(desc: string): this {
		this.descEl.empty();
		this.descEl.createSpan({ text: desc });
		return this;
	}

	addText(cb: (c: TextComponent) => unknown): this {
		return this.add(new TextComponent(), cb);
	}

	addTextArea(cb: (c: TextAreaComponent) => unknown): this {
		return this.add(new TextAreaComponent(), cb);
	}

	addDropdown(cb: (c: DropdownComponent) => unknown): this {
		return this.add(new DropdownComponent(), cb);
	}

	addButton(cb: (c: ButtonComponent) => unknown): this {
		return this.add(new ButtonComponent(), cb);
	}

	private add<T>(component: T, cb: (c: T) => unknown): this {
		this.components.push(component);
		cb(component);
		return this;
	}
}

export class PluginSettingTab {
	containerEl = new FakeElement();

	constructor(
		public app: unknown,
		public plugin: unknown,
	) {}
}

/** The API version the stub reports to `requireApiVersion`. Tests may change it. */
export const mockApi = { version: "1.13.0" };

function compareVersions(a: string, b: string): number {
	const pa = a.split(".").map(Number);
	const pb = b.split(".").map(Number);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
		if (diff !== 0) return diff;
	}
	return 0;
}

export function requireApiVersion(version: string): boolean {
	return compareVersions(mockApi.version, version) >= 0;
}

export class Modal {
	static opened: Modal[] = [];

	constructor(public app: unknown) {}

	open(): void {
		Modal.opened.push(this);
	}

	close(): void {}
}

export class Notice {
	constructor(public message: string) {}
}

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

/**
 * Simplified getAllTags: frontmatter `tags` (string or list) plus inline tags, all with a "#"
 * prefix, matching the real function's output shape. Real parsing details are Obsidian's concern.
 */
export function getAllTags(cache: {
	frontmatter?: { tags?: unknown };
	tags?: { tag: string }[];
}): string[] | null {
	const raw = cache.frontmatter?.tags;
	const fromFrontmatter = (Array.isArray(raw) ? raw : raw == null ? [] : [raw]).map((tag) =>
		String(tag).startsWith("#") ? String(tag) : `#${String(tag)}`,
	);
	const tags = [...fromFrontmatter, ...(cache.tags ?? []).map((t) => t.tag)];
	return tags.length > 0 ? tags : null;
}
