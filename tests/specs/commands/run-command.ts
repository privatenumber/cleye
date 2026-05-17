import { setImmediate } from 'node:timers/promises';
import { describe, test, expect } from 'manten';
import { spy } from 'nanospy';
import { cli } from '#cleye';

describe('command with callback', () => {
	test('callback receives parsed and runCommand', async () => {
		const commandHandler = spy();
		const callbackSpy = spy();

		await cli(
			{
				flags: {
					verbose: Boolean,
				},
				commands: {
					build: () => {
						commandHandler();
					},
				},
			},
			(parsed) => {
				expect(parsed.command).toBe('build');
				expect(typeof parsed.runCommand).toBe('function');
				callbackSpy();
			},
			['build'],
		);

		// Callback was called
		expect(callbackSpy.called).toBe(true);

		// Command auto-invoked after callback returns
		expect(commandHandler.called).toBe(true);
	});

	test('callback can call runCommand explicitly', async () => {
		const commandHandler = spy();

		await cli(
			{
				commands: {
					build: () => {
						commandHandler();
					},
				},
			},
			async ({ runCommand }) => {
				await runCommand();
			},
			['build'],
		);

		expect(commandHandler.called).toBe(true);
	});

	test('runCommand is a no-op when no command matched', async () => {
		const buildHandler = spy();
		const callbackSpy = spy();

		await cli(
			{
				commands: {
					build: () => {
						buildHandler();
					},
				},
			},
			async ({ command, runCommand }) => {
				expect(command).toBeUndefined();
				expect(typeof runCommand).toBe('function');
				// runCommand is always callable; resolves to undefined when no match.
				const result = await runCommand();
				expect(result).toBeUndefined();
				callbackSpy();
			},
			['--help=false'],
		);

		expect(callbackSpy.called).toBe(true);
		expect(buildHandler.called).toBe(false);
	});

	test('leading unknown command candidate is not skipped to match a later command', async () => {
		const buildHandler = spy();

		await cli(
			{
				commands: {
					build: () => {
						buildHandler();
					},
				},
			},
			(parsed) => {
				expect(parsed.command).toBeUndefined();
				expect(parsed._.slice()).toStrictEqual(['typo', 'build']);
			},
			['typo', 'build'],
		);

		expect(buildHandler.called).toBe(false);
	});

	test('leading unknown command candidate preserves end-of-flags positionals', async () => {
		await cli(
			{
				commands: {
					build: () => {},
				},
			},
			(parsed) => {
				expect(parsed.command).toBeUndefined();
				expect(parsed._.slice()).toStrictEqual(['typo', 'after']);
				expect(parsed._['--']).toStrictEqual(['after']);
			},
			['typo', '--', 'after'],
		);
	});
}, { parallel: false });

describe('async command callbacks', () => {
	test('cli Promise waits for command callback to complete', async () => {
		let commandCompleted = false;

		const result = cli(
			{
				commands: {
					test: async () => {
						await setImmediate();
						commandCompleted = true;
					},
				},
			},
			async ({ runCommand }) => {
				await runCommand();
			},
			['test'],
		);

		// Command callback shouldn't have completed yet
		expect(commandCompleted).toBe(false);

		// After awaiting cli, command callback should be complete
		await result;
		expect(commandCompleted).toBe(true);
	});

	test('cli Promise never resolves if command callback never resolves', async () => {
		let cliResolved = false;

		const result = cli(
			{
				commands: {
					test: async () => {
						// Never resolve - hang forever
						await new Promise(() => {});
					},
				},
			},
			async ({ runCommand }) => {
				await runCommand();
			},
			['test'],
		);

		// Race the cli promise against a timeout
		await Promise.race([
			result.then(() => {
				cliResolved = true;
			}),
			setImmediate(50),
		]);

		// cli should not have resolved
		expect(cliResolved).toBe(false);
	});
}, { parallel: false });

describe('command with flags and parameters', () => {
	test('parent flags before command are parsed by parent', async () => {
		const parsed = cli({
			flags: {
				verbose: Boolean,
			},
			commands: {
				build: () => {},
			},
		}, undefined, ['--verbose', 'build']);

		expect(parsed.command).toBe('build');
		expect(parsed.flags.verbose).toBe(true);
	});

	test('flags after command are NOT parsed by parent', async () => {
		const parsed = cli({
			flags: {
				verbose: Boolean,
			},
			commands: {
				build: () => {},
			},
		}, undefined, ['build', '--verbose']);

		expect(parsed.command).toBe('build');
		// --verbose is after the command, so it belongs to the child
		expect(parsed.flags.verbose).toBeUndefined();
	});

	test('child receives flags after command boundary', async () => {
		let childFlags: Record<string, unknown> | undefined;

		const parsed = cli(
			{
				flags: {
					verbose: Boolean,
				},
				commands: {
					build: async () => {
						const inner = await cli({
							flags: {
								watch: Boolean,
								output: String,
							},
						}, p => p);
						childFlags = inner.flags;
					},
				},
			},
			undefined,
			['--verbose', 'build', '--watch', '--output', 'dist'],
		);
		await parsed.runCommand();

		expect(childFlags).toBeDefined();
		expect(childFlags!.watch).toBe(true);
		expect(childFlags!.output).toBe('dist');
	});

	test('mixed flags: parent before, child after command', async () => {
		let childWatch: boolean | undefined;

		const parsed = cli({
			flags: {
				verbose: Boolean,
			},
			commands: {
				build: async () => {
					const inner = await cli({
						flags: { watch: Boolean },
					}, p => p);
					childWatch = inner.flags.watch;
				},
			},
		}, undefined, ['--verbose', 'build', '--watch']);

		await parsed.runCommand();
		expect(parsed.flags.verbose).toBe(true);
		expect(childWatch).toBe(true);
	});

	test('command alias triggers boundary', async () => {
		let childSaveDev: boolean | undefined;

		const parsed = cli({
			flags: {
				verbose: Boolean,
			},
			commands: {
				install: {
					alias: 'i',
					loader: async () => {
						const inner = await cli({
							flags: { saveDev: Boolean },
						}, p => p);
						childSaveDev = inner.flags.saveDev;
					},
				},
			},
		}, undefined, ['--verbose', 'i', '--save-dev']);

		await parsed.runCommand();
		expect(parsed.command).toBe('install');
		expect(parsed.flags.verbose).toBe(true);
		expect(childSaveDev).toBe(true);
	});

	test('flag with value before command', async () => {
		const parsed = cli({
			flags: {
				output: String,
			},
			commands: {
				build: () => {},
			},
		}, undefined, ['--output', 'dist', 'build', '--watch']);

		expect(parsed.command).toBe('build');
		expect(parsed.flags.output).toBe('dist');
	});

	test('no commands defined — all flags parsed normally', async () => {
		const parsed = cli({
			flags: {
				verbose: Boolean,
				watch: Boolean,
			},
		}, undefined, ['--verbose', '--watch']);

		expect(parsed.command).toBeUndefined();
		expect(parsed.flags.verbose).toBe(true);
		expect(parsed.flags.watch).toBe(true);
	});

	test('command handler parses its own flags via inner cli()', async () => {
		const innerCallback = spy();

		const parsed = cli(
			{
				commands: {
					build: async () => {
						const innerParsed = cli({
							flags: {
								watch: Boolean,
							},
						}, undefined, ['--watch']);
						expect(innerParsed.flags.watch).toBe(true);
						innerCallback();
					},
				},
			},
			undefined,
			['build'],
		);
		await parsed.runCommand();

		expect(innerCallback.called).toBe(true);
	});
}, { parallel: false });

describe('runCommand context passing', () => {
	test('runCommand passes arg to shorthand command handler', async () => {
		let received: unknown;

		await cli(
			{
				commands: {
					build: (config: unknown) => {
						received = config;
					},
				},
			},
			async ({ runCommand }) => {
				await runCommand({ message: 'hello' });
			},
			['build'],
		);

		expect(received).toStrictEqual({ message: 'hello' });
	});

	test('runCommand passes arg to dynamic import default export', async () => {
		let received: unknown;

		await cli(
			{
				commands: {
					build: async () => ({
						default: (config: unknown) => {
							received = config;
						},
					}),
				},
			},
			async ({ runCommand }) => {
				await runCommand({ port: 3000 });
			},
			['build'],
		);

		expect(received).toStrictEqual({ port: 3000 });
	});

	test('side-effect style works without default export', async () => {
		let ran = false;

		const parsed = cli(
			{
				commands: {
					build: async () => {
						ran = true;
					},
				},
			},
			undefined,
			['build'],
		);
		await parsed.runCommand();

		expect(ran).toBe(true);
	});
}, { parallel: false });

describe('auto-invoke command', () => {
	test('command is auto-invoked when callback does not call runCommand', async () => {
		const commandHandler = spy();

		await cli(
			{
				commands: {
					build: () => {
						commandHandler();
					},
				},
			},
			() => {
				// Does not call runCommand — auto-invoke fires after the callback
			},
			['build'],
		);

		expect(commandHandler.called).toBe(true);
	});

	test('command is not double-invoked when callback calls runCommand', async () => {
		let callCount = 0;

		await cli(
			{
				commands: {
					build: () => {
						callCount += 1;
					},
				},
			},
			async ({ runCommand }) => {
				await runCommand();
			},
			['build'],
		);

		expect(callCount).toBe(1);
	});
}, { parallel: false });

describe('runCommand error handling', () => {
	test('sync throw in command handler rejects the promise', async () => {
		await expect(
			cli(
				{
					commands: {
						build: () => {
							throw new Error('handler error');
						},
					},
				},
				async ({ runCommand }) => {
					await runCommand();
				},
				['build'],
			),
		).rejects.toThrow('handler error');
	});

	test('async throw in command handler rejects the promise', async () => {
		await expect(
			cli(
				{
					commands: {
						build: async () => {
							throw new Error('async handler error');
						},
					},
				},
				async ({ runCommand }) => {
					await runCommand();
				},
				['build'],
			),
		).rejects.toThrow('async handler error');
	});

	test('error in auto-invoked command propagates through cli()', async () => {
		await expect(
			cli(
				{
					commands: {
						build: () => {
							throw new Error('auto-invoke error');
						},
					},
				},
				async ({ runCommand }) => {
					await runCommand();
				},
				['build'],
			),
		).rejects.toThrow('auto-invoke error');
	});
}, { parallel: false });

describe('runCommand repeated invocation', () => {
	test('invokes the handler on each call with the latest arguments', async () => {
		const calls: string[] = [];
		const parsed = cli({
			commands: {
				build: async (value: string) => {
					calls.push(value);
					return `built:${value}`;
				},
			},
		}, undefined, ['build']);

		const promise1 = parsed.runCommand('one');
		const promise2 = parsed.runCommand('two');

		expect(promise1).not.toBe(promise2);
		expect(await promise1).toBe('built:one');
		expect(await promise2).toBe('built:two');
		expect(calls).toStrictEqual(['one', 'two']);
	});

	test('invokes a loader default export on each call with the latest arguments', async () => {
		const calls: string[] = [];
		let loaderCalls = 0;
		const moduleNamespace = {
			default: (value: string) => {
				calls.push(value);
				return `built:${value}`;
			},
		};
		const parsed = cli({
			commands: {
				build: {
					loader: () => {
						loaderCalls += 1;
						return moduleNamespace;
					},
				},
			},
		}, undefined, ['build']);

		expect(await parsed.runCommand('one')).toBe('built:one');
		expect(await parsed.runCommand('two')).toBe('built:two');
		expect(loaderCalls).toBe(2);
		expect(calls).toStrictEqual(['one', 'two']);
	});

	test('can retry after a synchronous failure', () => {
		let ready = false;
		let callCount = 0;
		const parsed = cli({
			commands: {
				fail: () => {
					callCount += 1;
					if (!ready) {
						throw new Error('not ready');
					}
					return 'ok';
				},
			},
		}, undefined, ['fail']);

		expect(() => parsed.runCommand()).toThrow('not ready');
		ready = true;

		expect(parsed.runCommand()).toBe('ok');
		expect(callCount).toBe(2);
	});

	test('can retry after an asynchronous failure', async () => {
		let ready = false;
		let callCount = 0;
		const parsed = cli({
			commands: {
				fail: async () => {
					callCount += 1;
					if (!ready) {
						throw new Error('not ready');
					}
					return 'ok';
				},
			},
		}, undefined, ['fail']);

		await expect(parsed.runCommand()).rejects.toThrow('not ready');
		ready = true;

		await expect(parsed.runCommand()).resolves.toBe('ok');
		expect(callCount).toBe(2);
	});
}, { parallel: false });

describe('runCommand return value', () => {
	test('forwards a function handler return value', async () => {
		const parsed = cli({
			commands: {
				compute: () => 42,
			},
		}, undefined, ['compute']);
		expect(await parsed.runCommand()).toBe(42);
	});

	test('forwards an async handler return value', async () => {
		const parsed = cli({
			commands: {
				compute: async () => 'done',
			},
		}, undefined, ['compute']);
		expect(await parsed.runCommand()).toBe('done');
	});

	test('forwards default-export return value when loader resolves to a module', async () => {
		const moduleNamespace = {
			default: () => ({ value: 7 }),
		};
		let captured: unknown;
		await cli(
			{
				commands: {
					build: {
						loader: () => moduleNamespace,
					},
				},
			},
			async ({ runCommand }) => {
				captured = await runCommand();
			},
			['build'],
		);
		expect(captured).toStrictEqual({ value: 7 });
	});
}, { parallel: false });
