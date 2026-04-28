import { describe, test, expect } from 'manten';
import { cli } from '#cleye';
import { mockEnvFunctions } from '../../utils/mock-env-functions.ts';

describe('nested commands', () => {
	test('two levels: npm config get <key>', async () => {
		let result: string | undefined;

		const parsed = cli(
			{
				name: 'npm',
				commands: {
					config: async () => {
						const configParsed = cli(
							{
								name: 'config',
								commands: {
									get: async () => {
										const inner = await cli({
											name: 'get',
											parameters: ['<key>'],
										}, p => p);
										result = inner._.key;
									},
									set: () => {},
									list: () => {},
								},
							},
						);
						await configParsed.runCommand();
					},
				},
			},
			undefined,
			['config', 'get', 'registry'],
		);
		await parsed.runCommand();

		expect(result).toBe('registry');
	});

	test('nested commands inherit options through levels', async () => {
		const mocked = mockEnvFunctions();

		const parsed = cli(
			{
				name: 'root',
				strictFlags: true,
				commands: {
					sub: async () => {
						const subParsed = cli(
							{
								name: 'sub',
								commands: {
									deep: async () => {
										// strictFlags inherited from root → sub → deep
										cli({
											name: 'deep',
											flags: { watch: Boolean },
										}, undefined, ['--wathc']);
									},
								},
							},
						);
						await subParsed.runCommand();
					},
				},
			},
			undefined,
			['sub', 'deep', '--wathc'],
		);
		await parsed.runCommand();
		mocked.restore();

		expect(mocked.consoleError.called).toBe(true);
		expect(mocked.consoleError.calls[0][0]).toContain('--wathc');
	});

	test('nested command gets correct argv at each level', async () => {
		let level1Command: string | undefined;
		let level2Command: string | undefined;
		let level2Flag: boolean | undefined;

		const outerParsed = cli({
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
								}, p => p);
								level2Command = 'add';
								level2Flag = inner.flags.fetch;
							},
						},
					}, p => p);
					level1Command = mid.command;
				},
			},
		}, undefined, ['--verbose', 'remote', 'add', '--fetch', 'origin', 'https://example.com']);

		await outerParsed.runCommand();
		expect(outerParsed.flags.verbose).toBe(true);
		expect(level1Command).toBe('add');
		expect(level2Command).toBe('add');
		expect(level2Flag).toBe(true);
	});

	test('context passes through nested levels via function args', async () => {
		let receivedContext: unknown;

		const parsed = cli(
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
							async ({ runCommand }) => {
								// Pass context from mid-level to deep
								await runCommand({ fromMid: true });
							},
						);
					},
				},
			},
			undefined,
			['sub', 'deep'],
		);
		await parsed.runCommand();

		expect(receivedContext).toStrictEqual({ fromMid: true });
	});
}, { parallel: false });
