const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;

/**
 * Short, compact relative time for list rows ("just now", "5m ago", "3h ago", "2d ago").
 * Anything older than a week falls back to a locale date.
 */
export function formatRelativeTime(thenMs: number, nowMs: number, locale?: string): string {
	const elapsed = Math.max(0, nowMs - thenMs);
	if (elapsed < MINUTE_MS) return "just now";
	if (elapsed < HOUR_MS) return `${Math.floor(elapsed / MINUTE_MS)}m ago`;
	if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}h ago`;
	if (elapsed < WEEK_MS) return `${Math.floor(elapsed / DAY_MS)}d ago`;
	return new Date(thenMs).toLocaleDateString(locale);
}

/** A rendered relative-time label: anything with writable text, plus the timestamp it shows. */
export interface RelativeTimeLabel {
	el: { textContent: string | null };
	openedAtMs: number;
}

/**
 * Recomputes each label's text and writes it only when it changed, so an idle tick touches
 * no DOM at all. Returns how many labels were updated.
 */
export function refreshRelativeLabels(labels: readonly RelativeTimeLabel[], nowMs: number, locale?: string): number {
	let changed = 0;
	for (const label of labels) {
		const text = formatRelativeTime(label.openedAtMs, nowMs, locale);
		if (label.el.textContent !== text) {
			label.el.textContent = text;
			changed++;
		}
	}
	return changed;
}
