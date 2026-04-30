/**
 * Levenshtein distance, capped at `maxDistance`. Returns `Infinity` for any
 * pair whose edit distance exceeds `maxDistance` — callers can use a single
 * `result > maxDistance` check without worrying whether they got an
 * early-exit sentinel or a true count.
 *
 * Two short-circuits avoid wasted work:
 *   1. If the length difference alone already exceeds `maxDistance`, no edit
 *      sequence can bridge them — bail before allocating the matrix.
 *   2. If every cell in a row exceeds `maxDistance`, no extension can shrink
 *      it below — bail with `Infinity`. (A surviving low-cost diagonal can
 *      still let the full matrix run; the post-loop check below catches that.)
 */
export const getDistance = (a: string, b: string, maxDistance: number): number => {
	if (a === b) {
		return 0;
	}
	if (Math.abs(a.length - b.length) > maxDistance) {
		return Infinity;
	}
	const aLength = a.length;
	const bLength = b.length;
	let previous = Array.from({ length: bLength + 1 }, (_, index) => index);
	let current = Array.from<number>({ length: bLength + 1 });
	for (let i = 1; i <= aLength; i += 1) {
		current[0] = i;
		let rowMin = i;
		for (let j = 1; j <= bLength; j += 1) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			current[j] = Math.min(
				current[j - 1] + 1,
				previous[j] + 1,
				previous[j - 1] + cost,
			);
			if (current[j] < rowMin) {
				rowMin = current[j];
			}
		}
		if (rowMin > maxDistance) {
			return Infinity;
		}
		[previous, current] = [current, previous];
	}
	const result = previous[bLength];
	return result > maxDistance ? Infinity : result;
};

/**
 * Closest-match search aware of canonical-vs-alias status. On a distance tie,
 * prefers the canonical name; when the winner is an alias, surfaces the
 * canonical via `aliasFor` so callers can build "Did you mean X (alias for Y)?"
 * messages. When `aliases` is empty, behaves as a plain closest-match search.
 *
 * Returns `undefined` when `unknown` is shorter than 3 characters (suggestions
 * for very short typos are noisy) or when no candidate is within distance 2.
 */
export const findClosest = (
	unknown: string,
	names: Iterable<string>,
	aliases: Map<string, string>,
): { name: string;
	aliasFor?: string; } | undefined => {
	if (unknown.length < 3) {
		return undefined;
	}
	let best: { name: string;
		distance: number;
		isAlias: boolean; } | undefined;
	for (const name of names) {
		const candidateDistance = getDistance(unknown, name, 2);
		if (candidateDistance > 2) {
			continue;
		}
		const isAlias = aliases.has(name);
		if (
			!best
			|| candidateDistance < best.distance
			|| (candidateDistance === best.distance && best.isAlias && !isAlias)
		) {
			best = {
				name,
				distance: candidateDistance,
				isAlias,
			};
		}
	}
	if (!best) {
		return undefined;
	}
	return {
		name: best.name,
		aliasFor: best.isAlias ? aliases.get(best.name) : undefined,
	};
};
