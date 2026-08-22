export interface RecentFileEntry {
	path: string;
	basename: string;
	openedAtMs: number;
}

export interface PluginData {
	recentFiles: RecentFileEntry[];
}
