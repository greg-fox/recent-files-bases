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
