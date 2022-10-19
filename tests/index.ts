import { describe } from 'manten';

// For CLI tools to render without ascii codes
process.env.CI = '1';

describe('cleye', ({ runTestSuite }) => {
	runTestSuite(import('./specs/cli.js'));
	runTestSuite(import('./specs/flags.js'));
	runTestSuite(import('./specs/arguments.js'));
	runTestSuite(import('./specs/command.js'));
	runTestSuite(import('./specs/help.js'));
});
