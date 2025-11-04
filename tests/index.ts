import { describe } from 'manten';

process.stdout.columns = Number.POSITIVE_INFINITY;

describe('cleye', ({ runTestSuite }) => {
	runTestSuite(import('./specs/cli.js'));
	runTestSuite(import('./specs/flags.js'));
	runTestSuite(import('./specs/arguments.js'));
	runTestSuite(import('./specs/command.js'));
	runTestSuite(import('./specs/help.js'));
	runTestSuite(import('./specs/types.js'));
});
