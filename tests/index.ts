import tty from 'tty';
import { describe } from 'manten';

const stdoutHasColors = tty.WriteStream.prototype.hasColors();
console.log({ stdoutHasColors });

process.stdout.columns = Number.POSITIVE_INFINITY;

describe('cleye', ({ runTestSuite }) => {
	runTestSuite(import('./specs/cli.js'));
	runTestSuite(import('./specs/flags.js'));
	runTestSuite(import('./specs/arguments.js'));
	runTestSuite(import('./specs/command.js'));
	runTestSuite(import('./specs/help.js'));
});
