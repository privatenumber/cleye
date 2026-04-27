/**
 * Passing flags from parent to subcommand — minimal git reimplementation.
 *
 * Real git accepts top-level flags (`-C <path>`, `--no-pager`) BEFORE the
 * subcommand. Those flags contextualize whatever subcommand runs after.
 * cleye supports this via `runCommand(data)`: the parent's callback receives
 * the parsed parent flags, then explicitly passes whatever the sub needs.
 *
 * Demonstrates:
 *   - parent-level flags that contextualize subcommands
 *   - `runCommand(data)` passing typed data into the matched subcommand
 *   - default-export command style (required when the parent passes data)
 *   - `booleanFlagNegation` for `--no-pager`
 *
 * Usage:
 *  node examples/07-git/index.ts status
 *  node examples/07-git/index.ts -C /tmp status --short
 *  node examples/07-git/index.ts --no-pager log --oneline
 */

import { cli } from '#cleye';

await cli({
	name: 'git',

	// Top-level flags that apply to whichever subcommand runs.
	flags: {
		// Single-char flag — type-flag v5 lets us declare `-C` directly as a
		// key. Using a multi-char key (e.g. `c: ...`) would auto-generate the
		// kebab-case `--c` form too; here we want only `-C`.
		C: {
			type: String,
			description: 'Run as if started in <path>',
			placeholder: '<path>',
			default: '.',
		},
		// Real git only has `--no-pager`, not `--pager`, so we declare the
		// negative form directly. `noPager` becomes `--no-pager` on the CLI
		// (camelCase → kebab-case auto-conversion).
		noPager: {
			type: Boolean,
			description: 'Disable the pager',
		},
	},

	commands: {
		status: () => import('./commands/status.ts'),
		log: () => import('./commands/log.ts'),
	},
}, async ({ flags, runCommand }) => {
	// The KEY pattern: pass the parent's parsed flags down to the matched
	// subcommand via `runCommand(data)`. The sub's default export receives
	// this as its first argument (see commands/status.ts and commands/log.ts).
	//
	// Calling runCommand explicitly also opts out of auto-invoke — cleye
	// won't run the matched command a second time after this callback returns.
	await runCommand({
		cwd: flags.C,
		pager: !flags.noPager,
	});
});
