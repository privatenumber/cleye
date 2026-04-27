/**
 * Declarative help — `version`, `help.description`, `help.examples`.
 *
 * cleye auto-injects `--help` (and `-h` for a shorter form) plus `--version`
 * when you set `options.version`. Everything you declare on `options.help`
 * (description, usage, examples) renders into that auto-help. No atoms,
 * no custom rendering — just metadata.
 *
 * Vehicle: a tiny `cheat`-style — a CLI whose value really IS its help page.
 * Run `--help` to see the full output the metadata produces.
 *
 * Usage:
 *  node examples/04-help/index.ts --help        # full help, with description and examples
 *  node examples/04-help/index.ts -h            # short help, cheatsheet form
 *  node examples/04-help/index.ts --version     # auto-injected from `version`
 *  node examples/04-help/index.ts --topic tar
 */

import { cli } from '#cleye';

await cli({
	name: 'cheat',

	// Setting `version` auto-injects a `--version` flag. Pass via
	// `help.version` instead if you want it shown in --help only.
	version: '1.2.3',

	flags: {
		topic: {
			type: String,
			alias: 't',
			description: 'Cheat sheet topic',
			default: 'tar',
		},
	},

	help: {
		// `description` shows under the title in `--help` (long form).
		description: 'Quick command reminders for things you always forget.',

		// `examples` renders an "Examples:" section in `--help`. Strings as-is;
		// arrays let you mix headers (`# section`) with command lines.
		examples: [
			'# Extract a tarball',
			'cheat -t tar',
			'',
			'# Look up a different topic',
			'cheat --topic git-rebase',
		],
	},
}, (argv) => {
	console.log(`(pretend cheat sheet for: ${argv.flags.topic})`);
});
