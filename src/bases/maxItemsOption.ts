export const MAX_ITEMS_OPTION_KEY = "maxItems";
export const DEFAULT_MAX_ITEMS = 20;
export const MIN_MAX_ITEMS = 1;
export const MAX_MAX_ITEMS = 200;

/** Coerces a Bases view option value into a valid item-count bound, defaulting on bad input. */
export function resolveMaxItems(rawValue: unknown): number {
	const parsed = typeof rawValue === "number" ? rawValue : Number(rawValue);
	if (!Number.isFinite(parsed)) return DEFAULT_MAX_ITEMS;
	return Math.min(MAX_MAX_ITEMS, Math.max(MIN_MAX_ITEMS, Math.round(parsed)));
}
