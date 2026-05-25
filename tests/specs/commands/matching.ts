import { describe, test, expect } from 'manten';
import { spy } from 'nanospy';
import { cli } from '#cleye';
import { mockEnvFunctions } from '../../utils/mock-env-functions.ts';

describe('error handling', () => {
	test('duplicate command alias', () => {
		// Use argv that triggers alias resolution (not a direct command name match)
		expect(
			() => cli(
				{
					commands: {
						commandA: {
							alias: 'dup',
							loader: () => {},
						},
						commandB: {
							alias: 'dup',
							loader: () => {},
						},
					},
				},
				undefined,
				['dup'],
			),
		).toThrow('Duplicate command alias: "dup"');
	});

	test('duplicate alias across array aliases', () => {
		expect(
			() => cli(
				{
					commands: {
						commandA: {
							alias: ['a', 'shared'],
							loader: () => {},
						},
						commandB: {
							alias: 'shared',
							loader: () => {},
						},
					},
				},
				undefined,
				['shared'],
			),
		).toThrow('Duplicate command alias: "shared"');
	});

	test('alias cannot shadow an existing command name', () => {
		expect(
			() => cli(
				{
					commands: {
						build: () => {},
						test: {
							alias: 'build',
							loader: () => {},
						},
					},
				},
				undefined,
				['build'],
			),
		).toThrow('Duplicate command alias: "build"');
	});
}, { parallel: false });

describe('command matching', () => {
	test('invoking command by name', async () => {
		const callback = spy();

		const parsed = cli({
			commands: {
				commandA: () => {
					callback();
				},
			},
		}, undefined, ['commandA']);

		await parsed.runCommand();
		expect(parsed.command).toBe('commandA');
		expect(callback.called).toBe(true);
	});

	test('invoking command via alias string', async () => {
		const callback = spy();

		const parsed = cli({
			commands: {
				commandA: {
					alias: 'a',
					loader: () => {
						callback();
					},
				},
			},
		}, undefined, ['a']);

		expect(parsed.command).toBe('commandA');
		await parsed.runCommand();
		expect(callback.called).toBe(true);
	});

	test('invoking command via alias array', async () => {
		const callback = spy();

		const parsed = cli({
			commands: {
				commandA: {
					alias: ['a', 'b'],
					loader: () => {
						callback();
					},
				},
			},
		}, undefined, ['b']);

		expect(parsed.command).toBe('commandA');
		await parsed.runCommand();
		expect(callback.called).toBe(true);
	});

	test('unknown command shows help and exits', async () => {
		const mocked = mockEnvFunctions();

		cli({
			name: 'my-cli',
			commands: {
				build: () => {},
				test: () => {},
			},
		}, undefined, ['unknown']);

		mocked.restore();

		expect(mocked.consoleLog.called).toBe(true);
		expect(mocked.processExit.calls[0]).toStrictEqual([1]);
	});

	test('no argv shows help and exits', async () => {
		const mocked = mockEnvFunctions();

		cli({
			name: 'my-cli',
			commands: {
				build: () => {},
			},
		}, undefined, []);

		mocked.restore();

		expect(mocked.consoleLog.called).toBe(true);
		expect(mocked.processExit.calls[0]).toStrictEqual([1]);
	});

	test('Object.prototype keys are not matched as commands', async () => {
		const mocked = mockEnvFunctions();

		cli({
			name: 'my-cli',
			commands: {
				build: () => {},
			},
		}, undefined, ['toString']);

		mocked.restore();

		expect(mocked.consoleLog.called).toBe(true);
		expect(mocked.processExit.calls[0]).toStrictEqual([1]);
	});
}, { parallel: false });

describe('command vs flag ambiguity', () => {
	test('command name takes priority over flag name', async () => {
		const commandCallback = spy();

		const parsed = cli({
			flags: {
				test: Boolean,
			},
			commands: {
				test: () => {
					commandCallback();
				},
			},
		}, undefined, ['test']);

		await parsed.runCommand();
		// It should be parsed as the command
		expect(parsed.command).toBe('test');

		// Command auto-invoked
		expect(commandCallback.called).toBe(true);
	});
}, { parallel: false });

describe('command description', () => {
	test('full form command with description', async () => {
		const callback = spy();

		const parsed = cli({
			commands: {
				install: {
					description: 'Install packages',
					alias: ['i'],
					loader: () => {
						callback();
					},
				},
			},
		}, undefined, ['i']);

		await parsed.runCommand();
		expect(parsed.command).toBe('install');
		expect(callback.called).toBe(true);
	});
}, { parallel: false });

describe('context', () => {
	test('parsed argv does not have context property', async () => {
		const parsed = cli({}, undefined, []);

		expect('context' in parsed).toBe(false);
	});
}, { parallel: false });

describe('help on no command match', () => {
	test('shows help and exits when no command matched and no callback', async () => {
		const mocked = mockEnvFunctions();

		cli({
			name: 'my-cli',
			commands: {
				build: () => {},
				test: () => {},
			},
		}, undefined, []);

		mocked.restore();

		expect(mocked.consoleLog.called).toBe(true);
		expect(mocked.consoleLog.calls[0][0]).toContain('my-cli');
		expect(mocked.processExit.calls[0]).toStrictEqual([1]);
	});

	test('shows help when flags passed but no command matched', async () => {
		const mocked = mockEnvFunctions();

		cli({
			name: 'my-cli',
			flags: { verbose: Boolean },
			commands: {
				build: () => {},
			},
		}, undefined, ['--verbose']);

		mocked.restore();

		expect(mocked.consoleLog.called).toBe(true);
		expect(mocked.processExit.calls[0]).toStrictEqual([1]);
	});

	test('does not show help when command is matched', async () => {
		const mocked = mockEnvFunctions();
		const commandHandler = spy();

		const parsed = cli({
			name: 'my-cli',
			commands: {
				build: () => {
					commandHandler();
				},
			},
		}, undefined, ['build']);

		await parsed.runCommand();
		mocked.restore();

		expect(commandHandler.called).toBe(true);
		expect(mocked.processExit.called).toBe(false);
	});

	test('does not show help when callback is provided', async () => {
		const mocked = mockEnvFunctions();

		await cli(
			{
				name: 'my-cli',
				commands: {
					build: () => {},
				},
			},
			() => {
				// Callback handles the no-match case
			},
			[],
		);

		mocked.restore();

		expect(mocked.processExit.called).toBe(false);
	});
}, { parallel: false });

describe('command name edge cases', () => {
	test('command name with numbers', () => {
		expect(() => cli({
			commands: {
				cmd1: () => {},
			},
		}, undefined, ['cmd1'])).not.toThrow();
	});

	test('command name with dash', () => {
		expect(() => cli({
			commands: {
				'my-command': () => {},
			},
		}, undefined, ['my-command'])).not.toThrow();
	});

	test('command name with underscore', () => {
		expect(() => cli({
			commands: {
				my_command: () => {},
			},
		}, undefined, ['my_command'])).not.toThrow();
	});
}, { parallel: false });

describe('wildcard dispatch', () => {
	test('parses flags after an unknown command candidate', () => {
		const parsed = cli({
			parameters: ['[param]'],
			flags: {
				json: Boolean,
			},
			commands: {
				build: () => {},
			},
		}, undefined, ['unknown-command', '--json']);

		expect(parsed.command).toBeUndefined();
		expect(Array.from(parsed._)).toStrictEqual(['unknown-command']);
		expect(parsed._.param).toBe('unknown-command');
		expect(parsed.flags.json).toBe(true);
	});

	test('parses flags before an unknown command candidate', () => {
		const parsed = cli({
			parameters: ['[param]'],
			flags: {
				json: Boolean,
			},
			commands: {
				build: () => {},
			},
		}, undefined, ['--json', 'unknown-command']);

		expect(parsed.command).toBeUndefined();
		expect(Array.from(parsed._)).toStrictEqual(['unknown-command']);
		expect(parsed._.param).toBe('unknown-command');
		expect(parsed.flags.json).toBe(true);
	});
});
