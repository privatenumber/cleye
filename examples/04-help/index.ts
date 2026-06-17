/**
 * Declarative help — `version`, `help.description`, `help.examples`.
 *
 * cleye auto-injects `--help` (and `-h` for a shorter form) plus `--version`
 * when you set `options.version`. Everything you declare on `options.help`
 * (description, usage, examples) renders into that auto-help. No components,
 * no custom rendering — just metadata.
 *
 * Vehicle: a tiny weather CLI whose value is mostly its help page.
 * Run `--help` to see the full output the metadata produces.
 *
 * Usage:
 *  node examples/04-help/index.ts --help          # full help, with description and examples
 *  node examples/04-help/index.ts -h              # short help
 *  node examples/04-help/index.ts --version       # auto-injected from `version`
 *  node examples/04-help/index.ts --location Tokyo
 */

import { cli } from '#cleye';

await cli({
	name: 'weather',

	// Setting `version` auto-injects a `--version` flag. Pass via
	// `help.version` instead if you want it shown in --help only.
	version: '1.0.0',

	flags: {
		location: {
			type: String,
			alias: 'l',
			description: 'Location to forecast',
			default: 'here',
		},
	},

	help: {
		// `description` shows under the title in `--help` (long form).
		description: 'Show the local weather forecast.',

		// `examples` renders an "Examples:" section in `--help`. Strings as-is;
		// arrays let you mix headers (`# section`) with command lines.
		examples: [
			'# Forecast for your current location',
			'weather',
			'',
			'# A specific city — long flag or short alias',
			'weather --location Tokyo',
			'weather -l "New York"',
		],
	},
}, (argv) => {
	console.log(`(pretend forecast for: ${argv.flags.location})`);
});
