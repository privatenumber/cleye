import { setImmediate } from 'node:timers/promises';
import { describe, test, expect } from 'manten';
import { spy } from 'nanospy';
import { mockEnvFunctions } from '../utils/mock-env-functions.ts';
import { cli, command } from '#cleye';

describe('command', () => {
	describe('error handling', () => {
		test('missing options', async () => {
			expect(() => {
				// @ts-expect-error no options
				command();
			}).toThrow('Command options are required');
		});

		test('missing command name', async () => {
			expect(() => {
				// @ts-expect-error no name
				command({});
			}).toThrow('Command name is required');
		});

		test('empty command name', async () => {
			expect(() => {
				command({
					name: '',
				});
			}).toThrow('Invalid command name ""');
		});

		test('invalid command name', async () => {
			expect(() => {
				command({
					name: 'a b c',
				});
			}).toThrow('Invalid command name "a b c". Command names must be one word.');
		});

		test('duplicate command name', async () => {
			await expect(cli(
				{
					commands: [
						command({
							name: 'duplicate',
						}),
						command({
							name: 'duplicate',
						}),
					],
				},
				undefined,
				['commandA', '--flagA', 'valueA'],
			)).rejects.toThrow('Duplicate command name found: "duplicate"');
		});

		test('duplicate command alias', async () => {
			await expect(cli(
				{
					commands: [
						command({
							name: 'duplicate',
						}),
						command({
							name: 'command',
							alias: 'duplicate',
						}),
					],
				},
				undefined,
				['commandA', '--flagA', 'valueA'],
			)).rejects.toThrow('Duplicate command name found: "duplicate"');
		});

		test('empty alias string is ignored', async () => {
			const callback = spy();
			const commandA = command({
				name: 'commandA',
				alias: '',
			}, callback);

			const parsed = await cli(
				{
					commands: [commandA],
				},
				undefined,
				['commandA'],
			);

			expect(parsed.command).toBe('commandA');
			expect(callback.called).toBe(true);
		});

		test('empty alias array is ignored', async () => {
			const callback = spy();
			const commandA = command({
				name: 'commandA',
				alias: [],
			}, callback);

			const parsed = await cli(
				{
					commands: [commandA],
				},
				undefined,
				['commandA'],
			);

			expect(parsed.command).toBe('commandA');
			expect(callback.called).toBe(true);
		});
	});

	describe('command', () => {
		test('invoking command', async () => {
			const callback = spy();

			const commandA = command({
				name: 'commandA',
				flags: {
					flagA: String,
				},
			}, (parsed) => {
				expect<string | undefined>(parsed.flags.flagA);
				expect<boolean | undefined>(parsed.flags.help);
				callback();
			});

			const parsed = await cli(
				{
					commands: [
						commandA,
					],
				},
				undefined,
				['commandA', '--flagA', 'valueA'],
			);

			expect(parsed.command).toBe('commandA');

			// Narrow type
			if (parsed.command === 'commandA') {
				expect<string | undefined>(parsed.flags.flagA).toBe('valueA');

				// @ts-expect-error non exixtent property
				expect(parsed.flags.flagC);
			}

			expect(callback.called).toBe(true);
		});

		test('invoking command via alias', async () => {
			const callback = spy();

			const commandA = command({
				name: 'commandA',

				alias: 'a',

				flags: {
					flagA: String,
				},
			}, (parsed) => {
				expect<string | undefined>(parsed.flags.flagA);
				expect<boolean | undefined>(parsed.flags.help);
				callback();
			});

			const parsed = await cli(
				{
					commands: [
						commandA,
					],
				},
				undefined,
				['a', '--flagA', 'valueA'],
			);

			expect(parsed.command).toBe('commandA');

			// Narrow type
			if (parsed.command === 'commandA') {
				expect<string | undefined>(parsed.flags.flagA).toBe('valueA');

				// @ts-expect-error non exixtent property
				expect(parsed.flags.flagC);
			}

			expect(callback.called).toBe(true);
		});

		test('invoking command via alias array', async () => {
			const callback = spy();

			const commandA = command({
				name: 'commandA',

				alias: ['a', 'b'],

				flags: {
					flagA: String,
				},
			}, (parsed) => {
				expect<string | undefined>(parsed.flags.flagA);
				expect<boolean | undefined>(parsed.flags.help);
				callback();
			});

			const parsed = await cli(
				{
					commands: [
						commandA,
					],
				},
				undefined,
				['b', '--flagA', 'valueA'],
			);

			expect(parsed.command).toBe('commandA');

			// Narrow type
			if (parsed.command === 'commandA') {
				expect<string | undefined>(parsed.flags.flagA).toBe('valueA');

				// @ts-expect-error non exixtent property
				expect(parsed.flags.flagC);
			}

			expect(callback.called).toBe(true);
		});

		test('smoke', async () => {
			const callback = spy();

			const commandA = command({
				name: 'commandA',
				flags: {
					flagA: String,
				},
			}, (parsed) => {
				expect<string | undefined>(parsed.flags.flagA);
				expect<boolean | undefined>(parsed.flags.help);
			});

			const commandB = command({
				name: 'commandB',
				version: '1.0.0',
				parameters: ['<cmd a>', '[cmd-B]'],
				flags: {
					flagB: {
						type: String,
						default: 'true',
						description: 'flagB description',
					},
				},
			}, (parsed) => {
				expect<string>(parsed.flags.flagB);
				expect<boolean | undefined>(parsed.flags.help);
			});

			const argv = await cli(
				{
					version: '1.0.0',

					parameters: ['[parsed-A]', '[valueB]'],

					flags: {
						flagC: Number,
					},

					commands: [
						commandA,
						commandB,
					],
				},
				(parsed) => {
					expect<boolean | undefined>(parsed.flags.version);
					expect<boolean | undefined>(parsed.flags.help);
					expect<number | undefined>(parsed.flags.flagC);
					callback();
				},
				['--flagA', 'valueA', '--flagB', '123'],
			);

			if (argv.command === undefined) {
				expect<number | undefined>(argv.flags.flagC);
				expect<string | undefined>(argv._.parsedA);
				expect<string | undefined>(argv._.valueB);
			}

			if (argv.command === 'commandA') {
				expect<string | undefined>(argv.flags.flagA);

				// @ts-expect-error non exixtent property
				expect(argv.flags.flagC);
			}

			if (argv.command === 'commandB') {
				expect<string>(argv.flags.flagB);
				expect<boolean | undefined>(argv.flags.version);
				expect<string>(argv._.cmdA);
				expect<string | undefined>(argv._.cmdB);
			}

			expect(callback.called).toBe(true);
		});
	});

	describe('ignoreArgv', () => {
		test('ignore after arguments', async () => {
			const callback = spy();
			const argv = ['commandA', '--unknown', 'arg', '--help'];

			let receivedArgument = false;
			const commandA = command({
				name: 'commandA',
				flags: {
					flagA: String,
				},
				ignoreArgv(type) {
					if (receivedArgument) {
						return true;
					}
					if (type === 'argument') {
						receivedArgument = true;
						return true;
					}
				},
			}, (parsed) => {
				expect<(string | boolean)[]>(parsed.unknownFlags.unknown).toStrictEqual([true]);
				callback();
			});

			const parsed = await cli(
				{
					commands: [
						commandA,
					],
				},
				undefined,
				argv,
			);

			expect(parsed.command).toBe('commandA');

			// Narrow type
			if (parsed.command === 'commandA') {
				expect<(string | boolean)[]>(parsed.unknownFlags.unknown).toStrictEqual([true]);
			}

			expect(callback.called).toBe(true);
		});
	});

	describe('command vs flag ambiguity', () => {
		test('command name conflicts with flag name', async () => {
			const commandCallback = spy();
			const cliCallback = spy();

			const testCommand = command({
				name: 'test',
			}, commandCallback);

			const parsed = await cli(
				{
					flags: {
						test: Boolean, // Flag with the same name as the command
					},
					commands: [
						testCommand,
					],
				},
				cliCallback,
				['test'], // Ambiguous: command 'test' or flag '--test'?
			);

			// It should be parsed as the command
			expect(parsed.command).toBe('test');
			expect(commandCallback.called).toBe(true);
			expect(cliCallback.called).toBe(false);
		});
	});

	describe('async command callbacks', () => {
		test('cli awaits command callback completion', async () => {
			let commandCompleted = false;

			const testCommand = command({
				name: 'test',
			}, async () => {
				await setImmediate();
				commandCompleted = true;
			});

			await cli(
				{
					commands: [testCommand],
				},
				undefined,
				['test'],
			);

			expect(commandCompleted).toBe(true);
		});

		test('cli never resolves if command callback never resolves', async () => {
			let cliResolved = false;

			const testCommand = command({
				name: 'test',
			}, async () => {
				// Never resolve - hang forever
				await new Promise(() => {});
			});

			const cliPromise = cli(
				{
					commands: [testCommand],
				},
				undefined,
				['test'],
			).then(() => {
				cliResolved = true;
			});

			await Promise.race([cliPromise, setImmediate(50)]);

			expect(cliResolved).toBe(false);
		});
	});

	describe('strictFlags inheritance', () => {
		test('command inherits strictFlags from parent', async () => {
			const mocked = mockEnvFunctions();

			const buildCommand = command({
				name: 'build',
				flags: {
					watch: Boolean,
				},
			});

			await cli(
				{
					strictFlags: true,
					commands: [buildCommand],
				},
				undefined,
				['build', '--wathc'],
			);
			mocked.restore();

			expect(mocked.consoleError.called).toBe(true);
			expect(mocked.consoleError.calls[0][0]).toContain('--wathc');
			expect(mocked.consoleError.calls[0][0]).toContain('--watch');
			expect(mocked.processExit.calls).toStrictEqual([[1]]);
		});

		test('command can override strictFlags to false', async () => {
			const mocked = mockEnvFunctions();

			const buildCommand = command({
				name: 'build',
				flags: {
					watch: Boolean,
				},
				strictFlags: false,
			});

			const parsed = await cli(
				{
					strictFlags: true,
					commands: [buildCommand],
				},
				undefined,
				['build', '--unknown'],
			);
			mocked.restore();

			expect(mocked.consoleError.called).toBe(false);
			expect(mocked.processExit.called).toBe(false);
			expect(parsed.unknownFlags.unknown).toEqual([true]);
		});

		test('command can enable strictFlags independently', async () => {
			const mocked = mockEnvFunctions();

			const buildCommand = command({
				name: 'build',
				flags: {
					watch: Boolean,
				},
				strictFlags: true,
			});

			await cli(
				{
					commands: [buildCommand],
				},
				undefined,
				['build', '--wathc'],
			);
			mocked.restore();

			expect(mocked.consoleError.called).toBe(true);
			expect(mocked.processExit.calls).toStrictEqual([[1]]);
		});
	});

	describe('booleanFlagNegation inheritance', () => {
		test('command inherits booleanFlagNegation from parent', async () => {
			const buildCommand = command({
				name: 'build',
				flags: {
					watch: Boolean,
				},
			});

			const parsed = await cli(
				{
					booleanFlagNegation: true,
					commands: [buildCommand],
				},
				undefined,
				['build', '--no-watch'],
			);

			expect(parsed.command).toBe('build');
			if (parsed.command === 'build') {
				expect(parsed.flags.watch).toBe(false);
			}
		});

		test('command can override booleanFlagNegation to false', async () => {
			const buildCommand = command({
				name: 'build',
				flags: {
					watch: Boolean,
				},
				booleanFlagNegation: false,
			});

			const parsed = await cli(
				{
					booleanFlagNegation: true,
					commands: [buildCommand],
				},
				undefined,
				['build', '--no-watch'],
			);

			expect(parsed.command).toBe('build');
			if (parsed.command === 'build') {
				expect(parsed.flags.watch).toBeUndefined();
				expect(parsed.unknownFlags).toHaveProperty('no-watch');
			}
		});

		test('command can enable booleanFlagNegation independently', async () => {
			const buildCommand = command({
				name: 'build',
				flags: {
					watch: Boolean,
				},
				booleanFlagNegation: true,
			});

			const parsed = await cli(
				{
					commands: [buildCommand],
				},
				undefined,
				['build', '--no-watch'],
			);

			expect(parsed.command).toBe('build');
			if (parsed.command === 'build') {
				expect(parsed.flags.watch).toBe(false);
			}
		});
	});
});
