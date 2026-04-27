/**
 * Hello, world — the absolute minimum.
 *
 * Just `cli()` with flags. No parameters, no commands. The simplest CLI cleye
 * can produce. This file fits on one screen on purpose.
 *
 * Usage:
 *  node examples/01-minimal/index.ts --shout
 *  node examples/01-minimal/index.ts --message "good evening"
 *  node examples/01-minimal/index.ts --help
 */

import { cli } from '#cleye';

await cli({
	name: 'minimal',

	// Each flag's value is a constructor (`String`, `Number`, `Boolean`) or
	// an object with `description`, `default`, `alias`, etc. Flag names use
	// camelCase here and kebab-case on the CLI (`shout` → `--shout`).
	flags: {
		message: {
			type: String,
			description: 'What to say',
			default: 'hello',
		},
		shout: {
			type: Boolean,
			description: 'Uppercase the output',
		},
	},
}, (argv) => {
	// `argv.flags` is fully typed: message is `string`, shout is `boolean | undefined`.
	const output = argv.flags.shout ? argv.flags.message.toUpperCase() : argv.flags.message;
	console.log(output);
});
