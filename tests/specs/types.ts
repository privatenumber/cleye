import { describe, test } from 'manten';
import { expectTypeOf } from 'expect-type';
import { cli, type Flags } from '#cleye';

describe('types', () => {
	test('cli() returns a Promise', async () => {
		const result = cli({
			flags: {
				foo: String,
			},
		}, undefined, []);

		expectTypeOf(result).toEqualTypeOf<Promise<Awaited<typeof result>>>();
		expectTypeOf(result.then).toBeFunction();
		expectTypeOf(result.catch).toBeFunction();
		expectTypeOf(result.finally).toBeFunction();
	});

	test('resolved type has correct shape', async () => {
		const parsed = await cli({
			flags: {
				foo: String,
			},
		}, p => p, []);

		expectTypeOf(parsed.flags).toEqualTypeOf<{
			foo: string | undefined;
			help: boolean | undefined;
		}>();

		expectTypeOf(parsed._).toMatchTypeOf<string[]>();
		expectTypeOf(parsed._['--']).toEqualTypeOf<string[]>();

		expectTypeOf(parsed.command).toEqualTypeOf<string | undefined>();
		type RunCommand = (context?: unknown) => Promise<unknown>;
		expectTypeOf(parsed.runCommand).toEqualTypeOf<RunCommand>();
		// runCommand is always defined — `undefined` must not be in its type.
		expectTypeOf(parsed.runCommand).not.toBeUndefined();
		expectTypeOf<undefined>().not.toMatchTypeOf<typeof parsed.runCommand>();
		expectTypeOf(parsed.showHelp).toBeFunction();
		expectTypeOf(parsed.showVersion).toBeFunction();
		expectTypeOf(parsed.unknownFlags).toEqualTypeOf<{
			[flagName: string]: (string | boolean)[];
		}>();
	});

	test('flag types without defaults', async () => {
		const parsed = await cli({
			flags: {
				stringFlag: String,
				numberFlag: Number,
				booleanFlag: Boolean,
			},
		}, p => p, []);

		expectTypeOf(parsed.flags.stringFlag).toEqualTypeOf<string | undefined>();
		expectTypeOf(parsed.flags.numberFlag).toEqualTypeOf<number | undefined>();
		expectTypeOf(parsed.flags.booleanFlag).toEqualTypeOf<boolean | undefined>();
		expectTypeOf(parsed.flags.help).toEqualTypeOf<boolean | undefined>();
	});

	test('flag types with defaults', async () => {
		const parsed = await cli({
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
		}, p => p, []);

		expectTypeOf(parsed.flags.stringFlag).toBeString();
		expectTypeOf(parsed.flags.numberFlag).toBeNumber();
		expectTypeOf(parsed.flags.booleanFlag).toBeBoolean();
	});

	test('array flag types', async () => {
		const parsed = await cli({
			flags: {
				stringArray: [String],
				numberArray: {
					type: [Number],
				},
			},
		}, p => p, []);

		expectTypeOf(parsed.flags.stringArray).toEqualTypeOf<string[]>();
		expectTypeOf(parsed.flags.numberArray).toEqualTypeOf<number[]>();
	});

	test('custom type function', async () => {
		const parsed = await cli({
			flags: {
				date: (value: string) => new Date(value),
			},
		}, p => p, []);

		expectTypeOf(parsed.flags.date).toEqualTypeOf<Date | undefined>();
	});

	test('flag with alias and description', async () => {
		const parsed = await cli({
			flags: {
				extraOptions: {
					type: Boolean,
					alias: 'e',
					default: false,
					description: 'Some description',
				},
			},
		}, p => p, []);

		expectTypeOf(parsed.flags.extraOptions).toBeBoolean();
	});

	test('version flag is added when version is set', async () => {
		const parsed = await cli({
			version: '1.0.0',
			flags: {
				foo: String,
			},
		}, p => p, []);

		expectTypeOf(parsed.flags).toEqualTypeOf<{
			foo: string | undefined;
			version: boolean | undefined;
			help: boolean | undefined;
		}>();
	});

	test('help flag is not added when help is false', async () => {
		const parsed = await cli({
			help: false,
			flags: {
				foo: String,
			},
		}, p => p, []);

		expectTypeOf(parsed.flags).toEqualTypeOf<{
			foo: string | undefined;
		}>();
	});

	test('required and optional parameters', async () => {
		const parsed = await cli({
			parameters: ['<required>', '[optional]'],
		}, p => p, ['req']);

		expectTypeOf(parsed._.required).toBeString();
		expectTypeOf(parsed._.optional).toEqualTypeOf<string | undefined>();
	});

	test('spread parameters', async () => {
		const parsed = await cli({
			parameters: ['<foo>', '[bar...]'],
		}, p => p, ['value1']);

		expectTypeOf(parsed._.foo).toBeString();
		expectTypeOf(parsed._.bar).toEqualTypeOf<string[]>();
	});

	test('parameter name normalization to camelCase', async () => {
		const parsed = await cli({
			parameters: ['<hello world>'],
		}, p => p, ['a']);

		expectTypeOf(parsed._).toHaveProperty('helloWorld');
		expectTypeOf(parsed._.helloWorld).toBeString();
	});

	test('parameters with flags', async () => {
		const parsed = await cli({
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
		}, p => p, ['value1']);

		expectTypeOf(parsed._.foo).toBeString();
		expectTypeOf(parsed._.bar).toEqualTypeOf<string[]>();
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
	});

	test('no parameters', async () => {
		const parsed = await cli({
			flags: {
				flag: String,
			},
		}, p => p, []);

		expectTypeOf(parsed._['--']).toEqualTypeOf<string[]>();
		expectTypeOf(parsed._).toMatchTypeOf<string[]>();
	});

	test('double dash arguments', async () => {
		const parsed = await cli({}, p => p, ['--', 'arg1', 'arg2']);

		expectTypeOf(parsed._['--']).toEqualTypeOf<string[]>();
	});

	test('callback type inference', async () => {
		await cli({
			flags: {
				booleanFlag: Boolean,
				booleanFlagDefault: {
					type: Boolean,
					default: false,
				},
			},
		}, (parsed) => {
			expectTypeOf(parsed.flags).toEqualTypeOf<{
				help: boolean | undefined;
				booleanFlag: boolean | undefined;
				booleanFlagDefault: boolean;
			}>();
		}, []);
	});

	test('runCommand is on parsed (always defined)', async () => {
		await cli({
			flags: {
				foo: String,
			},
		}, (parsed) => {
			type RunCommand = (context?: unknown) => Promise<unknown>;
			expectTypeOf(parsed.runCommand).toEqualTypeOf<RunCommand>();
			expectTypeOf(parsed.runCommand).not.toBeUndefined();
		}, []);
	});

	test('runCommand resolves to unknown', async () => {
		await cli({
			commands: {
				build: () => 42 as const,
			},
		}, async ({ runCommand }) => {
			// runCommand is always defined — no undefined check needed.
			// Awaited return type is `unknown` since the matched handler's
			// type isn't carried through CommandEntry.
			const value = await runCommand();
			expectTypeOf(value).toEqualTypeOf<unknown>();
		}, ['build']);
	});

	test('async callback', async () => {
		const result = cli({
			flags: {
				foo: String,
			},
		}, async (parsed) => {
			expectTypeOf(parsed.flags.foo).toEqualTypeOf<string | undefined>();
		}, []);

		expectTypeOf(result).toEqualTypeOf<Promise<Awaited<typeof result>>>();
	});

	test('Flags type is exported and usable', async () => {
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

		const flags: Flags = sharedFlags;
		expectTypeOf(flags).toMatchTypeOf<Flags>();

		const parsed = await cli({
			flags: sharedFlags,
		}, p => p, []);

		expectTypeOf(parsed.flags.verbose).toEqualTypeOf<boolean | undefined>();
		expectTypeOf(parsed.flags.config).toEqualTypeOf<string | undefined>();
	});

	test('unknown cli options cause type errors', () => {
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
		cli({
			name: 'test',
			ignoreArgv(type, flagOrArgv, value) {
				expectTypeOf(type).toEqualTypeOf<'argument' | 'known-flag' | 'unknown-flag'>();
				expectTypeOf(flagOrArgv).toBeString();
				expectTypeOf(value).toEqualTypeOf<string | undefined>();
				return false;
			},
		});

		cli({
			name: 'test',
			ignoreArgv(_type, _flagOrArgv, _value) {
				return false;
			},
		});
	});

	test('Parameters<typeof cli> is not never', () => {
		type CliParameters = Parameters<typeof cli>;

		expectTypeOf<CliParameters>().not.toBeNever();
		expectTypeOf<CliParameters[0]>().not.toBeNever();
	});

	test('cli() without callback resolves to void', async () => {
		const result = await cli({});

		expectTypeOf(result).toBeVoid();
	});

	test('cli() with callback resolves to callback return value', async () => {
		const result = await cli({}, p => p);

		expectTypeOf(result).toHaveProperty('flags');
		expectTypeOf(result).toHaveProperty('showHelp');
		expectTypeOf(result).toHaveProperty('showVersion');
		expectTypeOf(result).not.toBeVoid();
	});
});
