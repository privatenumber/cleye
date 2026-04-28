import { describe, test, expect } from 'manten';
import { spy } from 'nanospy';
import { cli } from '#cleye';
import { mockEnvFunctions } from '../../utils/mock-env-functions.ts';

describe('strictCommands', () => {
	test('known command still runs', () => {
		const parsed = cli({
			commands: {
				build: () => 'built',
			},
			strictCommands: true,
		}, undefined, ['build']);

		expect(parsed.command).toBe('build');
	});

	test('unknown command errors with close-match suggestion', () => {
		const mocked = mockEnvFunctions();

		cli({
			commands: {
				build: () => 'built',
			},
			strictCommands: true,
		}, undefined, ['biuld']);

		mocked.restore();

		expect(mocked.consoleError.calls[0]).toStrictEqual([
			'Error: Unknown command: "biuld". (Did you mean "build"?)',
		]);
		expect(mocked.processExit.calls[0]).toStrictEqual([1]);
	});

	test('unknown command with no close match omits suggestion', () => {
		const mocked = mockEnvFunctions();

		cli({
			commands: {
				build: () => 'built',
			},
			strictCommands: true,
		}, undefined, ['xyzzy']);

		mocked.restore();

		expect(mocked.consoleError.calls[0]).toStrictEqual([
			'Error: Unknown command: "xyzzy".',
		]);
		expect(mocked.processExit.calls[0]).toStrictEqual([1]);
	});

	test('suggests the closest alias and surfaces its canonical name', () => {
		const mocked = mockEnvFunctions();

		cli({
			commands: {
				install: {
					alias: 'add',
					loader: () => 'installed',
				},
			},
			strictCommands: true,
		}, undefined, ['adde']);

		mocked.restore();

		expect(mocked.consoleError.calls[0]).toStrictEqual([
			'Error: Unknown command: "adde". (Did you mean "add" (alias for "install")?)',
		]);
		expect(mocked.processExit.calls[0]).toStrictEqual([1]);
	});

	test('on a distance tie, prefers canonical over alias', () => {
		const mocked = mockEnvFunctions();

		// `app` (canonical) and `apt` (alias for `installer`) both at distance 1
		// from `apx`. Canonical wins — message must NOT contain "alias for".
		cli({
			commands: {
				app: () => 'app',
				installer: {
					alias: 'apt',
					loader: () => 'installer',
				},
			},
			strictCommands: true,
		}, undefined, ['apx']);

		mocked.restore();

		expect(mocked.consoleError.calls[0]?.[0]).toMatch(/Did you mean "app"\?/);
		expect(mocked.consoleError.calls[0]?.[0]).not.toMatch(/alias for/);
	});

	test('correctly-typed alias resolves and does NOT trigger strictCommands', () => {
		const mocked = mockEnvFunctions();

		const parsed = cli({
			commands: {
				install: {
					alias: ['add', 'i'],
					loader: () => 'installed',
				},
			},
			strictCommands: true,
		}, undefined, ['add']);

		mocked.restore();

		// Alias resolved to canonical command — no error, no exit.
		expect(parsed.command).toBe('install');
		expect(mocked.consoleError.called).toBe(false);
		expect(mocked.processExit.called).toBe(false);
	});

	test('fires before the callback path in callback mode', async () => {
		const mocked = mockEnvFunctions();
		const callbackSpy = spy();

		await cli({
			commands: {
				build: () => 'built',
			},
			strictCommands: true,
		}, () => {
			callbackSpy();
		}, ['biuld']);

		mocked.restore();

		// Callback should never run — strictCommands exits first.
		expect(callbackSpy.called).toBe(false);
		expect(mocked.consoleError.calls[0]?.[0]).toMatch(/Unknown command: "biuld"/);
		expect(mocked.processExit.calls[0]).toStrictEqual([1]);
	});

	test('with empty argv, falls through to help-on-no-match (no "Unknown command" error)', () => {
		const mocked = mockEnvFunctions();

		// `if (potentialCommand)` guard false branch: nothing was attempted as
		// a command, so strictCommands stays out of the way.
		cli({
			commands: {
				build: () => 'built',
			},
			strictCommands: true,
		}, undefined, []);

		mocked.restore();

		expect(mocked.consoleError.called).toBe(false);
		expect(mocked.processExit.calls[0]).toStrictEqual([1]);
	});

	test('with flag-only argv, falls through to help-on-no-match', () => {
		const mocked = mockEnvFunctions();

		// Flags are consumed by typeFlag; `parsed._[0]` is undefined → no
		// command attempted → strictCommands does not fire.
		cli({
			flags: {
				verbose: Boolean,
			},
			commands: {
				build: () => 'built',
			},
			strictCommands: true,
		}, undefined, ['--verbose']);

		mocked.restore();

		expect(mocked.consoleError.called).toBe(false);
		expect(mocked.processExit.calls[0]).toStrictEqual([1]);
	});

	test('without strictCommands, no "Unknown command" error — help-on-no-match path runs instead', () => {
		const mocked = mockEnvFunctions();

		cli({
			commands: {
				build: () => 'built',
			},
		}, undefined, ['unkown']);

		mocked.restore();

		// No "Unknown command:" error written — help-on-no-match uses console.log.
		expect(mocked.consoleError.called).toBe(false);
		// Both paths still exit(1); the difference is the message.
		expect(mocked.processExit.calls[0]).toStrictEqual([1]);
	});

	test('inherits strictCommands from parent via context', async () => {
		const mocked = mockEnvFunctions();

		const parsed = cli({
			strictCommands: true,
			commands: {
				outer: () => {
					cli({
						commands: {
							inner: () => 'ok',
						},
					}, undefined, ['typo']);
				},
			},
		}, undefined, ['outer']);
		parsed.runCommand();
		mocked.restore();

		expect(mocked.consoleError.calls[0]?.[0]).toMatch(/Unknown command: "typo"/);
		expect(mocked.processExit.calls[0]).toStrictEqual([1]);
	});

	test('command can override inherited strictCommands to false', () => {
		const mocked = mockEnvFunctions();

		const parsed = cli({
			strictCommands: true,
			commands: {
				outer: () => {
					cli({
						commands: {
							inner: () => 'ok',
						},
						strictCommands: false,
					}, undefined, ['typo']);
				},
			},
		}, undefined, ['outer']);
		parsed.runCommand();
		mocked.restore();

		// Override silences the "Unknown command:" error; child still exits via help-on-no-match.
		expect(mocked.consoleError.called).toBe(false);
		expect(mocked.processExit.calls[0]).toStrictEqual([1]);
	});
}, { parallel: false });
