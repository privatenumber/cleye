/**
 * Index a map of named entries into a `(canonical-name | alias) → canonical-name`
 * lookup. Used by both the flag and command pipelines:
 *
 *   - `names` contains every recognizable token (canonical names AND aliases).
 *     `findClosest` and `commandIndex.names.has(token)` rely on this.
 *   - `aliases` maps an alias back to its canonical name, used to surface
 *     "Did you mean -v (alias for --verbose)?" suggestions.
 *
 * `getAlias` extracts the alias declaration from an entry. It may return:
 *   - a single alias string
 *   - an array of alias strings
 *   - `undefined` when the entry has no alias
 *
 * If `onDuplicateAlias` is provided, it is invoked when the same alias is
 * declared by two different entries; throw inside the callback to reject
 * the configuration.
 */
export type NameIndex = {
	names: Set<string>;
	aliases: Map<string, string>;
};

/**
 * Standard alias-extractor for flag config entries: returns the `alias` field
 * if the entry is an object that declares one, else `undefined`. Used as the
 * `getAlias` argument to `buildNameIndex` for both auto-flag injection and
 * strict-mode unknown-flag suggestion.
 */
export const getFlagAlias = (config: unknown): string | string[] | undefined => {
	if (config && typeof config === 'object' && 'alias' in config) {
		return (config as { alias?: string | string[] }).alias;
	}
	return undefined;
};

export const buildNameIndex = <Entry>(
	entries: Record<string, Entry>,
	getAlias: (entry: Entry) => string | string[] | undefined,
	onDuplicateAlias?: (alias: string) => void,
): NameIndex => {
	const names = new Set<string>();
	const aliases = new Map<string, string>();
	for (const [name, entry] of Object.entries(entries)) {
		names.add(name);
		const aliasList = getAlias(entry);
		if (aliasList === undefined) {
			continue;
		}
		const list = Array.isArray(aliasList) ? aliasList : [aliasList];
		for (const alias of list) {
			// Defensive: TS types alias as `string | string[]`, but consumers
			// can bypass the contract (e.g. JS callers, or `as any` casts).
			// Skip anything non-string or empty so the index stays well-typed.
			if (typeof alias !== 'string' || !alias) {
				continue;
			}
			if (onDuplicateAlias && aliases.has(alias)) {
				onDuplicateAlias(alias);
			}
			names.add(alias);
			aliases.set(alias, name);
		}
	}
	return {
		names,
		aliases,
	};
};
