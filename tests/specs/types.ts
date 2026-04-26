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

		// No `commands` option → command is always undefined; runCommand is the noop signature.
		expectTypeOf(parsed.command).toEqualTypeOf<undefined>();
		type NoopRunCommand = () => Promise<undefined>;
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

	test('runCommand is the noop signature when no commands option', async () => {
		await cli({
			flags: {
				foo: String,
			},
		}, (parsed) => {
			type NoopRunCommand = () => Promise<undefined>;
			expectTypeOf(parsed.runCommand).toEqualTypeOf<NoopRunCommand>();
			expectTypeOf(parsed.runCommand).not.toBeUndefined();
		}, []);
	});

	test('runCommand is typed by matched command', async () => {
		await cli({
			commands: {
				build: (port: number) => `built on ${port}` as const,
				deploy: async (region: string) => ({
					ok: true,
					region,
				}),
			},
		}, async (parsed) => {
			// Without narrowing, `parsed.command` is the union of literal command names + undefined
			expectTypeOf(parsed.command).toEqualTypeOf<'build' | 'deploy' | undefined>();

			if (parsed.command === 'build') {
				// Narrowed: runCommand expects the build handler's args + return.
				expectTypeOf(parsed.runCommand).parameters.toEqualTypeOf<[port: number]>();
				const result = await parsed.runCommand(3000);
				expectTypeOf(result).toEqualTypeOf<`built on ${number}`>();
			}

			if (parsed.command === 'deploy') {
				expectTypeOf(parsed.runCommand).parameters.toEqualTypeOf<[region: string]>();
				const result = await parsed.runCommand('us-east-1');
				expectTypeOf(result).toEqualTypeOf<{ ok: boolean;
					region: string; }>();
			}

			if (parsed.command === undefined) {
				// Noop branch.
				expectTypeOf(parsed.runCommand).toEqualTypeOf<() => Promise<undefined>>();
			}
		}, ['build']);
	});

	test('runCommand unwraps loader → module default export', async () => {
		const buildModule = {
			default: (config: { port: number }) => ({
				port: config.port,
				started: true,
			}),
		};
		await cli({
			commands: {
				build: { loader: () => buildModule },
			},
		}, async (parsed) => {
			if (parsed.command === 'build') {
				expectTypeOf(parsed.runCommand).parameters.toEqualTypeOf<[config: { port: number }]>();
				const result = await parsed.runCommand({ port: 3000 });
				expectTypeOf(result).toEqualTypeOf<{ port: number;
					started: boolean; }>();
			}
		}, ['build']);
	});

	test('runCommand handles zero-argument handler', async () => {
		await cli({
			commands: {
				ping: () => 'pong' as const,
			},
		}, async (parsed) => {
			if (parsed.command === 'ping') {
				expectTypeOf(parsed.runCommand).parameters.toEqualTypeOf<[]>();
				const result = await parsed.runCommand();
				expectTypeOf(result).toEqualTypeOf<'pong'>();
			}
		}, ['ping']);
	});

	test('runCommand handles optional argument', async () => {
		await cli({
			commands: {
				start: (port?: number) => `listening on ${port ?? 3000}` as const,
			},
		}, async (parsed) => {
			if (parsed.command === 'start') {
				expectTypeOf(parsed.runCommand).parameters.toEqualTypeOf<[port?: number]>();
				// Both signatures must compile.
				await parsed.runCommand();
				await parsed.runCommand(8080);
			}
		}, ['start']);
	});

	test('runCommand uses loader signature when default is not a function', async () => {
		// Loader resolves to an object whose `default` is a string — not callable.
		// The runCommand type should fall back to the loader's own signature.
		const moduleWithStringDefault = { default: 'not-a-function' as const };
		await cli({
			commands: {
				build: {
					loader: (token: string) => ({
						...moduleWithStringDefault,
						token,
					}),
				},
			},
		}, async (parsed) => {
			if (parsed.command === 'build') {
				expectTypeOf(parsed.runCommand).parameters.toEqualTypeOf<[token: string]>();
				const result = await parsed.runCommand('xyz');
				// The loader's own return is preserved (not unwrapped).
				expectTypeOf(result).toEqualTypeOf<{ default: 'not-a-function';
					token: string; }>();
			}
		}, ['build']);
	});

	test('runCommand uses loader signature when result has no default key', async () => {
		await cli({
			commands: {
				compute: { loader: (input: number) => input * 2 },
			},
		}, async (parsed) => {
			if (parsed.command === 'compute') {
				expectTypeOf(parsed.runCommand).parameters.toEqualTypeOf<[input: number]>();
				const result = await parsed.runCommand(21);
				expectTypeOf(result).toEqualTypeOf<number>();
			}
		}, ['compute']);
	});

	test('runCommand unwraps async loader returning a module namespace', async () => {
		const greetModule = {
			default: (name: string) => `hello ${name}` as const,
		};
		await cli({
			commands: {
				greet: { loader: async () => greetModule },
			},
		}, async (parsed) => {
			if (parsed.command === 'greet') {
				expectTypeOf(parsed.runCommand).parameters.toEqualTypeOf<[name: string]>();
				const result = await parsed.runCommand('world');
				expectTypeOf(result).toEqualTypeOf<`hello ${string}`>();
			}
		}, ['greet']);
	});

	test('runCommand mixes shorthand and object-form commands', async () => {
		const buildModule = {
			default: (mode: 'dev' | 'prod') => `${mode}-build` as const,
		};
		await cli({
			commands: {
				ping: () => 'pong' as const,
				build: { loader: () => buildModule },
			},
		}, async (parsed) => {
			expectTypeOf(parsed.command).toEqualTypeOf<'ping' | 'build' | undefined>();
			if (parsed.command === 'ping') {
				expectTypeOf(parsed.runCommand).parameters.toEqualTypeOf<[]>();
				expectTypeOf(await parsed.runCommand()).toEqualTypeOf<'pong'>();
			}
			if (parsed.command === 'build') {
				expectTypeOf(parsed.runCommand).parameters.toEqualTypeOf<[mode: 'dev' | 'prod']>();
				expectTypeOf(await parsed.runCommand('dev')).toEqualTypeOf<'dev-build' | 'prod-build'>();
			}
		}, ['ping']);
	});

	test('parsed.command reports canonical name, not alias', async () => {
		await cli({
			commands: {
				install: {
					alias: ['i', 'add'],
					loader: (pkg: string) => `installed ${pkg}` as const,
				},
			},
		}, async (parsed) => {
			// Aliases are NOT in the discriminated union — only canonical command names.
			expectTypeOf(parsed.command).toEqualTypeOf<'install' | undefined>();
			if (parsed.command === 'install') {
				expectTypeOf(parsed.runCommand).parameters.toEqualTypeOf<[pkg: string]>();
			}
		}, ['i', 'lodash']);
	});

	test('runCommand rejects wrong arg types at compile time', async () => {
		await cli({
			commands: {
				build: (port: number) => port,
			},
		}, async (parsed) => {
			if (parsed.command === 'build') {
				// @ts-expect-error — string is not assignable to number
				await parsed.runCommand('not-a-number');
				// @ts-expect-error — too many arguments
				await parsed.runCommand(3000, 'extra');
				// @ts-expect-error — missing required argument
				await parsed.runCommand();
			}
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
