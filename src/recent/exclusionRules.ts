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

/** Whether a candidate file should be kept out of the tracked recent-files list. */
export function isExcluded(candidate: ExclusionCandidate, rules: ExclusionRules): boolean {
	if (rules.omitBookmarkedFiles && candidate.isBookmarked) return true;

	const pathPatterns = toValidRegexes(rules.omittedPathPatterns);
	if (pathPatterns.some((re) => re.test(candidate.path))) return true;

	const tagPatterns = toValidRegexes(rules.omittedTagPatterns);
	if (tagPatterns.length > 0 && candidate.tags.some((tag) => tagPatterns.some((re) => re.test(tag)))) {
		return true;
	}

	return false;
}
