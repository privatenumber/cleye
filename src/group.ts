import type { Flags } from './types.ts';
import { isFlagConfigObject } from './utils/flag-defaults.ts';

/**
 * Group a set of flags under a named section in `--help` output. Spread the
 * result into the `flags` map; each flag is tagged with the group name so the
 * default help renderer lists it under a `<name>:` heading.
 *
 * @example
 * ```
 * cli({
 *     flags: {
 *         ...group('Output', { json: Boolean, color: Boolean }),
 *         verbose: Boolean
 *     }
 * })
 * ```
 *
 * The generic return type preserves each flag's type, so `argv.flags` stays
 * fully inferred after the spread.
 */
export const group = <F extends Flags>(name: string, flags: F): F => {
	const grouped: Record<string, unknown> = {};
	for (const [flagName, config] of Object.entries(flags)) {
		grouped[flagName] = isFlagConfigObject(config)
			? {
				...config,
				group: name,
			}
			: {
				type: config,
				group: name,
			};
	}
	return grouped as F;
};
