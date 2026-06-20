import { describe } from 'manten';

describe('flags', () => {
	import('./parsing.ts');
	import('./auto-injection.ts');
	import('./unknown.ts');
	import('./boolean-negation.ts');
	import('./standard-schema.ts');
	import('./group.ts');
	import('./types.ts');
}, { parallel: false });
