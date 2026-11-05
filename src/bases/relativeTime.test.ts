import { describe, expect, it } from "vitest";
import { formatRelativeTime, refreshRelativeLabels } from "./relativeTime";

const now = Date.UTC(2026, 10, 5, 12, 0, 0);

describe("formatRelativeTime", () => {
	it("says just now for under a minute", () => {
		expect(formatRelativeTime(now - 30_000, now)).toBe("just now");
	});

	it("uses minutes, hours, and days", () => {
		expect(formatRelativeTime(now - 5 * 60_000, now)).toBe("5m ago");
		expect(formatRelativeTime(now - 3 * 3_600_000, now)).toBe("3h ago");
		expect(formatRelativeTime(now - 2 * 86_400_000, now)).toBe("2d ago");
	});

	it("falls back to a date after a week", () => {
		const then = now - 10 * 86_400_000;
		expect(formatRelativeTime(then, now, "en-CA")).toBe(new Date(then).toLocaleDateString("en-CA"));
	});

	it("treats future timestamps (clock skew) as just now", () => {
		expect(formatRelativeTime(now + 60_000, now)).toBe("just now");
	});
});

describe("refreshRelativeLabels", () => {
	it("updates only labels whose text changed", () => {
		const fresh = { el: { textContent: "just now" }, openedAtMs: now - 10_000 };
		const stale = { el: { textContent: "5m ago" }, openedAtMs: now - 65 * 60_000 };
		expect(refreshRelativeLabels([fresh, stale], now)).toBe(1);
		expect(fresh.el.textContent).toBe("just now");
		expect(stale.el.textContent).toBe("1h ago");
	});

	it("does nothing for an empty list", () => {
		expect(refreshRelativeLabels([], now)).toBe(0);
	});
});
