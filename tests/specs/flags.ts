import { describe, test, expect } from 'manten';
import { spy } from 'nanospy';
import { mockEnvFunctions } from '../utils/mock-env-functions.ts';
import { cli } from '#cleye';

describe('flags', () => {
	test('has return type & callback', async () => {
		const callback = spy();
		const argv = await cli(
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
		test('disabled', async () => {
			const mocked = mockEnvFunctions();
			const parsed = await cli(
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

		test('enabled', async () => {
			const mocked = mockEnvFunctions();
			await cli(
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
	}, { parallel: false });

	describe('help', () => {
		test('disabled', async () => {
			const mocked = mockEnvFunctions();
			const parsed = await cli(
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

		test('enabled', async () => {
			const mocked = mockEnvFunctions();
			await cli(
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
	}, { parallel: false });

	describe('flag overrides', () => {
		test('overriding --help flag', async () => {
			const mocked = mockEnvFunctions();
			const parsed = await cli(
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

		test('overriding --version flag', async () => {
			const mocked = mockEnvFunctions();
			const parsed = await cli(
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
	}, { parallel: false });

	describe('custom flag type', () => {
		const possibleSizes = ['small', 'medium', 'large'] as const;
		type Sizes = typeof possibleSizes[number];
		const Size = (size: Sizes) => {
			if (!possibleSizes.includes(size)) {
				throw new Error(`Invalid size: "${size}"`);
			}
			return size;
		};

		test('parses valid custom type', async () => {
			const parsed = await cli(
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

		test('throws on invalid custom type', async () => {
			await expect(
				cli(
					{
						flags: {
							size: Size,
						},
					},
					undefined,
					['--size', 'xlarge'],
				),
			).rejects.toThrow('Invalid size: "xlarge"');
		});
	}, { parallel: false });

	describe('flag parsing variants', () => {
		test('parses array flags', async () => {
			const parsed = await cli(
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

		test('parses equals-syntax flags', async () => {
			const parsed = await cli(
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

		test('parses combined short aliases', async () => {
			const parsed = await cli(
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

		test('parses short alias with value', async () => {
			const parsed = await cli(
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

		test('default value function', async () => {
			const defaultFunction = spy(() => 'hello');
			const parsed = await cli(
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
	}, { parallel: false });

	describe('ignoreArgv', () => {
		test('ignore after arguments', async () => {
			const argv = ['--unknown', 'arg', '--help'];

			let receivedArgument = false;
			const parsed = await cli(
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
	}, { parallel: false });

	describe('unknown flags default behavior', () => {
		test('unknown flag captured', async () => {
			const parsed = await cli(
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

		test('multiple unknown flags', async () => {
			const parsed = await cli(
				{},
				undefined,
				['--unknown1', '--unknown2', 'value'],
			);

			expect(parsed.unknownFlags.unknown1).toEqual([true]);
			expect(parsed.unknownFlags.unknown2).toEqual([true]);
		});
	}, { parallel: false });

	describe('strictFlags', () => {
		test('errors on unknown flag', async () => {
			const mocked = mockEnvFunctions();
			await cli(
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

		test('suggests closest match when within distance 2', async () => {
			const mocked = mockEnvFunctions();
			await cli(
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

		test('no suggestion when flag is too different', async () => {
			const mocked = mockEnvFunctions();
			await cli(
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

		test('no suggestion for very short unknown flags', async () => {
			const mocked = mockEnvFunctions();
			await cli(
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

		test('reports multiple unknown flags', async () => {
			const mocked = mockEnvFunctions();
			await cli(
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

		test('known flags still work', async () => {
			const mocked = mockEnvFunctions();
			const parsed = await cli(
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

		test('strictFlags disabled by default', async () => {
			const mocked = mockEnvFunctions();
			const parsed = await cli(
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

		test('suggests flag aliases', async () => {
			const mocked = mockEnvFunctions();
			await cli(
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
	}, { parallel: false });

	describe('acronym flag names (issue #38)', () => {
		test('acronym flags parse from kebab-case argv', async () => {
			const parsed = await cli(
				{
					flags: {
						orgID: { type: String },
						apiURL: { type: String },
					},
				},
				undefined,
				['--org-id=acme', '--api-url=https://example.com'],
			);

			expect(parsed.flags.orgID).toBe('acme');
			expect(parsed.flags.apiURL).toBe('https://example.com');
			expect(parsed.unknownFlags).toStrictEqual({});
		});

		test('naive kebab-case does not match acronym flags', async () => {
			const parsed = await cli(
				{
					flags: { orgID: { type: String } },
				},
				undefined,
				['--org-i-d=acme'],
			);

			expect(parsed.flags.orgID).toBeUndefined();
			expect(parsed.unknownFlags).toStrictEqual({ 'org-i-d': ['acme'] });
		});
	}, { parallel: false });

	describe('booleanFlagNegation', () => {
		test('--no-flag sets boolean flag to false', async () => {
			const parsed = await cli(
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

		test('last-wins semantics', async () => {
			const parsed = await cli(
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

			const parsed2 = await cli(
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

		test('does not apply to non-boolean flags', async () => {
			const parsed = await cli(
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

		test('disabled by default', async () => {
			const parsed = await cli(
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

		test('works with strictFlags without erroring', async () => {
			const mocked = mockEnvFunctions();
			const parsed = await cli(
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
	}, { parallel: false });
}, { parallel: false });
