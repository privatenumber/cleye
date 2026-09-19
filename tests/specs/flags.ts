import { describe, test, expect } from 'manten';
import { expectTypeOf } from 'expect-type';
import { spy } from 'nanospy';
import type { StandardSchemaV1 } from 'type-flag';
import * as z from 'zod';
import { mockEnvFunctions } from '../utils/mock-env-functions.ts';
import { cli, command } from '#cleye';

describe('flags', () => {
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

	describe('version', () => {
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

	describe('help', () => {
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

	describe('flag overrides', () => {
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

	describe('custom flag type', () => {
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

	describe('flag parsing variants', () => {
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

	describe('ignoreArgv', () => {
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

	describe('unknown flags default behavior', () => {
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

		test('unknown flag named __proto__ is captured as an own property', () => {
			const parsed = cli(
				{},
				undefined,
				['--__proto__=first', '--__proto__=second'],
			);

			expect(Object.hasOwn(parsed.unknownFlags, '__proto__')).toBe(true);
			expect(Object.entries(parsed.unknownFlags)).toStrictEqual([['__proto__', ['first', 'second']]]);
		});
	});

	describe('strictFlags', () => {
		test('errors on unknown flag', () => {
			const mocked = mockEnvFunctions();
			cli(
				{
					flags: {
						verbose: Boolean,
					},
					strictFlags: true,
				},
				undefined,
				['--unknown'],
			);
			mocked.restore();

			expect(mocked.consoleError.called).toBe(true);
			expect(mocked.consoleError.calls[0][0]).toContain('Unknown flag');
			expect(mocked.consoleError.calls[0][0]).toContain('--unknown');
			expect(mocked.processExit.calls).toStrictEqual([[1]]);
		});

		test('suggests closest match when within distance 2', () => {
			const mocked = mockEnvFunctions();
			cli(
				{
					flags: {
						verbose: Boolean,
					},
					strictFlags: true,
				},
				undefined,
				['--verbos'], // Missing 'e'
			);
			mocked.restore();

			expect(mocked.consoleError.calls[0][0]).toContain('--verbose');
			expect(mocked.consoleError.calls[0][0]).toMatch(/did you mean/i);
		});

		test('no suggestion when flag is too different', () => {
			const mocked = mockEnvFunctions();
			cli(
				{
					flags: {
						verbose: Boolean,
					},
					strictFlags: true,
				},
				undefined,
				['--xyz'],
			);
			mocked.restore();

			expect(mocked.consoleError.calls[0][0]).not.toMatch(/did you mean/i);
		});

		test('no suggestion for very short unknown flags', () => {
			const mocked = mockEnvFunctions();
			cli(
				{
					flags: {
						ab: Boolean,
						ac: Boolean,
					},
					strictFlags: true,
				},
				undefined,
				['--ad'], // Short unknown flag (2 chars) shouldn't get suggestions
			);
			mocked.restore();

			expect(mocked.consoleError.called).toBe(true);
			expect(mocked.consoleError.calls[0][0]).toContain('--ad');
			expect(mocked.consoleError.calls[0][0]).not.toMatch(/did you mean/i);
		});

		test('reports multiple unknown flags', () => {
			const mocked = mockEnvFunctions();
			cli(
				{
					flags: {
						verbose: Boolean,
						output: String,
					},
					strictFlags: true,
				},
				undefined,
				['--verbos', '--outpu'],
			);
			mocked.restore();

			expect(mocked.consoleError.callCount).toBe(2);
			expect(mocked.consoleError.calls[0][0]).toContain('--verbos');
			expect(mocked.consoleError.calls[1][0]).toContain('--outpu');
		});

		test('known flags still work', () => {
			const mocked = mockEnvFunctions();
			const parsed = cli(
				{
					flags: {
						verbose: Boolean,
						output: String,
					},
					strictFlags: true,
				},
				undefined,
				['--verbose', '--output', 'file.txt'],
			);
			mocked.restore();

			expect(mocked.consoleError.called).toBe(false);
			expect(mocked.processExit.called).toBe(false);
			expect(parsed.flags.verbose).toBe(true);
			expect(parsed.flags.output).toBe('file.txt');
		});

		test('strictFlags disabled by default', () => {
			const mocked = mockEnvFunctions();
			const parsed = cli(
				{
					flags: {
						verbose: Boolean,
					},
				},
				undefined,
				['--unknown'],
			);
			mocked.restore();

			expect(mocked.consoleError.called).toBe(false);
			expect(mocked.processExit.called).toBe(false);
			expect(parsed.unknownFlags.unknown).toEqual([true]);
		});

		test('suggests flag aliases', () => {
			const mocked = mockEnvFunctions();
			cli(
				{
					flags: {
						verbose: {
							type: Boolean,
							alias: 'v',
						},
					},
					strictFlags: true,
				},
				undefined,
				['--verbos'],
			);
			mocked.restore();

			expect(mocked.consoleError.calls[0][0]).toContain('--verbose');
		});
	});

	describe('booleanFlagNegation', () => {
		test('--no-flag sets boolean flag to false', () => {
			const parsed = cli(
				{
					flags: {
						verbose: Boolean,
					},
					booleanFlagNegation: true,
				},
				undefined,
				['--no-verbose'],
			);

			expect(parsed.flags.verbose).toBe(false);
		});

		test('last-wins semantics', () => {
			const parsed = cli(
				{
					flags: {
						verbose: Boolean,
					},
					booleanFlagNegation: true,
				},
				undefined,
				['--verbose', '--no-verbose'],
			);

			expect(parsed.flags.verbose).toBe(false);

			const parsed2 = cli(
				{
					flags: {
						verbose: Boolean,
					},
					booleanFlagNegation: true,
				},
				undefined,
				['--no-verbose', '--verbose'],
			);

			expect(parsed2.flags.verbose).toBe(true);
		});

		test('does not apply to non-boolean flags', () => {
			const parsed = cli(
				{
					flags: {
						output: String,
					},
					booleanFlagNegation: true,
				},
				undefined,
				['--no-output'],
			);

			expect(parsed.flags.output).toBeUndefined();
			expect(parsed.unknownFlags).toHaveProperty('no-output');
		});

		test('disabled by default', () => {
			const parsed = cli(
				{
					flags: {
						verbose: Boolean,
					},
				},
				undefined,
				['--no-verbose'],
			);

			expect(parsed.flags.verbose).toBeUndefined();
			expect(parsed.unknownFlags).toHaveProperty('no-verbose');
		});

		test('works with strictFlags without erroring', () => {
			const mocked = mockEnvFunctions();
			const parsed = cli(
				{
					flags: {
						verbose: Boolean,
					},
					booleanFlagNegation: true,
					strictFlags: true,
				},
				undefined,
				['--no-verbose'],
			);
			mocked.restore();

			expect(parsed.flags.verbose).toBe(false);
			expect(mocked.consoleError.called).toBe(false);
			expect(mocked.processExit.called).toBe(false);
		});
	});

	describe('standard schema flag types', () => {
		// A raw schema can carry its own `alias` member; it is schema metadata,
		// not a cleye flag option.
		const schemaWithAlias = (
			alias: string,
		): StandardSchemaV1 & { alias: string } => ({
			alias,
			'~standard': {
				version: 1,
				vendor: 'test',
				validate: value => ({ value }),
			},
		});

		test('parses schema flags', () => {
			const parsed = cli(
				{
					flags: {
						port: z.coerce.number(),
						size: z.enum(['small', 'medium', 'large']),
						length: z.string().transform(value => value.length),
						retries: {
							type: z.coerce.number(),
							default: 3,
						},
					},
				},
				undefined,
				['--port', '3000', '--size', 'medium', '--length', 'hello'],
			);

			expect(parsed.flags.port).toBe(3000);
			expect(parsed.flags.size).toBe('medium');
			expect(parsed.flags.length).toBe(5);
			expect(parsed.flags.retries).toBe(3);
		});

		test('collects array schema values and defaults to empty', () => {
			const present = cli(
				{ flags: { tags: [z.string()] } },
				undefined,
				['--tags', 'app', '--tags', 'cli'],
			);
			expect(present.flags.tags).toStrictEqual(['app', 'cli']);

			const absent = cli(
				{ flags: { tags: [z.string()] } },
				undefined,
				[],
			);
			expect(absent.flags.tags).toStrictEqual([]);
		});

		test('surfaces the schema error message on invalid value', () => {
			expect(() => {
				cli(
					{ flags: { port: z.coerce.number() } },
					undefined,
					['--port', 'not-a-number'],
				);
			}).toThrow('expected number');
		});

		test('parses schema flags in a command callback', () => {
			let callbackRan = false;
			cli(
				{
					commands: [
						command({
							name: 'serve',
							flags: {
								port: z.coerce.number(),
								tags: [z.string()],
							},
						}, (argv) => {
							callbackRan = true;
							expectTypeOf(argv.flags.port).toEqualTypeOf<number | undefined>();
							expectTypeOf(argv.flags.tags).toEqualTypeOf<string[]>();
							expect(argv.flags.port).toBe(3000);
							expect(argv.flags.tags).toStrictEqual(['app', 'cli']);
						}),
					],
				},
				undefined,
				['serve', '--port', '3000', '--tags', 'app', '--tags', 'cli'],
			);

			expect(callbackRan).toBe(true);
		});

		test('ignores a schema-internal alias', () => {
			const parsed = cli(
				{ flags: { value: schemaWithAlias('x') } },
				undefined,
				['-x', 'hello'],
			);

			expect(parsed.flags.value).toBeUndefined();
			expect(parsed.unknownFlags).toStrictEqual({ x: [true] });
		});

		test('parses a schema with a multi-character alias member', () => {
			const parsed = cli(
				{ flags: { value: schemaWithAlias('metadata') } },
				undefined,
				['--value', 'hello'],
			);

			expect(parsed.flags.value).toBe('hello');
			expect(parsed.unknownFlags).toStrictEqual({});
		});

		test('honors an explicit wrapper alias', () => {
			const parsed = cli(
				{
					flags: {
						value: {
							type: schemaWithAlias('metadata'),
							alias: 'v',
						},
					},
				},
				undefined,
				['-v', 'hello'],
			);

			expect(parsed.flags.value).toBe('hello');
		});

		test('does not suggest a schema-internal alias for unknown flags', () => {
			const mocked = mockEnvFunctions();
			cli(
				{
					flags: {
						value: schemaWithAlias('metadata'),
					},
					strictFlags: true,
				},
				undefined,
				['--metadatas'],
			);
			mocked.restore();

			expect(mocked.consoleError.calls[0][0]).toContain('--metadatas');
			expect(mocked.consoleError.calls[0][0]).not.toMatch(/did you mean/i);
		});
	});
});
