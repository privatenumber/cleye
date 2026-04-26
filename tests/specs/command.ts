import { setImmediate } from 'node:timers/promises';
import { describe, test, expect } from 'manten';
import { spy } from 'nanospy';
import { mockEnvFunctions } from '../utils/mock-env-functions.ts';
import { cli } from '#cleye';

describe('command', () => {
	describe('error handling', () => {
		test('duplicate command alias', async () => {
			// Use argv that triggers alias resolution (not a direct command name match)
			await expect(
				cli(
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
				),
			).rejects.toThrow('Duplicate command alias: "dup"');
		});

		test('duplicate alias across array aliases', async () => {
			await expect(
				cli(
					{
						commands: {
							commandA: {
								alias: ['a', 'shared'],
								loader: () => {},
							},
							commandB: {
								alias: 'shared',
								loader: () => {},
							},
						},
					},
					undefined,
					['shared'],
				),
			).rejects.toThrow('Duplicate command alias: "shared"');
		});
	}, { parallel: false });

	describe('command matching', () => {
		test('invoking command by name', async () => {
			const callback = spy();

			const parsed = await cli(
				{
					commands: {
						commandA: () => {
							callback();
						},
					},
				},
				undefined,
				['commandA'],
			);

			expect(parsed.command).toBe('commandA');
			expect(callback.called).toBe(true);
		});

		test('invoking command via alias string', async () => {
			const callback = spy();

			const parsed = await cli(
				{
					commands: {
						commandA: {
							alias: 'a',
							loader: () => {
								callback();
							},
						},
					},
				},
				undefined,
				['a'],
			);

			expect(parsed.command).toBe('commandA');
			await parsed.runCommand!();
			expect(callback.called).toBe(true);
		});

		test('invoking command via alias array', async () => {
			const callback = spy();

			const parsed = await cli(
				{
					commands: {
						commandA: {
							alias: ['a', 'b'],
							loader: () => {
								callback();
							},
						},
					},
				},
				undefined,
				['b'],
			);

			expect(parsed.command).toBe('commandA');
			await parsed.runCommand!();
			expect(callback.called).toBe(true);
		});

		test('unknown command shows help and exits', async () => {
			const mocked = mockEnvFunctions();

			await cli(
				{
					name: 'my-cli',
					commands: {
						build: () => {},
						test: () => {},
					},
				},
				undefined,
				['unknown'],
			);

			mocked.restore();

			expect(mocked.consoleLog.called).toBe(true);
			expect(mocked.processExit.calls[0]).toStrictEqual([1]);
		});

		test('no argv shows help and exits', async () => {
			const mocked = mockEnvFunctions();

			await cli(
				{
					name: 'my-cli',
					commands: {
						build: () => {},
					},
				},
				undefined,
				[],
			);

			mocked.restore();

			expect(mocked.consoleLog.called).toBe(true);
			expect(mocked.processExit.calls[0]).toStrictEqual([1]);
		});
	}, { parallel: false });

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
				(parsed, runCommand) => {
					expect(parsed.command).toBe('build');
					expect(typeof runCommand).toBe('function');
					callbackSpy();
				},
				['build'],
			);

			// Callback was called
			expect(callbackSpy.called).toBe(true);

			// Command auto-invoked since callback didn't call runCommand
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
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['build'],
			);

			expect(commandHandler.called).toBe(true);
		});

		test('callback without command match gets undefined runCommand', async () => {
			const callbackSpy = spy();

			await cli(
				{
					commands: {
						build: () => {},
					},
				},
				(parsed, runCommand) => {
					expect(parsed.command).toBeUndefined();
					expect(runCommand).toBeUndefined();
					callbackSpy();
				},
				['--help=false'],
			);

			expect(callbackSpy.called).toBe(true);
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
				async (_parsed, runCommand) => {
					await runCommand!();
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
				async (_parsed, runCommand) => {
					await runCommand!();
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
			const parsed = await cli(
				{
					flags: {
						verbose: Boolean,
					},
					commands: {
						build: () => {},
					},
				},
				undefined,
				['--verbose', 'build'],
			);

			expect(parsed.command).toBe('build');
			expect(parsed.flags.verbose).toBe(true);
		});

		test('flags after command are NOT parsed by parent', async () => {
			const parsed = await cli(
				{
					flags: {
						verbose: Boolean,
					},
					commands: {
						build: () => {},
					},
				},
				undefined,
				['build', '--verbose'],
			);

			expect(parsed.command).toBe('build');
			// --verbose is after the command, so it belongs to the child
			expect(parsed.flags.verbose).toBeUndefined();
		});

		test('child receives flags after command boundary', async () => {
			let childFlags: Record<string, unknown> | undefined;

			await cli(
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
							});
							childFlags = inner.flags;
						},
					},
				},
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['--verbose', 'build', '--watch', '--output', 'dist'],
			);

			expect(childFlags).toBeDefined();
			expect(childFlags!.watch).toBe(true);
			expect(childFlags!.output).toBe('dist');
		});

		test('mixed flags: parent before, child after command', async () => {
			let childWatch: boolean | undefined;

			const parsed = await cli(
				{
					flags: {
						verbose: Boolean,
					},
					commands: {
						build: async () => {
							const inner = await cli({
								flags: { watch: Boolean },
							});
							childWatch = inner.flags.watch;
						},
					},
				},
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['--verbose', 'build', '--watch'],
			);

			expect(parsed.flags.verbose).toBe(true);
			expect(childWatch).toBe(true);
		});

		test('command alias triggers boundary', async () => {
			let childSaveDev: boolean | undefined;

			const parsed = await cli(
				{
					flags: {
						verbose: Boolean,
					},
					commands: {
						install: {
							alias: 'i',
							loader: async () => {
								const inner = await cli({
									flags: { saveDev: Boolean },
								});
								childSaveDev = inner.flags.saveDev;
							},
						},
					},
				},
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['--verbose', 'i', '--save-dev'],
			);

			expect(parsed.command).toBe('install');
			expect(parsed.flags.verbose).toBe(true);
			expect(childSaveDev).toBe(true);
		});

		test('flag with value before command', async () => {
			const parsed = await cli(
				{
					flags: {
						output: String,
					},
					commands: {
						build: () => {},
					},
				},
				undefined,
				['--output', 'dist', 'build', '--watch'],
			);

			expect(parsed.command).toBe('build');
			expect(parsed.flags.output).toBe('dist');
		});

		test('no commands defined — all flags parsed normally', async () => {
			const parsed = await cli(
				{
					flags: {
						verbose: Boolean,
						watch: Boolean,
					},
				},
				undefined,
				['--verbose', '--watch'],
			);

			expect(parsed.command).toBeUndefined();
			expect(parsed.flags.verbose).toBe(true);
			expect(parsed.flags.watch).toBe(true);
		});

		test('command handler parses its own flags via inner cli()', async () => {
			const innerCallback = spy();

			await cli(
				{
					commands: {
						build: async () => {
							const innerParsed = await cli(
								{
									flags: {
										watch: Boolean,
									},
								},
								undefined,
								['--watch'],
							);
							expect(innerParsed.flags.watch).toBe(true);
							innerCallback();
						},
					},
				},
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['build'],
			);

			expect(innerCallback.called).toBe(true);
		});
	}, { parallel: false });

	describe('command vs flag ambiguity', () => {
		test('command name takes priority over flag name', async () => {
			const commandCallback = spy();
			const cliCallback = spy();

			const parsed = await cli(
				{
					flags: {
						test: Boolean,
					},
					commands: {
						test: () => {
							commandCallback();
						},
					},
				},
				(_parsedInner) => {
					cliCallback();
				},
				['test'],
			);

			// It should be parsed as the command
			expect(parsed.command).toBe('test');

			// Callback was called
			expect(cliCallback.called).toBe(true);

			// Command auto-invoked since callback didn't call runCommand
			expect(commandCallback.called).toBe(true);
		});
	}, { parallel: false });

	describe('strictFlags inheritance', () => {
		test('command inherits strictFlags from parent via context', async () => {
			const mocked = mockEnvFunctions();

			// Parent sets strictFlags: true. Inner cli() inherits it via AsyncLocalStorage.
			// We pass explicit argv to inner cli to avoid the parent catching the unknown flag.
			await cli(
				{
					strictFlags: true,
					commands: {
						build: async () => {
							await cli({
								flags: {
									watch: Boolean,
								},
							}, undefined, ['--wathc']);
						},
					},
				},
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['build'],
			);
			mocked.restore();

			expect(mocked.consoleError.called).toBe(true);
			expect(mocked.consoleError.calls[0][0]).toContain('--wathc');
			expect(mocked.consoleError.calls[0][0]).toContain('--watch');
			expect(mocked.processExit.calls).toStrictEqual([[1]]);
		});

		test('command can override strictFlags to false', async () => {
			const mocked = mockEnvFunctions();

			await cli(
				{
					strictFlags: true,
					commands: {
						build: async () => {
							await cli({
								flags: {
									watch: Boolean,
								},
								strictFlags: false,
							}, undefined, ['--unknown']);
						},
					},
				},
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['build'],
			);
			mocked.restore();

			expect(mocked.consoleError.called).toBe(false);
			expect(mocked.processExit.called).toBe(false);
		});

		test('command can enable strictFlags independently', async () => {
			const mocked = mockEnvFunctions();

			await cli(
				{
					commands: {
						build: async () => {
							await cli({
								flags: {
									watch: Boolean,
								},
								strictFlags: true,
							}, undefined, ['--wathc']);
						},
					},
				},
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['build'],
			);
			mocked.restore();

			expect(mocked.consoleError.called).toBe(true);
			expect(mocked.processExit.calls[0]).toStrictEqual([1]);
		});
	}, { parallel: false });

	describe('booleanFlagNegation inheritance', () => {
		test('command inherits booleanFlagNegation from parent via context', async () => {
			let watchValue: boolean | undefined;

			await cli(
				{
					booleanFlagNegation: true,
					commands: {
						build: async () => {
							const innerParsed = await cli({
								flags: {
									watch: Boolean,
								},
							}, undefined, ['--no-watch']);
							watchValue = innerParsed.flags.watch;
						},
					},
				},
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['build'],
			);

			expect(watchValue).toBe(false);
		});

		test('command can override booleanFlagNegation to false', async () => {
			let watchValue: boolean | undefined;
			let hasNoWatchUnknown = false;

			await cli(
				{
					booleanFlagNegation: true,
					commands: {
						build: async () => {
							const innerParsed = await cli({
								flags: {
									watch: Boolean,
								},
								booleanFlagNegation: false,
							}, undefined, ['--no-watch']);
							watchValue = innerParsed.flags.watch;
							hasNoWatchUnknown = 'no-watch' in innerParsed.unknownFlags;
						},
					},
				},
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['build'],
			);

			expect(watchValue).toBeUndefined();
			expect(hasNoWatchUnknown).toBe(true);
		});

		test('command can enable booleanFlagNegation independently', async () => {
			let watchValue: boolean | undefined;

			await cli(
				{
					commands: {
						build: async () => {
							const innerParsed = await cli({
								flags: {
									watch: Boolean,
								},
								booleanFlagNegation: true,
							}, undefined, ['--no-watch']);
							watchValue = innerParsed.flags.watch;
						},
					},
				},
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['build'],
			);

			expect(watchValue).toBe(false);
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
				async (_parsed, runCommand) => {
					await runCommand!({ message: 'hello' });
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
				async (_parsed, runCommand) => {
					await runCommand!({ port: 3000 });
				},
				['build'],
			);

			expect(received).toStrictEqual({ port: 3000 });
		});

		test('side-effect style works without default export', async () => {
			let ran = false;

			await cli(
				{
					commands: {
						build: async () => {
							ran = true;
						},
					},
				},
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['build'],
			);

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
				(_parsed) => {
					// Callback does not call runCommand
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
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['build'],
			);

			expect(callCount).toBe(1);
		});
	}, { parallel: false });

	describe('command description', () => {
		test('full form command with description', async () => {
			const callback = spy();

			const parsed = await cli(
				{
					commands: {
						install: {
							description: 'Install packages',
							alias: ['i'],
							loader: () => {
								callback();
							},
						},
					},
				},
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['i'],
			);

			expect(parsed.command).toBe('install');
			expect(callback.called).toBe(true);
		});
	}, { parallel: false });

	describe('context', () => {
		test('parsed argv does not have context property', async () => {
			const parsed = await cli(
				{},
				undefined,
				[],
			);

			expect('context' in parsed).toBe(false);
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
					undefined,
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
					undefined,
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
					() => {
						// callback doesn't call runCommand, so auto-invoke happens
					},
					['build'],
				),
			).rejects.toThrow('auto-invoke error');
		});
	}, { parallel: false });

	describe('runCommand idempotency', () => {
		test('returns the same promise on multiple calls', async () => {
			const parsed = await cli(
				{
					commands: {
						build: () => {},
					},
				},
				undefined,
				['build'],
			);

			const promise1 = parsed.runCommand!();
			const promise2 = parsed.runCommand!();
			expect(promise1).toBe(promise2);
			await promise1;
		});
	}, { parallel: false });

	describe('nested commands', () => {
		test('two levels: npm config get <key>', async () => {
			let result: string | undefined;

			await cli(
				{
					name: 'npm',
					commands: {
						config: async () => {
							await cli(
								{
									name: 'config',
									commands: {
										get: async () => {
											const inner = await cli({
												name: 'get',
												parameters: ['<key>'],
											});
											result = inner._.key;
										},
										set: () => {},
										list: () => {},
									},
								},
								async (_parsed, runCommand) => {
									await runCommand!();
								},
							);
						},
					},
				},
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['config', 'get', 'registry'],
			);

			expect(result).toBe('registry');
		});

		test('nested commands inherit options through levels', async () => {
			const mocked = mockEnvFunctions();

			await cli(
				{
					name: 'root',
					strictFlags: true,
					commands: {
						sub: async () => {
							await cli(
								{
									name: 'sub',
									commands: {
										deep: async () => {
											// strictFlags inherited from root → sub → deep
											await cli(
												{
													name: 'deep',
													flags: { watch: Boolean },
												},
												undefined,
												['--wathc'],
											);
										},
									},
								},
								async (_parsed, runCommand) => {
									await runCommand!();
								},
							);
						},
					},
				},
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['sub', 'deep', '--wathc'],
			);
			mocked.restore();

			expect(mocked.consoleError.called).toBe(true);
			expect(mocked.consoleError.calls[0][0]).toContain('--wathc');
		});

		test('nested command gets correct argv at each level', async () => {
			let level1Command: string | undefined;
			let level2Command: string | undefined;
			let level2Flag: boolean | undefined;

			await cli(
				{
					name: 'root',
					flags: { verbose: Boolean },
					commands: {
						remote: async () => {
							const mid = await cli({
								name: 'remote',
								commands: {
									add: async () => {
										const inner = await cli({
											name: 'add',
											flags: { fetch: Boolean },
											parameters: ['<name>', '<url>'],
										});
										level2Command = 'add';
										level2Flag = inner.flags.fetch;
									},
								},
							}, async (_p, run) => {
								await run!();
							});
							level1Command = mid.command;
						},
					},
				},
				async (parsed, runCommand) => {
					expect(parsed.flags.verbose).toBe(true);
					await runCommand!();
				},
				['--verbose', 'remote', 'add', '--fetch', 'origin', 'https://example.com'],
			);

			expect(level1Command).toBe('add');
			expect(level2Command).toBe('add');
			expect(level2Flag).toBe(true);
		});

		test('context passes through nested levels via function args', async () => {
			let receivedContext: unknown;

			await cli(
				{
					name: 'root',
					commands: {
						sub: async () => {
							await cli(
								{
									name: 'sub',
									commands: {
										deep: async () => ({
											default: (context: unknown) => {
												receivedContext = context;
											},
										}),
									},
								},
								async (_parsed, runCommand) => {
									// Pass context from mid-level to deep
									await runCommand!({ fromMid: true });
								},
							);
						},
					},
				},
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['sub', 'deep'],
			);

			expect(receivedContext).toStrictEqual({ fromMid: true });
		});
	}, { parallel: false });

	describe('help on no command match', () => {
		test('shows help and exits when no command matched and no callback', async () => {
			const mocked = mockEnvFunctions();

			await cli(
				{
					name: 'my-cli',
					commands: {
						build: () => {},
						test: () => {},
					},
				},
				undefined,
				[],
			);

			mocked.restore();

			expect(mocked.consoleLog.called).toBe(true);
			expect(mocked.consoleLog.calls[0][0]).toContain('my-cli');
			expect(mocked.processExit.calls[0]).toStrictEqual([1]);
		});

		test('shows help when flags passed but no command matched', async () => {
			const mocked = mockEnvFunctions();

			await cli(
				{
					name: 'my-cli',
					flags: { verbose: Boolean },
					commands: {
						build: () => {},
					},
				},
				undefined,
				['--verbose'],
			);

			mocked.restore();

			expect(mocked.consoleLog.called).toBe(true);
			expect(mocked.processExit.calls[0]).toStrictEqual([1]);
		});

		test('does not show help when command is matched', async () => {
			const mocked = mockEnvFunctions();
			const commandHandler = spy();

			await cli(
				{
					name: 'my-cli',
					commands: {
						build: () => {
							commandHandler();
						},
					},
				},
				undefined,
				['build'],
			);

			mocked.restore();

			expect(commandHandler.called).toBe(true);
			expect(mocked.processExit.called).toBe(false);
		});

		test('does not show help when callback is provided', async () => {
			const mocked = mockEnvFunctions();

			await cli(
				{
					name: 'my-cli',
					commands: {
						build: () => {},
					},
				},
				() => {
					// Callback handles the no-match case
				},
				[],
			);

			mocked.restore();

			expect(mocked.processExit.called).toBe(false);
		});
	}, { parallel: false });
}, { parallel: false });
