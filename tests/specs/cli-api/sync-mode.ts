import { describe, test, expect } from 'manten';
import { expectTypeOf } from 'expect-type';
import { spy } from 'nanospy';
import { cli } from '#cleye';
import { mockEnvFunctions } from '../../utils/mock-env-functions.ts';

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

		test('sync handler throws synchronously from runCommand', () => {
			const argv = cli({
				commands: {
					fail: () => {
						throw new Error('boom');
					},
				},
			}, undefined, ['fail']);

			expect(() => argv.runCommand()).toThrow('boom');
		});

		test('async handler rejects from runCommand', async () => {
			const argv = cli({
				commands: {
					fail: async () => {
						throw new Error('boom');
					},
				},
			}, undefined, ['fail']);

			// Async handler → runCommand returns a Promise.
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

		test('runCommand returns a sync value when handler is sync', () => {
			const argv = cli({
				commands: {
					compute: (n: number) => n * 2,
				},
			}, undefined, ['compute']);

			if (argv.command === 'compute') {
				// Type: synchronous return, no Promise wrap.
				expectTypeOf(argv.runCommand).returns.toEqualTypeOf<number>();
				// Runtime: returns the number directly without await.
				const result = argv.runCommand(21);
				expect(result).toBe(42);
				expect(typeof (result as { then?: unknown }).then).toBe('undefined');
			}
		});

		test('runCommand returns a Promise when handler is async', async () => {
			const argv = cli({
				commands: {
					compute: async (n: number) => n * 2,
				},
			}, undefined, ['compute']);

			if (argv.command === 'compute') {
				expectTypeOf(argv.runCommand).returns.toEqualTypeOf<Promise<number>>();
				const promise = argv.runCommand(21);
				expect(typeof promise.then).toBe('function');
				expect(await promise).toBe(42);
			}
		});

		test('runCommand awaits a dynamic import() loader and invokes the default export', async () => {
			// Real-world pattern: `loader: () => import('./cmd.ts')`.
			const argv = cli({
				commands: {
					transform: {
						loader: () => import('../../fixtures/dynamic-command.ts'),
					},
				},
			}, undefined, ['transform']);

			if (argv.command === 'transform') {
				// Type: parameters come from the imported default; return is
				// the default's return wrapped in a Promise.
				expectTypeOf(argv.runCommand).parameters.toEqualTypeOf<[input: { value: number }]>();
				expectTypeOf(argv.runCommand).returns.toEqualTypeOf<Promise<{
					doubled: number;
					source: string;
				}>>();

				// Runtime: loader is async → runCommand returns Promise.
				const promise = argv.runCommand({ value: 21 });
				expect(typeof promise.then).toBe('function');
				const result = await promise;
				expect(result).toStrictEqual({
					doubled: 42,
					source: 'dynamic-command.ts',
				});
			}
		});

		test('runCommand awaits an async loader returning a module-shaped object', async () => {
			// Same shape as a dynamic import but synthesized inline.
			const moduleNamespace = {
				default: (config: { port: number }) => ({
					port: config.port,
					started: true,
				}),
			};
			const argv = cli({
				commands: {
					serve: {
						loader: async () => moduleNamespace,
					},
				},
			}, undefined, ['serve']);

			if (argv.command === 'serve') {
				expectTypeOf(argv.runCommand).parameters.toEqualTypeOf<[config: { port: number }]>();
				expectTypeOf(argv.runCommand).returns.toEqualTypeOf<Promise<{
					port: number;
					started: boolean;
				}>>();

				const promise = argv.runCommand({ port: 3000 });
				expect(typeof promise.then).toBe('function');
				expect(await promise).toStrictEqual({
					port: 3000,
					started: true,
				});
			}
		});

		test('runCommand forwards multiple arguments to the matched handler and to a module default', async () => {
			// Regression: the runtime previously captured only one argument
			// even though the type system supports multi-arg signatures.
			const handlerCaptured: unknown[] = [];
			const defaultCaptured: unknown[] = [];
			const moduleNamespace = {
				default: (...arguments_: unknown[]) => {
					defaultCaptured.push(...arguments_);
					return arguments_.length;
				},
			};
			const directCli = cli({
				commands: {
					direct: (...arguments_: unknown[]) => {
						handlerCaptured.push(...arguments_);
						return arguments_.length;
					},
				},
			}, undefined, ['direct']);

			if (directCli.command === 'direct') {
				const count = directCli.runCommand('a', 'b', 'c');
				expect(handlerCaptured).toStrictEqual(['a', 'b', 'c']);
				expect(count).toBe(3);
			}

			const moduleCli = cli({
				commands: {
					mod: { loader: async () => moduleNamespace },
				},
			}, undefined, ['mod']);

			if (moduleCli.command === 'mod') {
				const count = await moduleCli.runCommand('x', 'y', 'z');
				expect(defaultCaptured).toStrictEqual(['x', 'y', 'z']);
				expect(count).toBe(3);
			}
		});

		test('strictFlags inherits through a module default into a child cli', () => {
			// Companion to the argv-inheritance test: verify that the parent's
			// resolved options (strictFlags here) flow through to a child cli
			// spawned inside a module default, not just argv.
			const mocked = mockEnvFunctions();
			const moduleNamespace = {
				default: () => {
					// Child cli with no explicit strictFlags — should inherit
					// parent's `true` via parentOptions through CliContext.
					cli({
						flags: {
							known: Boolean,
						},
					});
				},
			};
			cli({
				strictFlags: true,
				commands: {
					run: () => moduleNamespace,
				},
			}, undefined, ['run', '--unknown-flag']).runCommand();
			mocked.restore();

			// strictFlags fired in the child → console.error + process.exit(1)
			expect(mocked.consoleError.calls[0]?.[0]).toMatch(/Unknown flag/);
			expect(mocked.processExit.calls[0]).toStrictEqual([1]);
		});

		test('runCommand rejects too-few args at compile time when default has required params', () => {
			// Negative type test: `Parameters<Default>` must produce a tuple
			// that requires the right arity, not collapse to optional.
			const moduleNamespace = {
				default: (port: number, host: string) => `${host}:${port}`,
			};
			const argv = cli({
				commands: {
					serve: { loader: async () => moduleNamespace },
				},
			}, undefined, ['serve']);

			if (argv.command === 'serve') {
				// Correct call compiles.
				argv.runCommand(3000, 'localhost');
				// @ts-expect-error — missing required `host` argument
				argv.runCommand(3000);
				// @ts-expect-error — wrong type for `port`
				argv.runCommand('3000', 'localhost');
			}
		});

		test('module default invocation runs inside the cli context (parent argv inherited)', async () => {
			// Regression: previously the default-unwrap call was made AFTER
			// runWithCliContext returned, so child cli() calls inside the
			// default would not inherit the parent's argv via AsyncLocalStorage.
			// Verify by spawning a child cli inside the default — if context
			// propagation is broken, the child reads process.argv instead of
			// the parent's command-relative argv.
			let childParameter: string | undefined;
			const moduleNamespace = {
				default: () => {
					// No explicit argv — child should inherit parent's context.
					const child = cli({
						parameters: ['<child-arg>'],
					});
					childParameter = child._.childArg;
				},
			};

			// Sync path: handler returns a module-shaped object directly.
			const syncArgv = cli({
				commands: {
					run: () => moduleNamespace,
				},
			}, undefined, ['run', 'sync-value']);
			if (syncArgv.command === 'run') {
				syncArgv.runCommand();
				expect(childParameter).toBe('sync-value');
			}

			childParameter = undefined;

			// Async path: loader returns Promise<moduleNamespace>.
			const asyncArgv = cli({
				commands: {
					run: { loader: async () => moduleNamespace },
				},
			}, undefined, ['run', 'async-value']);
			if (asyncArgv.command === 'run') {
				await asyncArgv.runCommand();
				expect(childParameter).toBe('async-value');
			}
		});

		test('runCommand passes the argument to the dynamically imported default', async () => {
			let captured: unknown;
			const moduleNamespace = {
				default: (input: unknown) => {
					captured = input;
					return 'ack' as const;
				},
			};
			const argv = cli({
				commands: {
					handle: {
						loader: async () => moduleNamespace,
					},
				},
			}, undefined, ['handle']);

			if (argv.command === 'handle') {
				expectTypeOf(argv.runCommand).returns.toEqualTypeOf<Promise<'ack'>>();
				const result = await argv.runCommand({ payload: 42 });
				expect(captured).toStrictEqual({ payload: 42 });
				expect(result).toBe('ack');
			}
		});

		test('noop runCommand is sync and returns undefined', () => {
			// Use a no-commands cli so the noop branch is reached without
			// triggering the no-match-show-help-and-exit path.
			const argv = cli({
				flags: {
					foo: String,
				},
			}, undefined, []);

			expectTypeOf(argv.runCommand).toEqualTypeOf<() => undefined>();
			const result = argv.runCommand();
			expect(result).toBeUndefined();
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
