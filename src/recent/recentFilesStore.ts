import type { RecentFileEntry } from "../types";

export interface RecentFilesStoreOptions {
	maxLength: number;
	nowMs?: () => number;
}

export class RecentFilesStore {
	private readonly maxLength: number;
	private readonly nowMs: () => number;

	constructor(options: RecentFilesStoreOptions) {
		this.maxLength = options.maxLength;
		this.nowMs = options.nowMs ?? (() => Date.now());
	}

	public add(entries: RecentFileEntry[], file: { path: string; basename: string }): RecentFileEntry[] {
		const without = entries.filter((e) => e.path !== file.path);
		const next: RecentFileEntry[] = [
			{ path: file.path, basename: file.basename, openedAtMs: this.nowMs() },
			...without,
		];
		return next.slice(0, this.maxLength);
	}

	public remove(entries: RecentFileEntry[], path: string): RecentFileEntry[] {
		return entries.filter((e) => e.path !== path);
	}

	public rename(entries: RecentFileEntry[], oldPath: string, newPath: string, newBasename: string): RecentFileEntry[] {
		return entries.map((e) => (e.path === oldPath ? { ...e, path: newPath, basename: newBasename } : e));
	}
}

