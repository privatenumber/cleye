import { describe } from 'manten';

describe('flags', () => {
	import('./parsing.ts');
	import('./auto-injection.ts');
	import('./unknown.ts');
	import('./boolean-negation.ts');
	import('./types.ts');
}, { parallel: false });
