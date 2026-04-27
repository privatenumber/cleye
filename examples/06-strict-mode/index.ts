/**
 * Strict mode — `strictFlags` + `strictCommands`.
 *
 * cleye refuses unknown flags / commands and suggests close matches when
 * possible. With aliases, the suggestion surfaces the canonical name.
 *
 * Usage:
 *  node examples/06-strict-mode/index.ts build         # ok
 *  node examples/06-strict-mode/index.ts biuld         # → "Did you mean 'build'?"
 *  node examples/06-strict-mode/index.ts add           # ok (alias for install)
 *  node examples/06-strict-mode/index.ts adde          # → "add (alias for install)"
 *  node examples/06-strict-mode/index.ts build --watch # ok
 *  node examples/06-strict-mode/index.ts build --wathc # → "Did you mean --watch?"
 */

import { cli } from '#cleye';

await cli({
	name: 'strict-mode-example',

	// Reject unknown flags with a typo suggestion. Inherited by nested cli()
	// calls (see commands/build.ts).
	strictFlags: true,

	// Same idea for commands. Without this, an unknown leading positional
	// falls through to the help-on-no-match path silently.
	strictCommands: true,

	commands: {
		// Shorthand: when there's no alias/description, just point at the loader.
		build: () => import('./commands/build.ts'),
		install: {
			// Aliases also benefit from typo suggestions. When the closest
			// match is an alias, cleye surfaces the canonical name too:
			// `Did you mean "add" (alias for "install")?`
			alias: ['add', 'i'],
			loader: () => import('./commands/install.ts'),
		},
	},
}, () => {
	// Callback runs first; matched command auto-invokes after this returns.
});
