/**
 * Names of the flags cleye auto-injects when the user enables `version` or
 * doesn't disable help. Centralized so cli.ts and default-help.ts agree on
 * which keys to inject and which user-defined keys disable auto-injection.
 */
export const AUTO_FLAG = {
	version: 'version',
	help: 'help',
	helpShort: 'h',
} as const;

/**
 * The end-of-flags sentinel in `options.parameters`. Tokens after `--` map
 * onto `parsed._['--']` instead of the main positional list.
 */
export const END_OF_FLAGS = '--';
