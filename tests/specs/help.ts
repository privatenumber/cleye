import { stripVTControlCharacters } from 'node:util';
import { describe, test, expect } from 'manten';
import { mockEnvFunctions } from '../utils/mock-env-functions.ts';
import { cli } from '#cleye';

describe('help', () => {
	describe('show help', () => {
		test('empty cli', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{ name: '' },
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('name', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: 'npm',
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['npm\n\n\u001B[1m\u001B[32mUsage:\u001B[39m\u001B[22m \u001B[1m\u001B[36mnpm\u001B[39m\u001B[22m \u001B[36m[flags...]\u001B[39m\n\n\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('empty parameters', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: '',
					parameters: [],
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('parameters with no name', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: '',
					parameters: ['<arg-a>', '[arg-b]'],
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('parameters with name', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: 'my-cli',
					parameters: ['<arg-a>', '[arg-b]'],
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\n\u001B[1m\u001B[32mUsage:\u001B[39m\u001B[22m \u001B[1m\u001B[36mmy-cli\u001B[39m\u001B[22m \u001B[36m[flags...]\u001B[39m \u001B[36m<arg-a>\u001B[39m \u001B[36m[arg-b]\u001B[39m\n\n\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('parameters with optional --', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: 'my-cli',
					parameters: ['<arg-a>', '[arg-b]', '--', '[arg-c]'],
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\n\u001B[1m\u001B[32mUsage:\u001B[39m\u001B[22m \u001B[1m\u001B[36mmy-cli\u001B[39m\u001B[22m \u001B[36m[flags...]\u001B[39m \u001B[36m<arg-a>\u001B[39m \u001B[36m[arg-b]\u001B[39m \u001B[36m[--]\u001B[39m \u001B[36m[arg-c]\u001B[39m\n\n\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('parameters with required --', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: 'my-cli',
					parameters: ['<arg-a>', '[arg-b]', '--', '<arg-c>'],
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\n\u001B[1m\u001B[32mUsage:\u001B[39m\u001B[22m \u001B[1m\u001B[36mmy-cli\u001B[39m\u001B[22m \u001B[36m[flags...]\u001B[39m \u001B[36m<arg-a>\u001B[39m \u001B[36m[arg-b]\u001B[39m \u001B[36m--\u001B[39m \u001B[36m<arg-c>\u001B[39m\n\n\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('empty commands', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: '',
					commands: {},
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('commands', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: 'my-cli',
					commands: {
						test: () => {},
					},
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\n\u001B[1m\u001B[32mUsage:\u001B[39m\u001B[22m\nmy-cli [flags...]\nmy-cli <command>\n\n\u001B[1m\u001B[32mCommands:\u001B[39m\u001B[22m\n  \u001B[36mtest\u001B[39m\n\n\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('commands with description', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: 'my-cli',
					commands: {
						test: {
							description: 'test command',
							loader: () => {},
						},
					},
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\n\u001B[1m\u001B[32mUsage:\u001B[39m\u001B[22m\nmy-cli [flags...]\nmy-cli <command>\n\n\u001B[1m\u001B[32mCommands:\u001B[39m\u001B[22m\n  \u001B[36mtest\u001B[39m  test command\n\n\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('commands without description', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: 'my-cli',
					commands: {
						test: {
							loader: () => {},
						},
					},
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\n\u001B[1m\u001B[32mUsage:\u001B[39m\u001B[22m\nmy-cli [flags...]\nmy-cli <command>\n\n\u001B[1m\u001B[32mCommands:\u001B[39m\u001B[22m\n  \u001B[36mtest\u001B[39m\n\n\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('undefined flags', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: '',
					flags: undefined,
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('empty flags', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: '',
					flags: {},
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('flags', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: '',
					flags: {
						flag: Boolean,
						flagA: String,
						flagB: {
							type: Number,
						},
						flagC: {
							type: RegExp,
							default: /hello/,
						},
					},
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n      \u001B[1m\u001B[36m--flag\u001B[39m\u001B[22m             \n      \u001B[1m\u001B[36m--flag-a\u001B[39m\u001B[22m \u001B[36m<string>\u001B[39m  \n      \u001B[1m\u001B[36m--flag-b\u001B[39m\u001B[22m \u001B[36m<number>\u001B[39m  \n      \u001B[1m\u001B[36m--flag-c\u001B[39m\u001B[22m \u001B[36m<value>\u001B[39m   (default: {})\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m              Show help']]);
		});

		test('help disabled', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					help: false,
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.called).toBe(false);
		});

		test('help disabled but shown', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: 'my-cli',
					help: false,
				},
				(parsed) => {
					parsed.showHelp({
						version: '1.2.3',
					});
				},
				['--help'],
			);
			mocked.restore();

			expect(mocked.consoleLog.calls).toStrictEqual([['my-cli v1.2.3\n\n\u001B[1m\u001B[32mUsage:\u001B[39m\u001B[22m \u001B[1m\u001B[36mmy-cli\u001B[39m\u001B[22m \u001B[36m[flags...]\u001B[39m\n\n\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('empty help.examples', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: '',
					help: {
						examples: [],
					},
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('help.version with --help', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: '',
					help: {
						version: '1.0.0',
					},
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.consoleLog.calls).toStrictEqual([['v1.0.0\n\n\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('help.version with --version', async () => {
			const mocked = mockEnvFunctions();
			const parsed = await cli(
				{
					help: {
						version: '1.0.0',
					},
				},
				undefined,
				['--version'],
			);
			mocked.restore();

			expect(mocked.processExit.called).toBe(false);
			expect(parsed.unknownFlags).toStrictEqual({
				version: [true],
			});
		});

		test('help.usage string', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: '',
					help: {
						usage: 'usage string',
					},
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1m\u001B[32mUsage:\u001B[39m\u001B[22m\nusage string\n\n\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('help.usage array', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: '',
					help: {
						usage: [
							'usage string a',
							'usage string b',
							'usage string c',
						],
					},
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1m\u001B[32mUsage:\u001B[39m\u001B[22m\nusage string a\nusage string b\nusage string c\n\n\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});

		test('help.usage false disables usage section', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: 'my-cli',
					help: {
						usage: false,
					},
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			// Should only have name and flags, no Usage section
			const output = mocked.consoleLog.calls[0][0];
			expect(output).toContain('my-cli');
			expect(output).not.toContain('Usage:');
			expect(output).toContain('Flags:');
		});

		test('help.description', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: '',
					help: {
						description: 'test description',
					},
				},
				undefined,
				['--help'],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['test description\n\n\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m  Show help']]);
		});
	});

	describe('invalid usage', () => {
		test('missing required parameter', async () => {
			const mocked = mockEnvFunctions();
			await cli(
				{
					name: 'my-cli',
					parameters: ['<value-a>'],
				},
				undefined,
				[],
			);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[1]]);
			expect(mocked.consoleError.calls).toStrictEqual([['Error: Missing required parameter "value-a"\n']]);
		});
	});

	test('show version', async () => {
		const mocked = mockEnvFunctions();
		await cli(
			{
				version: '1.0.0',
			},
			undefined,
			['--version'],
		);
		mocked.restore();

		expect(mocked.processExit.calls).toStrictEqual([[0]]);
		expect(mocked.consoleLog.calls).toStrictEqual([['1.0.0']]);
	});

	test('smoke test', async () => {
		const mocked = mockEnvFunctions();
		process.stdout.columns = Number.POSITIVE_INFINITY;
		await cli({
			name: 'my-cli',

			version: '1.1.1',

			commands: {
				'my-command': {
					description: 'my command description',
					loader: () => {},
				},
			},

			parameters: ['<urls...>'],

			flags: {
				outputDir: {
					type: String,
					alias: 'o',
					description: 'Tweet screenshot output directory',
					placeholder: '<path>',
				},
				width: {
					type: Number,
					alias: 'w',
					description: 'Width of tweet',
					default: 550,
					placeholder: '<width>',
				},
				showTweet: {
					type: Boolean,
					alias: 't',
					description: 'Show tweet thread',
				},
				darkMode: {
					type: Boolean,
					alias: 'd',
					description: 'Show tweet in dark mode',
				},
				locale: {
					type: String,
					description: 'Locale',
					default: 'en',
					placeholder: '<locale>',
				},
			},

			help: {
				examples: [
					'# Snapshot a tweet',
					'snap-tweet https://twitter.com/jack/status/20',
					'',
					'# Snapshot a tweet with Japanese locale',
					'snap-tweet https://twitter.com/TwitterJP/status/578707432 --locale ja',
					'',
					'# Snapshot a tweet with dark mode and 900px width',
					'snap-tweet https://twitter.com/Interior/status/463440424141459456 --width 900 --dark-mode',
				],
			},
		}, undefined, ['--help']);
		process.stdout.columns = Number.POSITIVE_INFINITY;
		mocked.restore();

		expect(mocked.processExit.calls).toStrictEqual([[0]]);
		expect(mocked.consoleLog.calls).toStrictEqual([['my-cli v1.1.1\n\n\u001B[1m\u001B[32mUsage:\u001B[39m\u001B[22m\nmy-cli [flags...] <urls...>\nmy-cli <command>\n\n\u001B[1m\u001B[32mCommands:\u001B[39m\u001B[22m\n  \u001B[36mmy-command\u001B[39m  my command description\n\n\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m\n  \u001B[1m\u001B[36m-d\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--dark-mode\u001B[39m\u001B[22m          Show tweet in dark mode\n  \u001B[1m\u001B[36m-h\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--help\u001B[39m\u001B[22m               Show help\n      \u001B[1m\u001B[36m--locale\u001B[39m\u001B[22m \u001B[36m<locale>\u001B[39m   Locale (default: "en")\n  \u001B[1m\u001B[36m-o\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--output-dir\u001B[39m\u001B[22m \u001B[36m<path>\u001B[39m  Tweet screenshot output directory\n  \u001B[1m\u001B[36m-t\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--show-tweet\u001B[39m\u001B[22m         Show tweet thread\n      \u001B[1m\u001B[36m--version\u001B[39m\u001B[22m           Show version\n  \u001B[1m\u001B[36m-w\u001B[39m\u001B[22m, \u001B[1m\u001B[36m--width\u001B[39m\u001B[22m \u001B[36m<width>\u001B[39m      Width of tweet (default: 550)\n\n\u001B[1m\u001B[32mExamples:\u001B[39m\u001B[22m\n# Snapshot a tweet\nsnap-tweet https://twitter.com/jack/status/20\n\n# Snapshot a tweet with Japanese locale\nsnap-tweet https://twitter.com/TwitterJP/status/578707432 --locale ja\n\n# Snapshot a tweet with dark mode and 900px width\nsnap-tweet https://twitter.com/Interior/status/463440424141459456 --width 900 --dark-mode']]);
	});

	test('acronyms in flag names render as single words (issue #38)', async () => {
		const mocked = mockEnvFunctions();
		await cli(
			{
				flags: {
					orgID: {
						type: String,
						description: 'Organization ID',
					},
					apiURL: {
						type: String,
						description: 'API endpoint',
					},
				},
			},
			undefined,
			['--help'],
		);
		mocked.restore();

		const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0]);
		expect(output).toContain('--org-id');
		expect(output).toContain('--api-url');
		expect(output).not.toContain('--org-i-d');
		expect(output).not.toContain('--api-u-r-l');
	});
}, { parallel: false });
