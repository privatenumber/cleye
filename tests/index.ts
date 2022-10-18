import { describe } from 'manten';

describe('get-tsconfig', ({ runTestSuite }) => {
	runTestSuite(import('./specs/cli'));
	runTestSuite(import('./specs/flags'));
	runTestSuite(import('./specs/arguments'));
	runTestSuite(import('./specs/command'));
	runTestSuite(import('./specs/help'));
});
