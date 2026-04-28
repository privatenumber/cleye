import { describe } from 'manten';

describe('help', () => {
	import('./output.ts');
	import('./two-tier.ts');
	import('./user-overrides.ts');
	import('./render.ts');
	import('./atoms.ts');
	import('./default-renderer.ts');
	import('./responsive.ts');
}, { parallel: false });
