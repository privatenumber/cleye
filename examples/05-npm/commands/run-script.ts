import { cli } from '#cleye';

// `--` doesn't need to be declared in `parameters`. Anything after a literal
// `--` is always captured into `argv._['--']`, regardless of declaration.
// (`npm run test -- --watch` → `--watch` lands in `argv._['--']`.)
await cli({
	parameters: ['<command>'],

	help: {
		description: 'Run a script',
	},
}, (argv) => {
	console.log('run', {
		command: argv._.command,
		args: argv._['--'],
	});
});
