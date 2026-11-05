export interface RecencyOrderable {
	path: string;
}

/**
 * Orders `items` by the recency of `recentFiles` (already most-recent-first),
 * keeping only items that have a matching path, and caps the result at
 * `maxItems`. This is how a Bases query's filtered/grouped entries get
 * turned into a "recently opened" list: the Base decides which files are
 * eligible, this decides what order they show up in.
 */
export function orderByRecency<T>(
	recentFiles: RecencyOrderable[],
	items: T[],
	getPath: (item: T) => string,
	maxItems: number,
): T[] {
	const byPath = new Map<string, T>();
	for (const item of items) {
		const path = getPath(item);
		if (!byPath.has(path)) byPath.set(path, item);
	}

	const ordered: T[] = [];
	for (const recent of recentFiles) {
		if (ordered.length >= maxItems) break;
		const match = byPath.get(recent.path);
		if (match) ordered.push(match);
	}
	return ordered;
}

/**
 * Applies one `maxItems` cap across every group: picks the `maxItems` most recent entries
 * from all groups combined, then returns each group's share of them in recency order.
 * Groups with no surviving entries come back empty, in their original positions.
 */
export function orderGroupsByRecency<T>(
	recentFiles: RecencyOrderable[],
	groups: T[][],
	getPath: (item: T) => string,
	maxItems: number,
): T[][] {
	const top = orderByRecency(recentFiles, groups.flat(), getPath, maxItems);
	const keep = new Set(top.map(getPath));
	return groups.map((entries) =>
		orderByRecency(
			recentFiles,
			entries.filter((entry) => keep.has(getPath(entry))),
			getPath,
			Number.POSITIVE_INFINITY,
		),
	);
}
