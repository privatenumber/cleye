import { describe } from 'manten';

describe('commands', () => {
	import('./matching.ts');
	import('./run-command.ts');
	import('./inheritance.ts');
	import('./strict-mode.ts');
	import('./exclusion.ts');
	import('./nested.ts');
	import('./types.ts');
}, { parallel: false });
