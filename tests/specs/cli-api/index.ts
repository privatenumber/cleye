import { describe } from 'manten';

describe('cli api', () => {
	import('./invocation.ts');
	import('./callback.ts');
	import('./sync-mode.ts');
	import('./script-name.ts');
	import('./types.ts');
}, { parallel: false });
