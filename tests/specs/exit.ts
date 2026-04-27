import { describe, test, expect } from 'manten';
import { cli, CleyeExit } from '#cleye';
import { mockEnvFunctions } from '../utils/mock-env-functions.ts';

describe('throwOnExit / non-intrusive mode', () => {
	test('default behavior calls process.exit', () => {
		const mocked = mockEnvFunctions();
		cli({
			version: '1.0.0',
		}, undefined, ['--version']);
		mocked.restore();
		expect(mocked.processExit.calls).toStrictEqual([[0]]);
	});

	test('throwOnExit: true throws CleyeExit instead of calling process.exit', () => {
		const mocked = mockEnvFunctions();

		expect(() => cli({
			version: '1.0.0',
			throwOnExit: true,
		}, undefined, ['--version'])).toThrow(CleyeExit);

		mocked.restore();
		expect(mocked.processExit.called).toBe(false);
	});

	describe('reasons', () => {
		const captureExit = (function_: () => unknown): CleyeExit | undefined => {
			try {
				function_();
				return undefined;
			} catch (error) {
				if (error instanceof CleyeExit) {
					return error;
				}
				throw error;
			}
		};

		test('--help → reason "help" with code 0', () => {
			const mocked = mockEnvFunctions();
			const error = captureExit(() => cli({ throwOnExit: true }, undefined, ['--help']));
			mocked.restore();
			expect(error?.code).toBe(0);
			expect(error?.reason).toBe('help');
		});

		test('-h (short) → reason "help" with code 0', () => {
			const mocked = mockEnvFunctions();
			const error = captureExit(() => cli({ throwOnExit: true }, undefined, ['-h']));
			mocked.restore();
			expect(error?.code).toBe(0);
			expect(error?.reason).toBe('help');
		});

		test('--version → reason "version" with code 0', () => {
			const mocked = mockEnvFunctions();
			const error = captureExit(() => cli({
				version: '1.0.0',
				throwOnExit: true,
			}, undefined, ['--version']));
			mocked.restore();
			expect(error?.code).toBe(0);
			expect(error?.reason).toBe('version');
		});

		test('missing required parameter → reason "missing-required-parameter" with code 1', () => {
			const mocked = mockEnvFunctions();
			const error = captureExit(() => cli({
				parameters: ['<file>'],
				throwOnExit: true,
			}, undefined, []));
			mocked.restore();
			expect(error?.code).toBe(1);
			expect(error?.reason).toBe('missing-required-parameter');
		});

		test('strictFlags unknown flag → reason "unknown-flag" with code 1', () => {
			const mocked = mockEnvFunctions();
			const error = captureExit(() => cli({
				flags: { foo: Boolean },
				strictFlags: true,
				throwOnExit: true,
			}, undefined, ['--bar']));
			mocked.restore();
			expect(error?.code).toBe(1);
			expect(error?.reason).toBe('unknown-flag');
		});

		test('strictCommands unknown command → reason "unknown-command" with code 1', () => {
			const mocked = mockEnvFunctions();
			const error = captureExit(() => cli({
				commands: { build: () => {} },
				strictCommands: true,
				throwOnExit: true,
			}, undefined, ['biuld']));
			mocked.restore();
			expect(error?.code).toBe(1);
			expect(error?.reason).toBe('unknown-command');
		});

		test('sync-mode no command match → reason "no-command-match" with code 1', () => {
			const mocked = mockEnvFunctions();
			const error = captureExit(() => cli({
				commands: { build: () => {} },
				throwOnExit: true,
			}, undefined, []));
			mocked.restore();
			expect(error?.code).toBe(1);
			expect(error?.reason).toBe('no-command-match');
		});
	}, { parallel: false });

	describe('CleyeExit', () => {
		test('carries code and reason; instanceof Error', () => {
			const error = new CleyeExit(2, 'unknown-flag');
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(CleyeExit);
			expect(error.code).toBe(2);
			expect(error.reason).toBe('unknown-flag');
			expect(error.name).toBe('CleyeExit');
			expect(error.message).toContain('unknown-flag');
		});
	});

	describe('inheritance', () => {
		test('child cli inherits parent throwOnExit via context', () => {
			const mocked = mockEnvFunctions();

			let caught: CleyeExit | undefined;
			const parsed = cli({
				throwOnExit: true,
				commands: {
					outer: () => {
						// Child has no `throwOnExit` — should inherit `true` from parent.
						try {
							cli({
								flags: { watch: Boolean },
								strictFlags: true,
							}, undefined, ['--unknown']);
						} catch (error) {
							if (error instanceof CleyeExit) {
								caught = error;
							}
							throw error;
						}
					},
				},
			}, undefined, ['outer']);

			expect(() => parsed.runCommand()).toThrow(CleyeExit);
			mocked.restore();
			expect(caught?.reason).toBe('unknown-flag');
			expect(mocked.processExit.called).toBe(false);
		});

		test('child can override inherited throwOnExit to false', () => {
			const mocked = mockEnvFunctions();

			const parsed = cli({
				throwOnExit: true,
				commands: {
					outer: () => {
						// Child overrides to false → child should call process.exit instead of throwing.
						cli({
							flags: { watch: Boolean },
							strictFlags: true,
							throwOnExit: false,
						}, undefined, ['--unknown']);
					},
				},
			}, undefined, ['outer']);

			parsed.runCommand();
			mocked.restore();
			expect(mocked.processExit.calls[0]).toStrictEqual([1]);
		});
	}, { parallel: false });

	describe('async path', () => {
		test('throwOnExit: true rejects the cli() Promise on --help', async () => {
			const mocked = mockEnvFunctions();
			let caught: unknown;
			try {
				await cli({
					throwOnExit: true,
				}, () => 'never-runs', ['--help']);
			} catch (error) {
				caught = error;
			}
			mocked.restore();
			expect(caught).toBeInstanceOf(CleyeExit);
			expect((caught as CleyeExit).reason).toBe('help');
		});

		test('non-CleyeExit error from async callback rejects unchanged; no process.exit', async () => {
			const mocked = mockEnvFunctions();
			const customError = new Error('custom failure');

			let caught: unknown;
			try {
				await cli({}, async () => {
					throw customError;
				}, []);
			} catch (error) {
				caught = error;
			}
			mocked.restore();

			expect(caught).toBe(customError);
			expect(mocked.processExit.called).toBe(false);
		});
	}, { parallel: false });

	describe('user-thrown CleyeExit', () => {
		test('inside sync-mode handler propagates to caller (cli already returned)', () => {
			const mocked = mockEnvFunctions();
			const parsed = cli({
				commands: {
					self: () => {
						throw new CleyeExit(7, 'unknown-flag');
					},
				},
			}, undefined, ['self']);

			let caught: unknown;
			try {
				parsed.runCommand();
			} catch (error) {
				caught = error;
			}
			mocked.restore();

			// cli() is no longer wrapping us — handler throws straight to caller.
			expect(caught).toBeInstanceOf(CleyeExit);
			expect((caught as CleyeExit).code).toBe(7);
			expect(mocked.processExit.called).toBe(false);
		});

		test('inside callback-mode auto-invoked handler routes through handleExit', async () => {
			const mocked = mockEnvFunctions();

			await cli({
				commands: {
					self: () => {
						throw new CleyeExit(9, 'unknown-flag');
					},
				},
			}, () => {
				// No-op callback — auto-invokes the matched command, which throws.
			}, ['self']);

			mocked.restore();

			// Default (throwOnExit:false) → IIFE try/catch routes the throw to
			// handleExit which calls process.exit with the user's code.
			expect(mocked.processExit.calls).toStrictEqual([[9]]);
		});
	}, { parallel: false });

	describe('multi-level nested inheritance', () => {
		test('three levels deep: top throwOnExit propagates to grandchild', () => {
			const mocked = mockEnvFunctions();

			let caught: CleyeExit | undefined;
			const parsed = cli({
				throwOnExit: true,
				commands: {
					level1: () => {
						cli({
							commands: {
								level2: () => {
									// Grandchild has no own `throwOnExit`. Should
									// inherit `true` through middle's context.
									try {
										cli({
											flags: { foo: Boolean },
											strictFlags: true,
										}, undefined, ['--unknown']);
									} catch (error) {
										if (error instanceof CleyeExit) {
											caught = error;
										}
										throw error;
									}
								},
							},
						}, undefined, ['level2']).runCommand();
					},
				},
			}, undefined, ['level1']);

			expect(() => parsed.runCommand()).toThrow(CleyeExit);
			mocked.restore();

			expect(caught?.reason).toBe('unknown-flag');
			expect(mocked.processExit.called).toBe(false);
		});
	}, { parallel: false });
}, { parallel: false });
