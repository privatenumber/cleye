import { describe, test, expect } from 'manten';
import { cli } from '#cleye';
import { mockEnvFunctions } from '../../utils/mock-env-functions.ts';

describe('strictFlags inheritance', () => {
	test('command inherits strictFlags from parent via context', async () => {
		const mocked = mockEnvFunctions();

		// Parent sets strictFlags: true. Inner cli() inherits it via AsyncLocalStorage.
		// We pass explicit argv to inner cli to avoid the parent catching the unknown flag.
		const parsed = cli(
			{
				strictFlags: true,
				commands: {
					build: async () => {
						cli({
							flags: {
								watch: Boolean,
							},
						}, undefined, ['--wathc']);
					},
				},
			},
			undefined,
			['build'],
		);
		await parsed.runCommand();
		mocked.restore();

		expect(mocked.consoleError.called).toBe(true);
		expect(mocked.consoleError.calls[0][0]).toContain('--wathc');
		expect(mocked.consoleError.calls[0][0]).toContain('--watch');
		expect(mocked.processExit.calls).toStrictEqual([[1]]);
	});

	test('command can override strictFlags to false', async () => {
		const mocked = mockEnvFunctions();

		const parsed = cli(
			{
				strictFlags: true,
				commands: {
					build: async () => {
						cli({
							flags: {
								watch: Boolean,
							},
							strictFlags: false,
						}, undefined, ['--unknown']);
					},
				},
			},
			undefined,
			['build'],
		);
		await parsed.runCommand();
		mocked.restore();

		expect(mocked.consoleError.called).toBe(false);
		expect(mocked.processExit.called).toBe(false);
	});

	test('command can enable strictFlags independently', async () => {
		const mocked = mockEnvFunctions();

		const parsed = cli(
			{
				commands: {
					build: async () => {
						cli({
							flags: {
								watch: Boolean,
							},
							strictFlags: true,
						}, undefined, ['--wathc']);
					},
				},
			},
			undefined,
			['build'],
		);
		await parsed.runCommand();
		mocked.restore();

		expect(mocked.consoleError.called).toBe(true);
		expect(mocked.processExit.calls[0]).toStrictEqual([1]);
	});
}, { parallel: false });

describe('booleanFlagNegation inheritance', () => {
	test('command inherits booleanFlagNegation from parent via context', async () => {
		let watchValue: boolean | undefined;

		const parsed = cli(
			{
				booleanFlagNegation: true,
				commands: {
					build: async () => {
						const innerParsed = cli({
							flags: {
								watch: Boolean,
							},
						}, undefined, ['--no-watch']);
						watchValue = innerParsed.flags.watch;
					},
				},
			},
			undefined,
			['build'],
		);
		await parsed.runCommand();

		expect(watchValue).toBe(false);
	});

	test('command can override booleanFlagNegation to false', async () => {
		let watchValue: boolean | undefined;
		let hasNoWatchUnknown = false;

		const parsed = cli(
			{
				booleanFlagNegation: true,
				commands: {
					build: async () => {
						const innerParsed = cli({
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
			undefined,
			['build'],
		);
		await parsed.runCommand();

		expect(watchValue).toBeUndefined();
		expect(hasNoWatchUnknown).toBe(true);
	});

	test('command can enable booleanFlagNegation independently', async () => {
		let watchValue: boolean | undefined;

		const parsed = cli(
			{
				commands: {
					build: async () => {
						const innerParsed = cli({
							flags: {
								watch: Boolean,
							},
							booleanFlagNegation: true,
						}, undefined, ['--no-watch']);
						watchValue = innerParsed.flags.watch;
					},
				},
			},
			undefined,
			['build'],
		);
		await parsed.runCommand();

		expect(watchValue).toBe(false);
	});
}, { parallel: false });
