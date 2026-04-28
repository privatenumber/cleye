import { describe, test, expect } from 'manten';
import { cli } from '#cleye';
import { mockEnvFunctions } from '../../utils/mock-env-functions.ts';

describe('user-defined help/h flags', () => {
	test('does not inject -h when an existing flag aliases h', async () => {
		// When a user flag declares `alias: 'h'`, cleye must not also inject
		// its own `-h` short — the user owns that flag, and `-h` parses as
		// theirs (no auto help-shown).
		const mocked = mockEnvFunctions();
		await cli(
			{
				flags: {
					help: {
						type: Boolean,
						alias: 'h',
						description: 'Print this message.',
					},
				},
			},
			(parsed) => {
				expect(parsed.flags.help).toBe(true);
			},
			['-h'],
		);
		mocked.restore();
		expect(mocked.processExit.called).toBe(false);
		expect(mocked.consoleLog.called).toBe(false);
	});

	test('user-defined help: Boolean — --help does not auto-show help', async () => {
		const mocked = mockEnvFunctions();
		await cli(
			{
				flags: {
					help: Boolean,
				},
			},
			(parsed) => {
				expect(parsed.flags.help).toBe(true);
			},
			['--help'],
		);
		mocked.restore();
		expect(mocked.processExit.called).toBe(false);
		expect(mocked.consoleLog.called).toBe(false);
	});

	test('user-defined h: Boolean — -h does not auto-show help', async () => {
		const mocked = mockEnvFunctions();
		await cli(
			{
				flags: {
					h: Boolean,
				},
			},
			(parsed) => {
				expect((parsed.flags as { h?: boolean }).h).toBe(true);
			},
			['-h'],
		);
		mocked.restore();
		expect(mocked.processExit.called).toBe(false);
		expect(mocked.consoleLog.called).toBe(false);
	});

	test('user-defined help with non-boolean type — value passes through', async () => {
		const mocked = mockEnvFunctions();
		await cli(
			{
				flags: {
					help: String,
				},
			},
			(parsed) => {
				expect(parsed.flags.help).toBe('verbose');
			},
			['--help', 'verbose'],
		);
		mocked.restore();
		expect(mocked.processExit.called).toBe(false);
		expect(mocked.consoleLog.called).toBe(false);
	});

	test('user-defined version: Boolean — --version does not auto-show version', async () => {
		const mocked = mockEnvFunctions();
		await cli(
			{
				version: '1.0.0',
				flags: {
					version: Boolean,
				},
			},
			(parsed) => {
				expect(parsed.flags.version).toBe(true);
			},
			['--version'],
		);
		mocked.restore();
		expect(mocked.processExit.called).toBe(false);
		expect(mocked.consoleLog.called).toBe(false);
	});
}, { parallel: false });
