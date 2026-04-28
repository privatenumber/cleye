import { describe, test } from 'manten';
import { expectTypeOf } from 'expect-type';
import { cli } from '#cleye';

describe('commands types', () => {
	test('runCommand is the noop signature when no commands option', async () => {
		await cli({
			flags: {
				foo: String,
			},
		}, (parsed) => {
			type NoopRunCommand = () => undefined;
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
				expectTypeOf(parsed.runCommand).toEqualTypeOf<() => undefined>();
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

	test('runCommand inherits multi-parameter signatures', async () => {
		const serveModule = {
			default: (port: number, host: string, secure: boolean) => `${host}:${port}/${secure}` as const,
		};
		await cli({
			commands: {
				connect: (host: string, port: number) => `${host}:${port}` as const,
				serve: { loader: async () => serveModule },
			},
		}, async (parsed) => {
			if (parsed.command === 'connect') {
				expectTypeOf(parsed.runCommand).parameters.toEqualTypeOf<[host: string, port: number]>();
				expectTypeOf(await parsed.runCommand('localhost', 3000)).toEqualTypeOf<`${string}:${number}`>();
			}
			if (parsed.command === 'serve') {
				expectTypeOf(parsed.runCommand).parameters
					.toEqualTypeOf<[port: number, host: string, secure: boolean]>();
				expectTypeOf(await parsed.runCommand(3000, 'localhost', true))
					.toEqualTypeOf<`${string}:${number}/${boolean}`>();
			}
		}, ['connect', 'localhost', '3000']);
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
}, { parallel: false });
