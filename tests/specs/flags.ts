import { testSuite, expect } from 'manten';
import { spy } from 'nanospy';
import { mockEnvFunctions } from '../utils/mock-env-functions';
import { cli } from '#cleye';

export default testSuite(({ describe }) => {
	describe('flags', ({ describe, test }) => {
		test('has return type & callback', () => {
			const callback = spy();
			const argv = cli(
				{
					parameters: ['<value-a>', '[value-B]'],
					flags: {
						flagA: String,
						flagB: {
							type: Number,
						},
					},
				},
				(parsed) => {
					expect<string | undefined>(parsed.flags.flagA).toBe('valueA');
					expect<number | undefined>(parsed.flags.flagB).toBe(123);
					callback();
				},
				['--flagA', 'valueA', '--flagB', '123', 'valueA', 'valueB'],
			);

			if (!argv.command) {
				expect<string>(argv._.valueA).toBe('valueA');
				expect<string | undefined>(argv._.valueB).toBe('valueB');
				expect<string | undefined>(argv.flags.flagA).toBe('valueA');
				expect<number | undefined>(argv.flags.flagB).toBe(123);
				expect(callback.called).toBe(true);
			}
		});

		describe('version', ({ test }) => {
			test('disabled', () => {
				const mocked = mockEnvFunctions();
				const parsed = cli(
					{},
					(p) => {
						expect<{
							version?: undefined;
							help: boolean | undefined;
						}>(p.flags).toEqual({});
					},
					['--version'],
				);
				mocked.restore();

				expect<{
					version?: undefined;
					help: boolean | undefined;
				}>(parsed.flags).toEqual({});
				expect(mocked.consoleLog.called).toBe(false);
				expect(mocked.processExit.called).toBe(false);
			});

			test('enabled', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						version: '1.0.0',
						flags: {
							flagA: String,
						},
					},
					({ flags }) => {
						expect<boolean | undefined>(flags.version).toBe(true);
					},
					['--version'],
				);
				mocked.restore();

				expect(mocked.consoleLog.called).toBe(true);
				expect(mocked.processExit.calls).toStrictEqual([[0]]);
			});
		});

		describe('help', ({ test }) => {
			test('disabled', () => {
				const mocked = mockEnvFunctions();
				const parsed = cli(
					{
						help: false,
					},
					(p) => {
						expect<{
							help?: undefined;
						}>(p.flags).toEqual({});
					},
					['--help'],
				);
				mocked.restore();

				expect<{
					help?: undefined;
				}>(parsed.flags).toEqual({});
				expect(mocked.consoleLog.called).toBe(false);
				expect(mocked.processExit.called).toBe(false);
			});

			test('enabled', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						flags: {
							flagA: String,
						},
					},
					({ flags }) => {
						expect<boolean | undefined>(flags.help).toBe(true);
					},
					['--help'],
				);
				mocked.restore();

				expect(mocked.consoleLog.called).toBe(true);
				expect(mocked.processExit.calls).toStrictEqual([[0]]);
			});
		});

		describe('flag overrides', ({ test }) => {
			test('overriding --help flag', () => {
				const mocked = mockEnvFunctions();
				const parsed = cli(
					{
						flags: {
							help: {
								type: String,
								description: 'A custom help flag that accepts a string',
							},
						},
					},
					undefined,
					['--help', 'custom-value'],
				);
				mocked.restore();

				// Should not print help and should not exit
				expect(mocked.consoleLog.called).toBe(false);
				expect(mocked.processExit.called).toBe(false);

				// Should parse the flag as a string
				if (parsed.command === undefined) {
					// Type assertion needed because TS sees union of built-in (boolean) + override (string)
					expect(parsed.flags.help as string | undefined).toBe('custom-value');
				}
			});

			test('overriding --version flag', () => {
				const mocked = mockEnvFunctions();
				const parsed = cli(
					{
						version: '1.0.0', // Enables --version behavior
						flags: {
							version: {
								type: Number,
								description: 'A custom version flag that accepts a number',
							},
						},
					},
					undefined,
					['--version', '42'],
				);
				mocked.restore();

				// Should not print version and should not exit
				expect(mocked.consoleLog.called).toBe(false);
				expect(mocked.processExit.called).toBe(false);

				// Should parse the flag as a number
				if (parsed.command === undefined) {
					// Type assertion needed because TS sees union of built-in (boolean) + override (number)
					expect(parsed.flags.version as number | undefined).toBe(42);
				}
			});
		});

		describe('custom flag type', ({ test }) => {
			const possibleSizes = ['small', 'medium', 'large'] as const;
			type Sizes = typeof possibleSizes[number];
			const Size = (size: Sizes) => {
				if (!possibleSizes.includes(size)) {
					throw new Error(`Invalid size: "${size}"`);
				}
				return size;
			};

			test('parses valid custom type', () => {
				const parsed = cli(
					{
						flags: {
							size: Size,
						},
					},
					undefined,
					['--size', 'medium'],
				);
				if (parsed.command === undefined) {
					expect<Sizes | undefined>(parsed.flags.size).toBe('medium');
				}
			});

			test('throws on invalid custom type', () => {
				expect(() => {
					cli(
						{
							flags: {
								size: Size,
							},
						},
						undefined,
						['--size', 'xlarge'],
					);
				}).toThrow('Invalid size: "xlarge"');
			});
		});

		describe('flag parsing variants', ({ test }) => {
			test('parses array flags', () => {
				const parsed = cli(
					{
						flags: {
							item: [String],
						},
					},
					undefined,
					['--item', 'a', '--item', 'b'],
				);
				if (parsed.command === undefined) {
					expect<string[] | undefined>(parsed.flags.item).toStrictEqual(['a', 'b']);
				}
			});

			test('parses equals-syntax flags', () => {
				const parsed = cli(
					{
						flags: {
							name: String,
						},
					},
					undefined,
					['--name=hiroki'],
				);
				if (parsed.command === undefined) {
					expect<string | undefined>(parsed.flags.name).toBe('hiroki');
				}
			});

			test('parses combined short aliases', () => {
				const parsed = cli(
					{
						flags: {
							read: {
								type: Boolean,
								alias: 'r',
							},
							write: {
								type: Boolean,
								alias: 'w',
							},
							execute: {
								type: Boolean,
								alias: 'x',
							},
						},
					},
					undefined,
					['-rx'],
				);
				if (parsed.command === undefined) {
					expect<boolean | undefined>(parsed.flags.read).toBe(true);
					expect<boolean | undefined>(parsed.flags.write).toBe(undefined);
					expect<boolean | undefined>(parsed.flags.execute).toBe(true);
				}
			});

			test('parses short alias with value', () => {
				const parsed = cli(
					{
						flags: {
							number: {
								type: Number,
								alias: 'n',
							},
						},
					},
					undefined,
					['-n', '42'],
				);
				if (parsed.command === undefined) {
					expect<number | undefined>(parsed.flags.number).toBe(42);
				}
			});

			test('default value function', () => {
				const defaultFunction = spy(() => 'hello');
				const parsed = cli(
					{
						flags: {
							myFlag: {
								type: String,
								default: defaultFunction,
							},
						},
					},
					undefined,
					[],
				);
				if (parsed.command === undefined) {
					expect<string>(parsed.flags.myFlag).toBe('hello');
					expect(defaultFunction.called).toBe(true);
				}
			});
		});

		describe('ignoreArgv', ({ test }) => {
			test('ignore after arguments', () => {
				const argv = ['--unknown', 'arg', '--help'];

				let receivedArgument = false;
				const parsed = cli(
					{
						ignoreArgv(type) {
							if (receivedArgument) {
								return true;
							}
							if (type === 'argument') {
								receivedArgument = true;
								return true;
							}
						},
					},
					(p) => {
						expect(argv).toStrictEqual(['arg', '--help']);
						expect(p.unknownFlags).toStrictEqual({
							unknown: [true],
						});
					},
					argv,
				);

				expect(argv).toStrictEqual(['arg', '--help']);
				expect(parsed.unknownFlags).toStrictEqual({
					unknown: [true],
				});
			});
		});

		describe('unknown flags default behavior', ({ test }) => {
			test('unknown flag captured', () => {
				const parsed = cli(
					{
						flags: {
							known: String,
						},
					},
					undefined,
					['--unknown', '--known', 'value'],
				);

				expect(parsed.unknownFlags.unknown).toEqual([true]);
				expect(parsed.flags.known).toBe('value');
			});

			test('multiple unknown flags', () => {
				const parsed = cli(
					{},
					undefined,
					['--unknown1', '--unknown2', 'value'],
				);

				expect(parsed.unknownFlags.unknown1).toEqual([true]);
				expect(parsed.unknownFlags.unknown2).toEqual([true]);
			});
		});
	});
});
