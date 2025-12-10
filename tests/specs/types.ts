import { testSuite } from 'manten';
import { expectTypeOf } from 'expect-type';
import { cli, command, type Flags } from '#cleye';

export default testSuite(({ describe }) => {
	describe('types', ({ test }) => {
		test('cli with parameters and flags', () => {
			const parsed = cli({
				parameters: ['<foo>', '[bar...]'],

				flags: {
					booleanFlag: Boolean,
					booleanFlagDefault: {
						type: Boolean,
						default: false,
					},
					stringFlag: String,
					stringFlagDefault: {
						type: String,
						default: 'hello',
					},
					numberFlag: Number,
					numberFlagDefault: {
						type: Number,
						default: 1,
					},
					extraOptions: {
						type: Boolean,
						alias: 'e',
						default: false,
						description: 'Some description',
					},
				},
			}, undefined, ['value1']);

			// Type check when no command is matched
			if (parsed.command === undefined) {
				// Check parameters
				expectTypeOf(parsed._.foo).toBeString();
				expectTypeOf(parsed._.bar).toEqualTypeOf<string[]>();

				// Check it's also an Arguments type (has '--')
				expectTypeOf(parsed._['--']).toEqualTypeOf<string[]>();

				expectTypeOf(parsed.flags).toEqualTypeOf<{
					booleanFlag: boolean | undefined;
					booleanFlagDefault: boolean;
					stringFlag: string | undefined;
					stringFlagDefault: string;
					numberFlag: number | undefined;
					numberFlagDefault: number;
					extraOptions: boolean;
					help: boolean | undefined;
				}>();
			}
		});

		test('cli with commands', () => {
			const parsed = cli({
				flags: {
					booleanFlag: Boolean,
					booleanFlagDefault: {
						type: Boolean,
						default: false,
					},
					stringFlag: String,
					stringFlagDefault: {
						type: String,
						default: 'hello',
					},
					numberFlag: Number,
					numberFlagDefault: {
						type: Number,
						default: 1,
					},
					extraOptions: {
						type: Boolean,
						alias: 'e',
						default: false,
						description: 'Some description',
					},
				},

				commands: [
					command({
						name: 'commandA',

						parameters: [
							'<foo>',
							'<hello world>',
							'[bar...]',
						],

						flags: {
							booleanFlag: Boolean,
							booleanFlagDefault: {
								type: Boolean,
								default: false,
							},
							stringFlag: String,
							stringFlagDefault: {
								type: String,
								default: 'hello',
							},
							numberFlag: Number,
							numberFlagDefault: {
								type: Number,
								default: 1,
							},
							extraOptions: {
								type: Boolean,
								alias: 'e',
								default: false,
								description: 'Some description',
							},
						},
					}),
				],
			}, undefined, ['commandA', 'value1', 'value2']);

			// Type check when commandA is matched
			if (parsed.command === 'commandA') {
				// Check parameters
				expectTypeOf(parsed._.foo).toBeString();
				expectTypeOf(parsed._.helloWorld).toBeString();
				expectTypeOf(parsed._.bar).toEqualTypeOf<string[]>();

				// Check it's also an Arguments type (has '--')
				expectTypeOf(parsed._['--']).toEqualTypeOf<string[]>();

				expectTypeOf(parsed.flags).toEqualTypeOf<{
					booleanFlag: boolean | undefined;
					booleanFlagDefault: boolean;
					stringFlag: string | undefined;
					stringFlagDefault: string;
					numberFlag: number | undefined;
					numberFlagDefault: number;
					extraOptions: boolean;
					help: boolean | undefined;
				}>();
			}
		});

		test('parameter name normalization', () => {
			const parsed = cli({
				parameters: [
					'<hello world>',
				],
			}, undefined, ['a']);

			if (parsed.command === undefined) {
				// Parameter with spaces should normalize to camelCase
				expectTypeOf(parsed._).toHaveProperty('helloWorld');
				expectTypeOf(parsed._.helloWorld).toBeString();
			}
		});

		test('flag types without defaults', () => {
			const parsed = cli({
				flags: {
					stringFlag: String,
					numberFlag: Number,
					booleanFlag: Boolean,
				},
			}, undefined, []);

			if (parsed.command === undefined) {
				expectTypeOf(parsed.flags.stringFlag).toEqualTypeOf<string | undefined>();
				expectTypeOf(parsed.flags.numberFlag).toEqualTypeOf<number | undefined>();
				expectTypeOf(parsed.flags.booleanFlag).toEqualTypeOf<boolean | undefined>();
				expectTypeOf(parsed.flags.help).toEqualTypeOf<boolean | undefined>();
			}
		});

		test('flag types with defaults', () => {
			const parsed = cli({
				flags: {
					stringFlag: {
						type: String,
						default: 'default',
					},
					numberFlag: {
						type: Number,
						default: 42,
					},
					booleanFlag: {
						type: Boolean,
						default: true,
					},
				},
			}, undefined, []);

			if (parsed.command === undefined) {
				expectTypeOf(parsed.flags.stringFlag).toBeString();
				expectTypeOf(parsed.flags.numberFlag).toBeNumber();
				expectTypeOf(parsed.flags.booleanFlag).toBeBoolean();
			}
		});

		test('optional and required parameters', () => {
			const parsed = cli({
				parameters: ['<required>', '[variadic...]'],
			}, undefined, ['req', 'var1', 'var2']);

			if (parsed.command === undefined) {
				expectTypeOf(parsed._.required).toBeString();
				expectTypeOf(parsed._.variadic).toEqualTypeOf<string[]>();
			}
		});

		test('command discriminated union', () => {
			const parsed = cli({
				commands: [
					command({
						name: 'cmd1',
						parameters: ['<param1>'],
					}),
					command({
						name: 'cmd2',
						parameters: ['<param2>'],
					}),
				],
			}, undefined, ['cmd1', 'value']);

			// Type narrows correctly based on command name
			if (parsed.command === 'cmd1') {
				expectTypeOf(parsed._).toHaveProperty('param1');
				expectTypeOf(parsed._).not.toHaveProperty('param2');
			}

			if (parsed.command === 'cmd2') {
				expectTypeOf(parsed._).toHaveProperty('param2');
				expectTypeOf(parsed._).not.toHaveProperty('param1');
			}
		});

		test('no parameters', () => {
			const parsed = cli({
				flags: {
					flag: String,
				},
			}, undefined, []);

			if (parsed.command === undefined) {
				// Check it's an Arguments type (has '--' property)
				expectTypeOf(parsed._['--']).toEqualTypeOf<string[]>();
				// And extends string[]
				expectTypeOf(parsed._).toMatchTypeOf<string[]>();
			}
		});

		test('double dash arguments', () => {
			const parsed = cli({}, undefined, ['--', 'arg1', 'arg2']);

			if (parsed.command === undefined) {
				expectTypeOf(parsed._['--']).toEqualTypeOf<string[]>();
			}
		});

		test('command callback flag types', () => {
			command({
				name: 'commandA',

				flags: {
					booleanFlag: Boolean,
					booleanFlagDefault: {
						type: Boolean,
						default: false,
					},
				},
			}, (argv) => {
				expectTypeOf(argv.flags).toEqualTypeOf<{
					help: boolean | undefined;
					booleanFlag: boolean | undefined;
					booleanFlagDefault: boolean;
				}>();
			});
		});

		test('async cli() returns promise', () => {
			const result = cli({
				flags: {
					foo: String,
				},
			}, async (argv) => {
				console.log(argv.flags.foo);
			}, []);

			// Should have Promise methods
			expectTypeOf(result.then).toBeFunction();
			expectTypeOf(result.catch).toBeFunction();
			expectTypeOf(result.finally).toBeFunction();

			// Should also have parsed properties
			expectTypeOf(result.flags).toEqualTypeOf<{
				foo: string | undefined;
				help: boolean | undefined;
			}>();
		});

		test('sync cli() has parsed properties without Promise', () => {
			const result = cli({
				flags: {
					bar: Number,
				},
			}, (argv) => {
				console.log(argv.flags.bar);
			}, []);

			// Should have parsed properties
			expectTypeOf(result.flags).toEqualTypeOf<{
				bar: number | undefined;
				help: boolean | undefined;
			}>();

			// Should NOT have Promise methods (sync callback)
			expectTypeOf(result).not.toMatchTypeOf<Promise<void>>();
		});

		test('async cli() without commands returns Promise', () => {
			const result = cli({
				flags: {
					foo: String,
				},
			}, async (argv) => {
				console.log(argv.flags.foo);
			}, []);

			// Should have Promise methods
			expectTypeOf(result.then).toBeFunction();
			expectTypeOf(result.catch).toBeFunction();
			expectTypeOf(result.finally).toBeFunction();
		});

		test('cli() without callback has no Promise', () => {
			const result = cli({
				flags: {
					baz: String,
				},
			});

			// Should have parsed properties
			expectTypeOf(result.flags).toEqualTypeOf<{
				baz: string | undefined;
				help: boolean | undefined;
			}>();

			// Should NOT have Promise methods (no callback)
			expectTypeOf(result).not.toMatchTypeOf<Promise<void>>();
		});

		test('async cli() with commands returns promise', () => {
			const result = cli({
				commands: [
					command({
						name: 'test',
						flags: {
							flag: Boolean,
						},
					}),
				],
			}, async () => {
				// async main callback
			}, ['test']);

			// Should have Promise methods
			expectTypeOf(result.then).toBeFunction();
			expectTypeOf(result.catch).toBeFunction();
			expectTypeOf(result.finally).toBeFunction();
		});

		test('Flags type is exported and usable', () => {
			// Flags type should be importable and usable for defining shared flags
			const sharedFlags = {
				verbose: {
					type: Boolean,
					alias: 'v',
					description: 'Enable verbose output',
				},
				config: {
					type: String,
					description: 'Config file path',
					placeholder: '<path>',
				},
			} satisfies Flags;

			// Flags type should be assignable
			const flags: Flags = sharedFlags;
			expectTypeOf(flags).toMatchTypeOf<Flags>();

			// Should work with cli()
			const result = cli({
				flags: sharedFlags,
			}, undefined, []);

			expectTypeOf(result.flags.verbose).toEqualTypeOf<boolean | undefined>();
			expectTypeOf(result.flags.config).toEqualTypeOf<string | undefined>();
		});

		test('unknown cli options cause type errors', () => {
			// This test verifies that TypeScript catches typos in cli options
			// at compile time via @ts-expect-error directives.
			// The StrictOptions type maps unknown keys to `never`.

			cli({
				name: 'test',
				// @ts-expect-error - 'params' is not a valid option (typo for 'parameters')
				params: ['<foo>'],
			});

			cli({
				name: 'test',
				// @ts-expect-error - 'unknownOption' is not a valid option
				unknownOption: true,
			});
		});

		test('ignoreArgv callback with 3 parameters', () => {
			// Issue #26: ignoreArgv should accept callbacks with all 3 parameters
			// The third parameter (value) is optional but users should be able to declare it
			cli({
				name: 'test',
				ignoreArgv(type, flagOrArgv, value) {
					// All parameters should be properly typed
					expectTypeOf(type).toEqualTypeOf<'argument' | 'known-flag' | 'unknown-flag'>();
					expectTypeOf(flagOrArgv).toBeString();
					expectTypeOf(value).toEqualTypeOf<string | undefined>();
					return false;
				},
			});

			// Should also work with required third parameter
			cli({
				name: 'test',
				ignoreArgv(_type, _flagOrArgv, _value) {
					return false;
				},
			});
		});

		test('Parameters<typeof cli> is not never', () => {
			// Issue #36: Parameters<typeof cli> should not resolve to never
			// This ensures cli function signature is properly typed for wrapper functions
			type CliParameters = Parameters<typeof cli>;

			// Should not be never - if it is, this test will fail at compile time
			expectTypeOf<CliParameters>().not.toBeNever();

			// Should be a tuple with at least one element (the options parameter)
			expectTypeOf<CliParameters[0]>().not.toBeNever();
		});

		test('cli() return type is not void', () => {
			// Issue #36: cli({}) return type should not be void
			const result = cli({});

			// Return type should have flags property
			expectTypeOf(result).toHaveProperty('flags');

			// Return type should have showHelp and showVersion
			expectTypeOf(result).toHaveProperty('showHelp');
			expectTypeOf(result).toHaveProperty('showVersion');

			// Return type should not be void
			expectTypeOf(result).not.toBeVoid();
		});
	});
});
