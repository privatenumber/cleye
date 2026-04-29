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
	import('./specs/camel-case.ts');
	import('./specs/find-closest.ts');
	import('./specs/parse-parameters.ts');
	import('./specs/promise-helpers.ts');
	import('./specs/build-name-index.ts');
});
