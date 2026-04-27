import { cli } from '#cleye';

// Each subcommand calls its own `cli()` to parse the argv after the
// command name. The parent passes those argv tokens through context.
await cli({
	flags: {
		global: {
			type: Boolean,
			alias: 'g',
		},
		saveProd: String,
		saveDev: {
			type: Boolean,
			alias: 'D',
		},
		saveOptional: Boolean,
		saveExact: Boolean,
		noSave: Boolean,
	},

	help: {
		description: 'Install a package',

		examples: [
			'npm install (with no args, in package dir)',
			'npm install [<@scope>/]<pkg>',
			'npm install [<@scope>/]<pkg>@<tag>',
			'npm install [<@scope>/]<pkg>@<version>',
			'npm install [<@scope>/]<pkg>@<version range>',
			'npm install <alias>@npm:<name>',
			'npm install <folder>',
			'npm install <tarball file>',
			'npm install <tarball url>',
			'npm install <git:// url>',
			'npm install <github username>/<github project>',
		],
	},
}, (argv) => {
	console.log('install!', argv);
});
