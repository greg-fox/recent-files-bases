export interface ExclusionCandidate {
	path: string;
	tags: string[];
	isBookmarked: boolean;
}

export interface ExclusionRules {
	omittedPathPatterns: string[];
	omittedTagPatterns: string[];
	omitBookmarkedFiles: boolean;
}

/** Exclusion rules with their regex patterns compiled once, ready for repeated matching. */
export interface CompiledExclusionRules {
	pathRegexes: RegExp[];
	tagRegexes: RegExp[];
	omitBookmarkedFiles: boolean;
}

function toValidRegexes(patterns: string[]): RegExp[] {
	const regexes: RegExp[] = [];
	for (const pattern of patterns) {
		const trimmed = pattern.trim();
		if (!trimmed) continue;
		try {
			regexes.push(new RegExp(trimmed));
		} catch {
			// Invalid user-entered regex; skip it rather than throwing.
		}
	}
	return regexes;
}

/** Compiles settings into reusable regexes. Call when settings change, not per file. */
export function compileExclusionRules(rules: ExclusionRules): CompiledExclusionRules {
	return {
		pathRegexes: toValidRegexes(rules.omittedPathPatterns),
		tagRegexes: toValidRegexes(rules.omittedTagPatterns),
		omitBookmarkedFiles: rules.omitBookmarkedFiles,
	};
}

/** Whether a candidate file should be kept out of the tracked recent-files list. */
export function isExcluded(candidate: ExclusionCandidate, rules: CompiledExclusionRules): boolean {
	if (rules.omitBookmarkedFiles && candidate.isBookmarked) return true;
	if (rules.pathRegexes.some((re) => re.test(candidate.path))) return true;
	return rules.tagRegexes.length > 0 && candidate.tags.some((tag) => rules.tagRegexes.some((re) => re.test(tag)));
}
