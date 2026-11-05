import { describe, expect, it } from "vitest";
import {
	compileExclusionRules,
	findInvalidPatterns,
	isExcluded as isExcludedCompiled,
	type ExclusionCandidate,
	type ExclusionRules,
} from "./exclusionRules";

const isExcluded = (candidate: ExclusionCandidate, rules: ExclusionRules) =>
	isExcludedCompiled(candidate, compileExclusionRules(rules));

const noRules: ExclusionRules = {
	omittedPathPatterns: [],
	omittedTagPatterns: [],
};

describe("isExcluded", () => {
	it("is false when no rules are configured", () => {
		expect(isExcluded({ path: "notes/a.md", tags: [] }, noRules)).toBe(false);
	});

	it("excludes a path matching an omitted path pattern", () => {
		const rules = { ...noRules, omittedPathPatterns: ["^daily/"] };
		expect(isExcluded({ path: "daily/2026-08-22.md", tags: [] }, rules)).toBe(true);
		expect(isExcluded({ path: "notes/a.md", tags: [] }, rules)).toBe(false);
	});

	it("excludes a file whose tag matches an omitted tag pattern", () => {
		const rules = { ...noRules, omittedTagPatterns: ["^archive$"] };
		expect(isExcluded({ path: "a.md", tags: ["archive"] }, rules)).toBe(true);
		expect(isExcluded({ path: "a.md", tags: ["archived"] }, rules)).toBe(false);
	});

	it("does not match tag patterns against unrelated tags", () => {
		const rules = { ...noRules, omittedTagPatterns: ["^archive$"] };
		expect(isExcluded({ path: "a.md", tags: ["project", "todo"] }, rules)).toBe(false);
	});

	it("ignores invalid regex patterns instead of throwing", () => {
		const rules = { ...noRules, omittedPathPatterns: ["["], omittedTagPatterns: ["("] };
		expect(() => isExcluded({ path: "a.md", tags: ["x"] }, rules)).not.toThrow();
		expect(isExcluded({ path: "a.md", tags: ["x"] }, rules)).toBe(false);
	});

	it("ignores blank pattern lines", () => {
		const rules = { ...noRules, omittedPathPatterns: ["", "   "] };
		expect(isExcluded({ path: "a.md", tags: [] }, rules)).toBe(false);
	});

	it("compiles valid patterns once and drops invalid ones", () => {
		const compiled = compileExclusionRules({ ...noRules, omittedPathPatterns: ["^a", "[", " "], omittedTagPatterns: ["x"] });
		expect(compiled.pathRegexes.map((re) => re.source)).toEqual(["^a"]);
		expect(compiled.tagRegexes.map((re) => re.source)).toEqual(["x"]);
	});
});

describe("findInvalidPatterns", () => {
	it("returns only the patterns that fail to compile", () => {
		expect(findInvalidPatterns(["^daily/", "[", "(", "ok$"])).toEqual(["[", "("]);
	});

	it("ignores blank lines", () => {
		expect(findInvalidPatterns(["", "   "])).toEqual([]);
	});
});
