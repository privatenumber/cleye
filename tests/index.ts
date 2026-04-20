import { describe } from 'manten';

process.stdout.columns = Number.POSITIVE_INFINITY;

describe('cleye', () => {
	import('./specs/cli.ts');
	import('./specs/flags.ts');
	import('./specs/arguments.ts');
	import('./specs/command.ts');
	import('./specs/help.ts');
	import('./specs/renderers-simple.ts');
	import('./specs/renderers-responsive.ts');
	import('./specs/types.ts');
	import('./specs/integration.ts');
	import('./specs/edge-cases.ts');
	import('./specs/formats.ts');
	import('./specs/render.ts');
	import('./specs/atoms.ts');
});
