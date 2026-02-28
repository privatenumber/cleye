import { describe } from 'manten';

process.stdout.columns = Number.POSITIVE_INFINITY;

describe('cleye', () => {
	import('./specs/cli.js');
	import('./specs/flags.js');
	import('./specs/arguments.js');
	import('./specs/command.js');
	import('./specs/help.js');
	import('./specs/types.js');
	import('./specs/integration.js');
	import('./specs/edge-cases.js');
});
