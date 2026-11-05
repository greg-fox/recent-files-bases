import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./settings";

describe("DEFAULT_SETTINGS", () => {
	it("defaults to tracking on file-open with no exclusions", () => {
		expect(DEFAULT_SETTINGS).toEqual({
			maxTrackedFiles: 500,
			updateOn: "file-open",
			omittedPathPatterns: [],
			omittedTagPatterns: [],
		});
	});
});
