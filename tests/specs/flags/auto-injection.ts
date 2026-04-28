import { describe, test, expect } from 'manten';
import { cli } from '#cleye';
import { mockEnvFunctions } from '../../utils/mock-env-functions.ts';

describe('auto-injected flags', () => {
	describe('--version', () => {
		test('not injected when `version` option is absent', async () => {
			const mocked = mockEnvFunctions();
			const parsed = await cli(
				{},
				(p) => {
					expect<{
						version?: undefined;
						help: boolean | undefined;
					}>(p.flags).toEqual({});
					return p;
				},
				['--version'],
			);
			mocked.restore();

			expect<{
				version?: undefined;
				help: boolean | undefined;
			}>(parsed.flags).toEqual({});
			expect(mocked.consoleLog.called).toBe(false);
			expect(mocked.processExit.called).toBe(false);
		});

		test('injected when `version` option is set; --version prints + exits', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					version: '1.0.0',
					flags: {
						flagA: String,
					},
				},
				({ flags }) => {
					expect<boolean | undefined>(flags.version).toBe(true);
				},
				['--version'],
			);
			mocked.restore();

			expect(mocked.consoleLog.called).toBe(true);
			expect(mocked.processExit.calls).toStrictEqual([[0]]);
		});
	}, { parallel: false });

	describe('--help', () => {
		test('not injected when `help: false`', async () => {
			const mocked = mockEnvFunctions();
			const parsed = await cli(
				{
					help: false,
				},
				(p) => {
					expect<{
						help?: undefined;
					}>(p.flags).toEqual({});
					return p;
				},
				['--help'],
			);
			mocked.restore();

			expect<{
				help?: undefined;
			}>(parsed.flags).toEqual({});
			expect(mocked.consoleLog.called).toBe(false);
			expect(mocked.processExit.called).toBe(false);
		});

		test('injected by default; --help prints + exits', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					flags: {
						flagA: String,
					},
				},
				({ flags }) => {
					expect<boolean | undefined>(flags.help).toBe(true);
				},
				['--help'],
			);
			mocked.restore();

			expect(mocked.consoleLog.called).toBe(true);
			expect(mocked.processExit.calls).toStrictEqual([[0]]);
		});
	}, { parallel: false });

	describe('user-defined overrides', () => {
		test('user `help: { type: String }` takes precedence over auto --help', () => {
			const mocked = mockEnvFunctions();
			const parsed = cli({
				flags: {
					help: {
						type: String,
						description: 'A custom help flag that accepts a string',
					},
				},
			}, undefined, ['--help', 'custom-value']);
			mocked.restore();

			expect(mocked.consoleLog.called).toBe(false);
			expect(mocked.processExit.called).toBe(false);

			if (parsed.command === undefined) {
				// TS sees union of built-in (boolean) + override (string).
				expect(parsed.flags.help as string | undefined).toBe('custom-value');
			}
		});

		test('user `version: { type: Number }` takes precedence over auto --version', () => {
			const mocked = mockEnvFunctions();
			const parsed = cli({
				version: '1.0.0',
				flags: {
					version: {
						type: Number,
						description: 'A custom version flag that accepts a number',
					},
				},
			}, undefined, ['--version', '42']);
			mocked.restore();

			expect(mocked.consoleLog.called).toBe(false);
			expect(mocked.processExit.called).toBe(false);

			if (parsed.command === undefined) {
				expect(parsed.flags.version as number | undefined).toBe(42);
			}
		});
	}, { parallel: false });
}, { parallel: false });
