import { distance } from 'fastest-levenshtein';

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
		const candidateDistance = distance(unknown, name);
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
