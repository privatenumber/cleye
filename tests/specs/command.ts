import { testSuite, expect } from 'manten';
import { spy } from 'nanospy';
import { cli, command } from '#cleye';

export default testSuite(({ describe }) => {
	describe('command', ({ describe }) => {
		describe('error handling', ({ test }) => {
			test('missing options', () => {
				expect(() => {
					// @ts-expect-error no options
					command();
				}).toThrow('Command options are required');
			});

			test('missing command name', () => {
				expect(() => {
					// @ts-expect-error no name
					command({});
				}).toThrow('Command name is required');
			});

			test('empty command name', () => {
				expect(() => {
					command({
						name: '',
					});
				}).toThrow('Invalid command name ""');
			});

			test('invalid command name', () => {
				expect(() => {
					command({
						name: 'a b c',
					});
				}).toThrow('Invalid command name "a b c". Command names must be one word.');
			});

			test('duplicate command name', () => {
				expect(() => {
					cli(
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
					);
				}).toThrow('Duplicate command name found: "duplicate"');
			});

			test('duplicate command alias', () => {
				expect(() => {
					cli(
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
					);
				}).toThrow('Duplicate command name found: "duplicate"');
			});
		});

		describe('command', ({ test }) => {
			test('invoking command', () => {
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

				const parsed = cli(
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

			test('invoking command via alias', () => {
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

				const parsed = cli(
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

			test('invoking command via alias array', () => {
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

				const parsed = cli(
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

			test('smoke', () => {
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

				const argv = cli(
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

		describe('ignoreArgv', ({ test }) => {
			test('ignore after arguments', () => {
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

				const parsed = cli(
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
	});
});
