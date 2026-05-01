// Definitions and resolution for the flags cleye auto-injects when the user
// enables `version` or doesn't disable help. Single source of truth for the
// injection rule, used by both `cli.ts` (parsing pipeline) and
// `render/default-help.ts` (standalone help renderer).

import type { CliOptions } from '../types.ts';
import { buildNameIndex, getFlagAlias } from './build-name-index.ts';

/**
 * Names of the flags cleye auto-injects. Centralized so all consumers agree
 * on which keys to inject and which user-defined keys disable auto-injection.
 */
export const AUTO_FLAG = {
	version: 'version',
	help: 'help',
	helpShort: 'h',
} as const;

export type InjectedFlag = typeof AUTO_FLAG[keyof typeof AUTO_FLAG];

export const autoFlagVersion = {
	type: Boolean,
	description: 'Show version',
} as const;

export const autoFlagShortHelp = {
	type: Boolean,
	description: 'Show short help',
} as const;

export const autoFlagLongHelp = {
	type: Boolean,
	description: 'Show help',
} as const;

/**
 * Mutate `flags` in place, adding the auto-injected `--version`, `--help`,
 * and `-h` entries — but only if the user hasn't claimed those names
 * themselves (as a flag name OR an alias). Respects `options.help === false`.
 *
 * Returns the set of names cleye actually injected so cli() can distinguish
 * "user passed --help" from "cleye observed --help".
 */
export const resolveAutoFlags = (
	flags: Record<string, unknown>,
	options: CliOptions,
): Set<InjectedFlag> => {
	const injectedFlags = new Set<InjectedFlag>();
	const userFlagNames = buildNameIndex(flags, getFlagAlias).names;
	const isHelpEnabled = options.help !== false;

	if (options.version && !userFlagNames.has(AUTO_FLAG.version)) {
		flags[AUTO_FLAG.version] = autoFlagVersion;
		injectedFlags.add(AUTO_FLAG.version);
	}
	if (isHelpEnabled && !userFlagNames.has(AUTO_FLAG.helpShort)) {
		flags[AUTO_FLAG.helpShort] = autoFlagShortHelp;
		injectedFlags.add(AUTO_FLAG.helpShort);
	}
	if (isHelpEnabled && !userFlagNames.has(AUTO_FLAG.help)) {
		flags[AUTO_FLAG.help] = autoFlagLongHelp;
		injectedFlags.add(AUTO_FLAG.help);
	}

	return injectedFlags;
};
