import { describe, test, expect } from 'manten';
import { spy } from 'nanospy';
import { cli } from '#cleye';

describe('flags parsing', () => {
	test('parses flags + parameters together with type narrowing', async () => {
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
				return parsed;
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

	describe('custom flag types', () => {
		const possibleSizes = ['small', 'medium', 'large'] as const;
		type Sizes = typeof possibleSizes[number];
		const Size = (size: Sizes) => {
			if (!possibleSizes.includes(size)) {
				throw new Error(`Invalid size: "${size}"`);
			}
			return size;
		};

		test('parses valid custom-type value', () => {
			const parsed = cli({
				flags: {
					size: Size,
				},
			}, undefined, ['--size', 'medium']);
			if (parsed.command === undefined) {
				expect<Sizes | undefined>(parsed.flags.size).toBe('medium');
			}
		});

		test('throws on invalid custom-type value', () => {
			expect(
				() => cli(
					{
						flags: {
							size: Size,
						},
					},
					undefined,
					['--size', 'xlarge'],
				),
			).toThrow('Invalid size: "xlarge"');
		});
	}, { parallel: false });

	describe('parsing variants', () => {
		test('array flag collects multiple values', () => {
			const parsed = cli({
				flags: {
					item: [String],
				},
			}, undefined, ['--item', 'a', '--item', 'b']);
			if (parsed.command === undefined) {
				expect<string[] | undefined>(parsed.flags.item).toStrictEqual(['a', 'b']);
			}
		});

		test('equals syntax (--name=value)', () => {
			const parsed = cli({
				flags: {
					name: String,
				},
			}, undefined, ['--name=hiroki']);
			if (parsed.command === undefined) {
				expect<string | undefined>(parsed.flags.name).toBe('hiroki');
			}
		});

		test('combined short aliases (-rx)', () => {
			const parsed = cli({
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
			}, undefined, ['-rx']);
			if (parsed.command === undefined) {
				expect<boolean | undefined>(parsed.flags.read).toBe(true);
				expect<boolean | undefined>(parsed.flags.write).toBe(undefined);
				expect<boolean | undefined>(parsed.flags.execute).toBe(true);
			}
		});

		test('short alias with value (-n 42)', () => {
			const parsed = cli({
				flags: {
					number: {
						type: Number,
						alias: 'n',
					},
				},
			}, undefined, ['-n', '42']);
			if (parsed.command === undefined) {
				expect<number | undefined>(parsed.flags.number).toBe(42);
			}
		});

		test('default value as a function', () => {
			const defaultFunction = spy(() => 'hello');
			const parsed = cli({
				flags: {
					myFlag: {
						type: String,
						default: defaultFunction,
					},
				},
			}, undefined, []);
			if (parsed.command === undefined) {
				expect<string>(parsed.flags.myFlag).toBe('hello');
				expect(defaultFunction.called).toBe(true);
			}
		});

		test('flag with empty string value', () => {
			const parsed = cli({
				flags: {
					value: String,
				},
			}, undefined, ['--value=']);

			expect<string | undefined>(parsed.flags.value).toBe('');
		});

		test('flag with whitespace value', () => {
			const parsed = cli({
				flags: {
					value: String,
				},
			}, undefined, ['--value', '   ']);

			expect<string | undefined>(parsed.flags.value).toBe('   ');
		});

		test('number flag with zero', () => {
			const parsed = cli({
				flags: {
					value: Number,
				},
			}, undefined, ['--value', '0']);

			expect<number | undefined>(parsed.flags.value).toBe(0);
		});

		test('number flag with negative', () => {
			const parsed = cli({
				flags: {
					value: Number,
				},
			}, undefined, ['--value=-42']);

			expect<number | undefined>(parsed.flags.value).toBe(-42);
		});

		test('number flag with decimal', () => {
			const parsed = cli({
				flags: {
					value: Number,
				},
			}, undefined, ['--value', '3.14']);

			expect<number | undefined>(parsed.flags.value).toBe(3.14);
		});
	}, { parallel: false });

	describe('acronym flag names (issue #38)', () => {
		test('acronym flags parse from kebab-case argv', () => {
			const parsed = cli({
				flags: {
					orgID: { type: String },
					apiURL: { type: String },
				},
			}, undefined, ['--org-id=acme', '--api-url=https://example.com']);

			expect(parsed.flags.orgID).toBe('acme');
			expect(parsed.flags.apiURL).toBe('https://example.com');
			expect(parsed.unknownFlags).toStrictEqual({});
		});

		test('naive kebab-case does not match acronym flags', () => {
			const parsed = cli({
				flags: { orgID: { type: String } },
			}, undefined, ['--org-i-d=acme']);

			expect(parsed.flags.orgID).toBeUndefined();
			expect(parsed.unknownFlags).toHaveProperty('org-i-d');
		});
	}, { parallel: false });

	describe('ignoreArgv', () => {
		test('ignores argv tokens after the predicate flips', async () => {
			const argv = ['--unknown', 'arg', '--help'];
			const argvSnapshot = [...argv];

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
					expect(p.unknownFlags).toStrictEqual({
						unknown: [true],
					});
					return p;
				},
				argv,
			);

			// cleye doesn't leak type-flag's argv mutation: the caller's
			// array is untouched after cli() returns.
			expect(argv).toStrictEqual(argvSnapshot);
			expect(parsed.unknownFlags).toStrictEqual({
				unknown: [true],
			});
		});
	}, { parallel: false });
}, { parallel: false });
