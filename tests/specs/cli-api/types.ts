import { describe, test } from 'manten';
import { expectTypeOf } from 'expect-type';
import { cli } from '#cleye';

describe('cli-api types', () => {
	test('resolved type has correct shape', async () => {
		const parsed = cli({
			flags: {
				foo: String,
			},
		}, undefined, []);

		expectTypeOf(parsed.flags).not.toBeNever();
		expectTypeOf(parsed.flags).toEqualTypeOf<{
			foo: string | undefined;
			help: boolean | undefined;
		}>();

		expectTypeOf(parsed._).toMatchTypeOf<string[]>();
		expectTypeOf(parsed._['--']).toEqualTypeOf<string[]>();

		// No `commands` option → command is always undefined; runCommand is the noop signature.
		expectTypeOf(parsed.command).toEqualTypeOf<undefined>();
		type NoopRunCommand = () => undefined;
		expectTypeOf(parsed.runCommand).toEqualTypeOf<NoopRunCommand>();
		// runCommand is always defined — `undefined` must not be in its type.
		expectTypeOf(parsed.runCommand).not.toBeUndefined();
		expectTypeOf<undefined>().not.toMatchTypeOf<typeof parsed.runCommand>();
		expectTypeOf(parsed.showHelp).toBeFunction();
		expectTypeOf(parsed.showVersion).toBeFunction();
		expectTypeOf(parsed.unknownFlags).toEqualTypeOf<{
			[flagName: string]: (string | boolean)[];
		}>();
	});

	test('no parameters', async () => {
		const parsed = cli({
			flags: {
				flag: String,
			},
		}, undefined, []);

		expectTypeOf(parsed._['--']).toEqualTypeOf<string[]>();
		expectTypeOf(parsed._).toMatchTypeOf<string[]>();
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

	test('Parameters<typeof cli> is not never', () => {
		type CliParameters = Parameters<typeof cli>;

		expectTypeOf<CliParameters>().not.toBeNever();
		expectTypeOf<CliParameters[0]>().not.toBeNever();
	});

	test('cli() without callback returns ParsedArgv directly', () => {
		const result = cli({});

		expectTypeOf(result).not.toBeVoid();
		expectTypeOf(result).toHaveProperty('flags');
		expectTypeOf(result).toHaveProperty('runCommand');
	});

	test('cli() with callback resolves to callback return value', async () => {
		const result = await cli({}, p => p);

		expectTypeOf(result).toHaveProperty('flags');
		expectTypeOf(result).toHaveProperty('showHelp');
		expectTypeOf(result).toHaveProperty('showVersion');
		expectTypeOf(result).not.toBeVoid();
	});
}, { parallel: false });
