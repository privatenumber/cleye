import { describe, test, expect } from 'manten';
import { cli } from '#cleye';
import { mockEnvFunctions } from '../../utils/mock-env-functions.ts';

describe('unknown flags', () => {
	describe('default behavior — capture without error', () => {
		test('unknown flag captured into parsed.unknownFlags', () => {
			const parsed = cli({
				flags: {
					known: String,
				},
			}, undefined, ['--unknown', '--known', 'value']);

			expect(parsed.unknownFlags.unknown).toEqual([true]);
			expect(parsed.flags.known).toBe('value');
		});

		test('multiple unknown flags', () => {
			const parsed = cli({}, undefined, ['--unknown1', '--unknown2', 'value']);

			expect(parsed.unknownFlags.unknown1).toEqual([true]);
			expect(parsed.unknownFlags.unknown2).toEqual([true]);
		});

		test('strictFlags disabled by default', () => {
			const mocked = mockEnvFunctions();
			const parsed = cli({
				flags: {
					verbose: Boolean,
				},
			}, undefined, ['--unknown']);
			mocked.restore();

			expect(mocked.consoleError.called).toBe(false);
			expect(mocked.processExit.called).toBe(false);
			expect(parsed.unknownFlags.unknown).toEqual([true]);
		});
	}, { parallel: false });

	describe('strictFlags', () => {
		test('errors on unknown flag', () => {
			const mocked = mockEnvFunctions();
			cli({
				flags: {
					verbose: Boolean,
				},
				strictFlags: true,
			}, undefined, ['--unknown']);
			mocked.restore();

			expect(mocked.consoleError.called).toBe(true);
			expect(mocked.consoleError.calls[0][0]).toContain('Unknown flag');
			expect(mocked.consoleError.calls[0][0]).toContain('--unknown');
			expect(mocked.processExit.calls).toStrictEqual([[1]]);
		});

		test('suggests closest match within distance 2', () => {
			const mocked = mockEnvFunctions();
			cli(
				{
					flags: {
						verbose: Boolean,
					},
					strictFlags: true,
				},
				undefined,
				['--verbos'],
			);
			mocked.restore();

			expect(mocked.consoleError.calls[0][0]).toContain('--verbose');
			expect(mocked.consoleError.calls[0][0]).toMatch(/did you mean/i);
		});

		test('no suggestion when flag is too different', () => {
			const mocked = mockEnvFunctions();
			cli({
				flags: {
					verbose: Boolean,
				},
				strictFlags: true,
			}, undefined, ['--xyz']);
			mocked.restore();

			expect(mocked.consoleError.calls[0][0]).not.toMatch(/did you mean/i);
		});

		test('no suggestion for very short unknown flags (length < 3)', () => {
			const mocked = mockEnvFunctions();
			cli(
				{
					flags: {
						ab: Boolean,
						ac: Boolean,
					},
					strictFlags: true,
				},
				undefined,
				['--ad'],
			);
			mocked.restore();

			expect(mocked.consoleError.called).toBe(true);
			expect(mocked.consoleError.calls[0][0]).toContain('--ad');
			expect(mocked.consoleError.calls[0][0]).not.toMatch(/did you mean/i);
		});

		test('reports each unknown flag separately', () => {
			const mocked = mockEnvFunctions();
			cli({
				flags: {
					verbose: Boolean,
					output: String,
				},
				strictFlags: true,
			}, undefined, ['--verbos', '--outpu']);
			mocked.restore();

			expect(mocked.consoleError.callCount).toBe(2);
			expect(mocked.consoleError.calls[0][0]).toContain('--verbos');
			expect(mocked.consoleError.calls[1][0]).toContain('--outpu');
		});

		test('known flags still work alongside strictFlags', () => {
			const mocked = mockEnvFunctions();
			const parsed = cli({
				flags: {
					verbose: Boolean,
					output: String,
				},
				strictFlags: true,
			}, undefined, ['--verbose', '--output', 'file.txt']);
			mocked.restore();

			expect(mocked.consoleError.called).toBe(false);
			expect(mocked.processExit.called).toBe(false);
			expect(parsed.flags.verbose).toBe(true);
			expect(parsed.flags.output).toBe('file.txt');
		});

		test('alias-aware suggestion: suggests known alias for typo', () => {
			const mocked = mockEnvFunctions();
			cli({
				flags: {
					verbose: {
						type: Boolean,
						alias: 'v',
					},
				},
				strictFlags: true,
			}, undefined, ['--verbos']);
			mocked.restore();

			expect(mocked.consoleError.calls[0][0]).toContain('--verbose');
		});

		test('alias suggestion surfaces the canonical name', () => {
			const mocked = mockEnvFunctions();
			cli({
				flags: {
					verbose: {
						type: Boolean,
						alias: 'v',
					},
				},
				strictFlags: true,
				// `--avx` is at distance 2 from alias `v`; far from `verbose`.
			}, undefined, ['--avx']);
			mocked.restore();

			expect(mocked.consoleError.calls[0][0]).toBe(
				'Error: Unknown flag: --avx. (Did you mean -v (alias for --verbose)?)',
			);
		});
	}, { parallel: false });
}, { parallel: false });
