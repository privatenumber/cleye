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
 * If `onDuplicateAlias` is provided, it is invoked when an alias collides
 * with another alias or a canonical name; throw inside the callback to reject
 * the configuration.
 */
export type NameIndex = {
	names: Set<string>;
	aliases: Map<string, string>;
};

/**
 * Standard alias-extractor for flag config entries. Validates the same public
 * alias contract that type-flag enforces for flags: one non-empty
 * single-character alias, and no alias on single-character flag names. This
 * keeps help and auto-flag metadata from advertising unsupported aliases.
 */
export const getFlagAlias = (config: unknown, flagName: string): string | undefined => {
	if (!config || typeof config !== 'object' || !('alias' in config)) {
		return undefined;
	}
	const { alias } = config as { alias?: unknown };
	if (alias === undefined) {
		return undefined;
	}
	if (typeof alias !== 'string') {
		throw new TypeError(`Flag alias for flag "${flagName}" must be a string`);
	}

	const message = `Flag alias "${alias}" for flag "${flagName}"`;
	if (flagName.length === 1) {
		throw new Error(`${message} cannot be defined for a single-character flag`);
	}
	if (alias.length === 0) {
		throw new Error(`${message} cannot be empty`);
	}
	if (alias.length > 1) {
		throw new Error(`${message} must be a single character`);
	}
	return alias;
};

export const buildNameIndex = <Entry>(
	entries: Record<string, Entry>,
	getAlias: (entry: Entry, name: string) => string | string[] | undefined,
	onDuplicateAlias?: (alias: string) => void,
): NameIndex => {
	const names = new Set(Object.keys(entries));
	const aliases = new Map<string, string>();
	for (const [name, entry] of Object.entries(entries)) {
		const aliasList = getAlias(entry, name);
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
			if (onDuplicateAlias && names.has(alias)) {
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
