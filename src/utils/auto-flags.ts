// Definitions for the flags cleye auto-injects when the user enables `version`
// or doesn't disable help. Imported by `cli.ts` (which mutates the real flags
// object based on user-defined collisions) and by `render/default-help.ts`
// (which injects the same defaults when called standalone, e.g. as
// `defaultHelp({...})` outside cli's auto-injection path).

/**
 * Names of the flags cleye auto-injects. Centralized so cli.ts and
 * default-help.ts agree on which keys to inject and which user-defined keys
 * disable auto-injection.
 */
export const AUTO_FLAG = {
	version: 'version',
	help: 'help',
	helpShort: 'h',
} as const;

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
