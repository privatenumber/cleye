import { describe } from 'manten';

describe('commands', () => {
	import('./matching.ts');
	import('./run-command.ts');
	import('./inheritance.ts');
	import('./strict-mode.ts');
	import('./coexistence.ts');
	import('./nested.ts');
	import('./types.ts');
}, { parallel: false });
