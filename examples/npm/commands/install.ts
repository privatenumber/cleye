import { command } from '../../../src';

export const install = command({
	name: 'install',

	alias: ['i', 'isntall', 'add'],

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
