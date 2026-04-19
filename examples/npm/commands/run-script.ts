import { cli } from '#cleye';

await cli({
	parameters: ['<command>', '--', '[args...]'],

	help: {
		description: 'Run a script',
	},
}, (argv) => {
	console.log('run', {
		command: argv._.command,
		args: argv._.args,
	});
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
