import { stripVTControlCharacters } from 'node:util';
import { describe, test, expect } from 'manten';
import { cli } from '#cleye';
import { mockEnvFunctions } from '../../utils/mock-env-functions.ts';

describe('two-tier help (-h vs --help)', () => {
	test('-h produces short form (no lead description)', async () => {
		const mocked = mockEnvFunctions();
		cli({
			name: 'my-cli',
			help: { description: 'A helpful tool' },
		}, undefined, ['-h']);
		mocked.restore();

		expect(mocked.processExit.calls).toStrictEqual([[0]]);
		const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0]);
		expect(output).toContain('Usage:');
		expect(output).not.toContain('A helpful tool');
	});

	test('-h produces short form (no examples)', async () => {
		const mocked = mockEnvFunctions();
		cli({
			name: 'my-cli',
			help: { examples: 'my-cli --verbose' },
		}, undefined, ['-h']);
		mocked.restore();

		expect(mocked.processExit.calls).toStrictEqual([[0]]);
		const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0]);
		expect(output).not.toContain('Examples:');
		expect(output).not.toContain('my-cli --verbose');
	});

	test('--help produces long form (includes description)', async () => {
		const mocked = mockEnvFunctions();
		cli({
			name: 'my-cli',
			help: { description: 'A helpful tool' },
		}, undefined, ['--help']);
		mocked.restore();

		expect(mocked.processExit.calls).toStrictEqual([[0]]);
		const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0]);
		expect(output).toContain('A helpful tool');
	});

	test('--help produces long form (includes examples)', async () => {
		const mocked = mockEnvFunctions();
		cli({
			name: 'my-cli',
			help: { examples: 'my-cli --verbose' },
		}, undefined, ['--help']);
		mocked.restore();

		expect(mocked.processExit.calls).toStrictEqual([[0]]);
		const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0]);
		expect(output).toContain('Examples:');
		expect(output).toContain('my-cli --verbose');
	});

	test('--help wins over -h when both passed (long form)', async () => {
		const mocked = mockEnvFunctions();
		cli({
			name: 'my-cli',
			help: {
				description: 'A helpful tool',
				examples: 'my-cli --verbose',
			},
		}, undefined, ['-h', '--help']);
		mocked.restore();

		expect(mocked.processExit.calls).toStrictEqual([[0]]);
		const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0]);
		expect(output).toContain('A helpful tool');
		expect(output).toContain('Examples:');
	});

	test('custom help.render receives form opt', async () => {
		const mocked = mockEnvFunctions();
		let receivedForm: string | undefined;
		cli({
			name: 'my-cli',
			help: {
				render(options, options_) {
					receivedForm = options_.form;
					return '';
				},
			},
		}, undefined, ['-h']);
		mocked.restore();

		expect(receivedForm).toBe('short');
	});

	test('custom help.render receives long form for --help', async () => {
		const mocked = mockEnvFunctions();
		let receivedForm: string | undefined;
		cli({
			name: 'my-cli',
			help: {
				render(options, options_) {
					receivedForm = options_.form;
					return '';
				},
			},
		}, undefined, ['--help']);
		mocked.restore();

		expect(receivedForm).toBe('long');
	});

	test('help.render returning a string is printed verbatim', () => {
		const mocked = mockEnvFunctions();
		cli({
			help: {
				render: () => 'hand-rolled output',
			},
		}, undefined, ['--help']);
		mocked.restore();

		expect(mocked.consoleLog.calls[0]?.[0]).toBe('hand-rolled output');
	});

	test('help.render returning a single atom renders that atom', () => {
		const mocked = mockEnvFunctions();
		cli({
			help: {
				// `p('text')` builds a single paragraph atom — cleye should
				// call its `.render()` and print the result.
				render: () => ({
					kind: 'raw',
					render: () => 'one node',
				}),
			},
		}, undefined, ['--help']);
		mocked.restore();

		expect(mocked.consoleLog.calls[0]?.[0]).toBe('one node');
	});

	test('help.render returning an atom array joins with a blank line', () => {
		const mocked = mockEnvFunctions();
		cli({
			help: {
				render: () => [
					{
						kind: 'raw',
						render: () => 'first',
					},
					{
						kind: 'raw',
						render: () => 'second',
					},
				],
			},
		}, undefined, ['--help']);
		mocked.restore();

		expect(mocked.consoleLog.calls[0]?.[0]).toBe('first\n\nsecond');
	});

	test('showHelp overrides preserve configured help.render', async () => {
		const mocked = mockEnvFunctions();
		let receivedDescription: string | undefined;
		let receivedVersion: string | undefined;

		await cli(
			{
				name: 'my-cli',
				help: {
					description: 'configured description',
					render: (options) => {
						if (typeof options.help === 'object') {
							receivedDescription = options.help.description;
							receivedVersion = options.help.version;
						}
						return 'configured renderer';
					},
				},
			},
			parsed => parsed.showHelp({
				version: '1.2.3',
			}),
			[],
		);
		mocked.restore();

		expect(mocked.consoleLog.calls[0]?.[0]).toBe('configured renderer');
		expect(receivedDescription).toBe('configured description');
		expect(receivedVersion).toBe('1.2.3');
	});

	test('help.render returning an invalid shape throws (fail-fast on misuse)', () => {
		// TypeScript prevents this at compile time; the runtime behavior is
		// to fail loudly rather than silently print empty output. Pin it.
		const mocked = mockEnvFunctions();
		expect(() => cli({
			help: {
				// @ts-expect-error — intentionally wrong return type
				render: () => null,
			},
		}, undefined, ['--help'])).toThrow(TypeError);
		mocked.restore();
	});

	describe('short-form --help hint', () => {
		const shortHelp = (options: Parameters<typeof cli>[0]) => {
			const mocked = mockEnvFunctions();
			cli(options, undefined, ['-h']);
			mocked.restore();
			return stripVTControlCharacters(mocked.consoleLog.calls[0][0]);
		};

		test('hints when the long form has a description', () => {
			expect(shortHelp({
				name: 'my-cli',
				help: { description: 'A helpful tool' },
			})).toContain('Pass --help for more details.');
		});

		test('hints when a command has a description', () => {
			expect(shortHelp({
				name: 'my-cli',
				commands: {
					build: {
						description: 'Build it',
						loader: () => {},
					},
				},
			})).toContain('Pass --help for more details.');
		});

		test('hints when a flag has a default', () => {
			expect(shortHelp({
				name: 'my-cli',
				flags: {
					port: {
						type: Number,
						default: 3000,
					},
				},
			})).toContain('Pass --help for more details.');
		});

		test('omits the hint when the long form shows nothing more', () => {
			expect(shortHelp({
				name: 'my-cli',
				flags: { verbose: Boolean },
			})).not.toContain('for more details');
		});

		test('omits the hint for examples that render to nothing', () => {
			// `['']` joins to '' — the long form shows no Examples section, so
			// the hint must not claim there's more.
			expect(shortHelp({
				name: 'my-cli',
				help: { examples: [''] },
			})).not.toContain('for more details');
		});

		test('long form (--help) never shows the hint', () => {
			const mocked = mockEnvFunctions();
			cli({
				name: 'my-cli',
				help: { description: 'A helpful tool' },
			}, undefined, ['--help']);
			mocked.restore();
			expect(stripVTControlCharacters(mocked.consoleLog.calls[0][0])).not.toContain('for more details');
		});
	}, { parallel: false });
}, { parallel: false });
