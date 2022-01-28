import { command } from '../../../src';

export const runScript = command({
	name: 'run-script',

	alias: ['run', 'rum', 'urn'],

	parameters: ['<command>', '--', '[args...]'],

	help: {
		description: 'Run a script',
	},
}, (argv) => {
	console.log('run', {
		command: argv._.command,
		args: argv._.args,
	});
});
