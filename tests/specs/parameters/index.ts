import { describe } from 'manten';

describe('parameters', () => {
	import('./parsing.ts');
	import('./validation.ts');
	import('./end-of-flags.ts');
	import('./types.ts');
}, { parallel: false });
