import { flagNameToKebab } from 'type-flag/internal';
import type { Flags } from '../types.ts';
import { getFlagAlias } from '../utils/build-name-index.ts';
import { getDefaultDescription, isFlagConfigObject } from '../utils/flag-defaults.ts';
import type { Flag } from './components.ts';

type FlagEntry = readonly [name: string, kebabName: string];

type FlagsToComponentListOptions = {
	includeDefaultDescriptions?: boolean;
};

type HelpFlagConfig = {
	alias?: unknown;
	default?: unknown;
	description?: unknown;
	placeholder?: unknown;
	type?: unknown;
};

const flagNameSorter = new Intl.Collator('en', {
	numeric: true,
	sensitivity: 'base',
});

const normalizeFlagConfig = (config: unknown): HelpFlagConfig => (
	isFlagConfigObject(config) ? config : { type: config }
);

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
	// Type functions (e.g. `OneOf` from `cleye/formats`) may advertise a
	// `placeholder` describing the values they accept; otherwise fall back
	// to a generic `<value>`. Optional-chain so a nullish type (e.g. an
	// empty `[]` array element) falls through instead of throwing.
	const advertised = (typeValue as { placeholder?: unknown })?.placeholder;
	return typeof advertised === 'string' ? advertised : 'value';
};

/**
 * Convert a user-declared flag config map into the `Flag[]` shape the help
 * components render. Sorts naturally by displayed name, infers `<arg>`
 * labels, optionally appends `(default: ...)` to descriptions, and routes
 * single-char names through the short-flag (`-x`) path.
 */
export const flagsToComponentList = (
	rawFlags: Flags,
	{ includeDefaultDescriptions = true }: FlagsToComponentListOptions = {},
): Flag[] => {
	const flagEntries = Object.keys(rawFlags)
		.map((name): FlagEntry => [name, flagNameToKebab(name)])
		.sort((a, b) => flagNameSorter.compare(a[1], b[1]));
	return flagEntries.map(([name, kebabName]) => {
		const config = rawFlags[name];
		const cfg = normalizeFlagConfig(config);
		const type = cfg.type ?? config;

		let argument: string | undefined;
		if ('placeholder' in cfg && typeof cfg.placeholder === 'string') {
			argument = cfg.placeholder.replaceAll(/^<|>$/g, '');
		} else {
			argument = inferFlagArgument(type);
		}

		let description = typeof cfg.description === 'string' ? cfg.description : '';
		if (includeDefaultDescriptions && 'default' in cfg) {
			const defaultDescription = getDefaultDescription(cfg.default);
			if (defaultDescription !== undefined) {
				// Don't emit a leading space when there's no user description:
				// `wrap` no longer strips it, and it would misalign the column.
				const defaultText = `(default: ${defaultDescription})`;
				description = description ? `${description} ${defaultText}` : defaultText;
			}
		}

		const aliasShort = getFlagAlias(cfg, name);

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
