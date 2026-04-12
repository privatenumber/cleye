/**
 * Demo showing how `npm i --help` can be re-implemented with cleye
 *
 * Usage:
 *  npx esno examples/npm i --help
 */

import { install } from './commands/install.ts';
import { runScript } from './commands/run-script.ts';
import { cli } from '#cleye';

const argv = cli({
	name: 'npm',

	commands: [
		install,
		runScript,
	],
});

// Type narrowing by command name
if (argv.command === 'install') {
	console.log(argv.flags);
} else {
	console.log(argv.flags);
}
