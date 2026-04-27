/**
 * Multi-command CLI — reimplementation of `npm install` + `npm run-script`.
 *
 * Demonstrates:
 *   - the `commands` map with descriptions and aliases
 *   - lazy loading via `loader: () => import(...)` (each command's module is
 *     only loaded when that command is invoked)
 *   - callback mode: matched commands auto-invoke after the callback returns
 *
 * Usage:
 *  node examples/05-npm/index.ts install --help
 *  node examples/05-npm/index.ts i lodash --save-dev
 *  node examples/05-npm/index.ts run lint
 */

import { cli } from '#cleye';

await cli({
	name: 'npm',

	commands: {
		install: {
			description: 'Install a package',

			// Aliases also accept typos like `isntall` — useful for muscle-
			// memory misfires. (Real npm does this.)
			alias: ['i', 'isntall', 'add'],

			// Lazy: `commands/install.ts` is only loaded when `install` (or an
			// alias) is the matched command. `cli --help` doesn't pay the cost.
			loader: () => import('./commands/install.ts'),
		},
		'run-script': {
			description: 'Run a script',
			alias: ['run', 'rum', 'urn'],
			loader: () => import('./commands/run-script.ts'),
		},
	},
}, () => {
	// Callback runs first; matched command auto-invokes after.
});
