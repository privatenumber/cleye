/**
 * Positional parameters — `<required>`, `[optional]`, `<spread...>`.
 *
 * Reimplements a `cp`-style invocation: `<source> <destination> [extras...]`.
 * Names are camelCased on `argv._` (so `<source-file>` → `argv._.sourceFile`).
 *
 * Parameter shape rules:
 *   - `<name>`     — required (parse fails if missing)
 *   - `[name]`     — optional (resolved value or `undefined`)
 *   - `<name...>`  — required spread; at least one value
 *   - `[name...]`  — optional spread; zero or more values
 *
 * Required parameters cannot follow optional ones; spread must be last.
 *
 * Usage:
 *  node examples/02-parameters/index.ts a.txt b.txt
 *  node examples/02-parameters/index.ts a.txt b.txt c.txt d.txt
 *  node examples/02-parameters/index.ts a.txt           # → "missing required parameter"
 */

import { cli } from '#cleye';

await cli({
	name: 'cp',
	parameters: [
		'<source>',
		'<destination>',
		// Spread soaks up any remaining positionals into a string[].
		'[extras...]',
	],
}, (argv) => {
	console.log({
		source: argv._.source,
		destination: argv._.destination,
		extras: argv._.extras,
	});
});
