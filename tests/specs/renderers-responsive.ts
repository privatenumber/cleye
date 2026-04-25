import { stripVTControlCharacters } from 'node:util';
import { describe, test, expect } from 'manten';
import { mockEnvFunctions } from '../utils/mock-env-functions.ts';
import { cli } from '#cleye';
import { createRenderer } from '#cleye/renderers/responsive';

describe('renderers/responsive', () => {
	const testFlags = {
		flagA: {
			type: String,
			description: 'A long description for flag-a to test wrapping behavior.',
			alias: 'a',
		},
		flagB: {
			type: Number,
			description: 'A long description for flag-b to test wrapping behavior.',
			alias: 'b',
		},
	};

	test('normal width: flag and description on same line', async () => {
		const mocked = mockEnvFunctions();
		process.stdout.columns = Number.POSITIVE_INFINITY;

		await cli(
			{
				flags: testFlags,
				help: {
					render: createRenderer(),
				},
			},
			undefined,
			['--help'],
		);

		process.stdout.columns = Number.POSITIVE_INFINITY;
		mocked.restore();

		const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0]);
		// At infinite width, flag + description live on the same line.
		const flagALine = output
			.split('\n')
			.find(line => line.includes('-a, --flag-a'));
		expect(flagALine).toContain('A long description for flag-a');
	});

	test('narrow width: descriptions wrap to their own line', async () => {
		const mocked = mockEnvFunctions();
		process.stdout.columns = 60;

		await cli(
			{
				flags: testFlags,
				help: {
					render: createRenderer(),
				},
			},
			undefined,
			['--help'],
		);

		process.stdout.columns = Number.POSITIVE_INFINITY;
		mocked.restore();

		const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0]);
		// At breakpoint `> 40`, the description moves to its own line below
		// the flag definition — so the flag-a line should NOT contain its
		// description anymore.
		const flagALine = output
			.split('\n')
			.find(line => line.includes('-a, --flag-a'));
		expect(flagALine).not.toContain('A long description for flag-a');
		// ...but the description still appears somewhere in the output.
		expect(output).toContain('A long description for flag-a');
	});

	test('createRenderer() does not mutate the shared default renderers', async () => {
		const mocked = mockEnvFunctions();
		process.stdout.columns = Number.POSITIVE_INFINITY;

		// First call: uses responsive renderer
		await cli(
			{
				flags: testFlags,
				help: {
					render: createRenderer(),
				},
			},
			undefined,
			['--help'],
		);

		// Second call: no custom renderer — default atom renderer is used.
		// At wide width (Infinity), the atom renderer uses inline layout.
		const mockedSecond = mockEnvFunctions();
		process.stdout.columns = Number.POSITIVE_INFINITY;
		await cli({
			name: 'test-cli',
			flags: testFlags,
		}, undefined, ['--help']);
		const secondOutput = stripVTControlCharacters(mockedSecond.consoleLog.calls[0][0]);
		mockedSecond.restore();
		mocked.restore();

		// The description appears on the same line as the flag name (inline layout).
		// This confirms the default Renderers state was not mutated by createRenderer().
		const flagALine = secondOutput
			.split('\n')
			.find(line => line.includes('-a, --flag-a'));
		expect(flagALine).toContain('A long description for flag-a');
	});

	test('createRenderer() accepts custom breakpoints override', async () => {
		const mocked = mockEnvFunctions();
		process.stdout.columns = 60;

		await cli(
			{
				flags: testFlags,
				help: {
					render: createRenderer({
						breakpoints: {
							// Override: force a fixed 1000-column layout so
							// terminal-columns never wraps regardless of the
							// actual terminal width.
							'> 0': {
								stdoutColumns: 1000,
								columns: [
									{
										width: 'content-width',
										paddingLeft: 2,
										paddingRight: 8,
									},
									{ width: 'content-width' },
								],
							},
						},
					}),
				},
			},
			undefined,
			['--help'],
		);

		process.stdout.columns = Number.POSITIVE_INFINITY;
		mocked.restore();

		const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0]);
		// With the override, flag and description stay on the same line even
		// though the actual terminal is only 60 cols wide.
		const flagALine = output
			.split('\n')
			.find(line => line.includes('-a, --flag-a'));
		expect(flagALine).toContain('A long description for flag-a');
	});
});
