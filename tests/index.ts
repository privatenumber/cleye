import { describe } from 'manten';

process.stdout.columns = Number.POSITIVE_INFINITY;

describe('cleye', () => {
	import('./specs/cli-api/index.ts');
	import('./specs/flags/index.ts');
	import('./specs/parameters/index.ts');
	import('./specs/commands/index.ts');
	import('./specs/help/index.ts');
	import('./specs/exit/index.ts');
	import('./specs/integration.ts');
	import('./specs/formats.ts');
});
