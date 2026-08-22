import { describe, expect, it } from "vitest";
import { DEFAULT_MAX_ITEMS, MAX_MAX_ITEMS, MIN_MAX_ITEMS, resolveMaxItems } from "./maxItemsOption";

describe("resolveMaxItems", () => {
	it("returns a valid numeric value unchanged", () => {
		expect(resolveMaxItems(30)).toBe(30);
	});

	it("coerces numeric strings", () => {
		expect(resolveMaxItems("30")).toBe(30);
	});

	it("rounds fractional values", () => {
		expect(resolveMaxItems(20.6)).toBe(21);
	});

	it("clamps values above the maximum", () => {
		expect(resolveMaxItems(9999)).toBe(MAX_MAX_ITEMS);
	});

	it("clamps values below the minimum", () => {
		expect(resolveMaxItems(0)).toBe(MIN_MAX_ITEMS);
		expect(resolveMaxItems(-5)).toBe(MIN_MAX_ITEMS);
	});

	it("falls back to the default for undefined", () => {
		expect(resolveMaxItems(undefined)).toBe(DEFAULT_MAX_ITEMS);
	});

	it("falls back to the default for non-numeric strings", () => {
		expect(resolveMaxItems("not-a-number")).toBe(DEFAULT_MAX_ITEMS);
	});

	it("falls back to the default for NaN", () => {
		expect(resolveMaxItems(Number.NaN)).toBe(DEFAULT_MAX_ITEMS);
	});
});
