import { describe, test, expect } from 'manten';
import { cli } from '#cleye';
import { mockEnvFunctions } from '../../utils/mock-env-functions.ts';

describe('booleanFlagNegation', () => {
	test('--no-flag sets a boolean flag to false', () => {
		const parsed = cli({
			flags: {
				verbose: Boolean,
			},
			booleanFlagNegation: true,
		}, undefined, ['--no-verbose']);

		expect(parsed.flags.verbose).toBe(false);
	});

	test('last-wins between --flag and --no-flag', () => {
		const parsed = cli({
			flags: {
				verbose: Boolean,
			},
			booleanFlagNegation: true,
		}, undefined, ['--verbose', '--no-verbose']);

		expect(parsed.flags.verbose).toBe(false);

		const parsed2 = cli({
			flags: {
				verbose: Boolean,
			},
			booleanFlagNegation: true,
		}, undefined, ['--no-verbose', '--verbose']);

		expect(parsed2.flags.verbose).toBe(true);
	});

	test('does not apply to non-boolean flags', () => {
		const parsed = cli({
			flags: {
				output: String,
			},
			booleanFlagNegation: true,
		}, undefined, ['--no-output']);

		expect(parsed.flags.output).toBeUndefined();
		expect(parsed.unknownFlags).toHaveProperty('no-output');
	});

	test('disabled by default', () => {
		const parsed = cli({
			flags: {
				verbose: Boolean,
			},
		}, undefined, ['--no-verbose']);

		expect(parsed.flags.verbose).toBeUndefined();
		expect(parsed.unknownFlags).toHaveProperty('no-verbose');
	});

	test('works with strictFlags without erroring on --no-<flag>', () => {
		const mocked = mockEnvFunctions();
		const parsed = cli({
			flags: {
				verbose: Boolean,
			},
			booleanFlagNegation: true,
			strictFlags: true,
		}, undefined, ['--no-verbose']);
		mocked.restore();

		expect(parsed.flags.verbose).toBe(false);
		expect(mocked.consoleError.called).toBe(false);
		expect(mocked.processExit.called).toBe(false);
	});
}, { parallel: false });
