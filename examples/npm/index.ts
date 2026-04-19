/**
 * Demo showing how `npm i --help` can be re-implemented with cleye
 *
 * Usage:
 *  npx esno examples/npm i --help
 */

import { cli } from '#cleye';

await cli({
	name: 'npm',

	commands: {
		install: {
			description: 'Install a package',
			alias: ['i', 'isntall', 'add'],
			loader: () => import('./commands/install.ts'),
		},
		'run-script': {
			description: 'Run a script',
			alias: ['run', 'rum', 'urn'],
			loader: () => import('./commands/run-script.ts'),
		},
	},
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
