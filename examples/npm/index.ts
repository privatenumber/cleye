/**
 * Demo showing how `npm i --help` can be re-implemented with cleye
 *
 * Usage:
 *  npx esno examples/npm i --help
 */

import { cli } from '../../src';
import { install } from './commands/install';

const argv = cli({
	name: 'npm',

	commands: [
		install,
	],
});

// Type narrowing by command name
if (argv.command === 'install') {
	console.log(argv.flags);
} else {
	console.log(argv.flags);
}
