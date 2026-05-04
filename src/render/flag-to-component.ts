import { flagNameToKebab } from 'type-flag';
import type { Flags } from '../types.ts';
import type { Flag } from './components.ts';

type FlagEntry = readonly [name: string, kebabName: string];

const flagNameSorter = new Intl.Collator('en', {
	numeric: true,
	sensitivity: 'base',
});

/**
 * Map a flag's `type` constructor (or array thereof) to a human-readable
 * `<arg>` label for help output. `Boolean` flags don't carry a value, so
 * they get `undefined`.
 */
const inferFlagArgument = (typeValue: unknown): string | undefined => {
	if (typeValue === Boolean) {
		return undefined;
	}
	if (Array.isArray(typeValue)) {
		return inferFlagArgument(typeValue[0]);
	}
	if (typeValue === String) {
		return 'string';
	}
	if (typeValue === Number) {
		return 'number';
	}
	return 'value';
};

/**
 * Convert a user-declared flag config map into the `Flag[]` shape the help
 * components render. Sorts naturally by displayed name, infers `<arg>`
 * labels, appends `(default: ...)` to descriptions, and routes single-char
 * names through the short-flag (`-x`) path.
 */
export const flagsToComponentList = (rawFlags: Flags): Flag[] => {
	const flagEntries = Object.keys(rawFlags)
		.map((name): FlagEntry => [name, flagNameToKebab(name)])
		.sort((a, b) => flagNameSorter.compare(a[1], b[1]));
	return flagEntries.map(([name, kebabName]) => {
		const config = rawFlags[name];
		const cfg = (
			config !== null
			&& typeof config === 'object'
			&& !Array.isArray(config)
			&& typeof config !== 'function'
		)
			? config as Record<string, unknown>
			: { type: config };

		const type = cfg.type ?? config;

		let argument: string | undefined;
		if ('placeholder' in cfg && typeof cfg.placeholder === 'string') {
			argument = cfg.placeholder.replaceAll(/^<|>$/g, '');
		} else {
			argument = inferFlagArgument(type);
		}

		let description = typeof cfg.description === 'string' ? cfg.description : '';
		if ('default' in cfg) {
			let defaultValue = cfg.default;
			if (typeof defaultValue === 'function') {
				defaultValue = (defaultValue as () => unknown)();
			}
			if (defaultValue !== undefined) {
				description += ` (default: ${JSON.stringify(defaultValue)})`;
			}
		}

		const aliasRaw = cfg.alias;
		const aliasShort = typeof aliasRaw === 'string' && aliasRaw
			? aliasRaw
			: (Array.isArray(aliasRaw) && typeof aliasRaw[0] === 'string' ? aliasRaw[0] : undefined);

		// Single-char flag names are short flags (-x), not long flags (--x)
		if (name.length === 1) {
			return {
				short: name,
				arg: argument,
				description: description || undefined,
			} satisfies Flag;
		}

		return {
			long: `--${kebabName}`,
			short: aliasShort,
			arg: argument,
			description: description || undefined,
		} satisfies Flag;
	});
};
