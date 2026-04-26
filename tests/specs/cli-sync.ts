import { describe, test, expect } from 'manten';
import { expectTypeOf } from 'expect-type';
import { spy } from 'nanospy';
import { mockEnvFunctions } from '../utils/mock-env-functions.ts';
import { cli } from '#cleye';

describe('cli sync mode', () => {
	describe('return shape', () => {
		test('cli() without callback returns ParsedArgv directly — no await', () => {
			const argv = cli({
				flags: {
					foo: String,
				},
			}, undefined, ['--foo', 'bar']);

			// Runtime: argv is the resolved value, not a thenable.
			expect(argv.flags.foo).toBe('bar');
			expect(typeof (argv as { then?: unknown }).then).toBe('undefined');

			// Type: not a Promise; runCommand is callable; flags isn't never.
			expectTypeOf(argv).not.toMatchTypeOf<Promise<unknown>>();
			expectTypeOf(argv.flags).not.toBeNever();
			expectTypeOf(argv.runCommand).toBeFunction();
		});

		test('cli() with callback returns Promise<CallbackReturn>', async () => {
			const promise = cli({
				flags: {
					foo: String,
				},
			}, parsed => parsed.flags.foo ?? 'fallback', ['--foo', 'bar']);

			// Type: it's a Promise.
			expectTypeOf(promise).toEqualTypeOf<Promise<Awaited<typeof promise>>>();
			expectTypeOf(promise.then).toBeFunction();

			// Runtime: resolves to the callback's return value.
			expect(await promise).toBe('bar');
		});
	}, { parallel: false });

	describe('command behavior', () => {
		test('matched command is NOT auto-invoked in sync mode', () => {
			const handler = spy();
			const argv = cli({
				commands: {
					build: () => {
						handler();
					},
				},
			}, undefined, ['build']);

			expect(argv.command).toBe('build');
			// Sync mode does not auto-invoke — handler hasn't run.
			expect(handler.called).toBe(false);
		});

		test('argv.runCommand() invokes the matched command', async () => {
			const handler = spy();
			const argv = cli({
				commands: {
					build: () => {
						handler();
					},
				},
			}, undefined, ['build']);

			await argv.runCommand();
			expect(handler.called).toBe(true);
		});

		test('runCommand resolves to the handler return value', async () => {
			const argv = cli({
				commands: {
					compute: () => 42,
				},
			}, undefined, ['compute']);

			const result = await argv.runCommand();
			expect(result).toBe(42);
		});

		test('runCommand rejects when handler throws', async () => {
			const argv = cli({
				commands: {
					fail: () => {
						throw new Error('boom');
					},
				},
			}, undefined, ['fail']);

			await expect(argv.runCommand()).rejects.toThrow('boom');
		});

		test('runCommand forwards an argument to the matched handler', async () => {
			const handler = spy();
			const argv = cli({
				commands: {
					deploy: (config: { region: string }) => {
						handler(config);
						return config.region;
					},
				},
			}, undefined, ['deploy']);

			const region = await argv.runCommand({ region: 'us-east-1' });
			expect(handler.calls[0]).toStrictEqual([{ region: 'us-east-1' }]);
			expect(region).toBe('us-east-1');
		});

		test('discriminated union narrows runCommand on parsed.command in sync mode', async () => {
			const argv = cli({
				commands: {
					build: (port: number) => `built on ${port}` as const,
					ping: () => 'pong' as const,
				},
			}, undefined, ['build']);

			expectTypeOf(argv.command).toEqualTypeOf<'build' | 'ping' | undefined>();

			if (argv.command === 'build') {
				expectTypeOf(argv.runCommand).parameters.toEqualTypeOf<[port: number]>();
				const result = await argv.runCommand(3000);
				expectTypeOf(result).toEqualTypeOf<`built on ${number}`>();
				expect(result).toBe('built on 3000');
			}
		});

		test('no-command-matched + commands defined → shows help and exits', () => {
			const mocked = mockEnvFunctions();
			cli({
				name: 'my-cli',
				commands: {
					build: () => {},
				},
			}, undefined, []);
			mocked.restore();

			expect(mocked.consoleLog.called).toBe(true);
			expect(mocked.processExit.calls[0]).toStrictEqual([1]);
		});
	}, { parallel: false });

	describe('errors throw synchronously', () => {
		test('parse error: invalid parameter format', () => {
			expect(() => cli({
				parameters: ['value-a'],
			})).toThrow('Invalid parameter');
		});

		test('parse error: duplicate command alias', () => {
			expect(() => cli(
				{
					commands: {
						commandA: {
							alias: 'dup',
							loader: () => {},
						},
						commandB: {
							alias: 'dup',
							loader: () => {},
						},
					},
				},
				undefined,
				['dup'],
			)).toThrow('Duplicate command alias');
		});
	}, { parallel: false });

	describe('exit-on-help / exit-on-version happen during cli()', () => {
		test('--help exits during the cli() call', () => {
			const mocked = mockEnvFunctions();
			cli({
				flags: {
					foo: String,
				},
			}, undefined, ['--help']);
			mocked.restore();

			// process.exit was called synchronously — during the cli() call.
			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.called).toBe(true);
		});

		test('--version exits during the cli() call', () => {
			const mocked = mockEnvFunctions();
			cli({
				version: '1.0.0',
				flags: {
					foo: String,
				},
			}, undefined, ['--version']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['1.0.0']]);
		});
	}, { parallel: false });
}, { parallel: false });
