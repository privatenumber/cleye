import { stripVTControlCharacters } from 'node:util';
import { testSuite, expect } from 'manten';
import { underline } from 'kolorist';
import { mockEnvFunctions } from '../utils/mock-env-functions';
import { Renderers } from '../../src/render-help/renderers.js';
import { cli, command } from '#cleye';

export default testSuite(({ describe }) => {
	describe('help', ({ describe, test }) => {
		describe('show help', ({ test }) => {
			test('empty cli', () => {
				const mocked = mockEnvFunctions();
				cli(
					{},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('name', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						name: 'npm',
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['npm\n\n\u001B[1mUsage:\u001B[22m\n  npm [flags...]\n\n\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('empty parameters', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						parameters: [],
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('parameters with no name', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						parameters: ['<arg-a>', '[arg-b]'],
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('parameters with name', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						name: 'my-cli',
						parameters: ['<arg-a>', '[arg-b]'],
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\n\u001B[1mUsage:\u001B[22m\n  my-cli [flags...] <arg-a> [arg-b]\n\n\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('parameters with optional --', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						name: 'my-cli',
						parameters: ['<arg-a>', '[arg-b]', '--', '[arg-c]'],
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\n\u001B[1mUsage:\u001B[22m\n  my-cli [flags...] <arg-a> [arg-b] [--] [arg-c]\n\n\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('parameters with required --', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						name: 'my-cli',
						parameters: ['<arg-a>', '[arg-b]', '--', '<arg-c>'],
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\n\u001B[1mUsage:\u001B[22m\n  my-cli [flags...] <arg-a> [arg-b] -- <arg-c>\n\n\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('empty commands', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						commands: [],
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('commands', () => {
				const mocked = mockEnvFunctions();
				const testCommand = command({
					name: 'test',
				});

				cli(
					{
						name: 'my-cli',
						commands: [
							testCommand,
						],
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\n\u001B[1mUsage:\u001B[22m\n  my-cli [flags...]\n  my-cli <command>\n\n\u001B[1mCommands:\u001B[22m\n  test        \n\n\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('commands with description', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						name: 'my-cli',
						commands: [
							command({
								name: 'test',
								help: {
									description: 'test command',
								},
							}),
						],
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\n\u001B[1mUsage:\u001B[22m\n  my-cli [flags...]\n  my-cli <command>\n\n\u001B[1mCommands:\u001B[22m\n  test        test command\n\n\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('commands with help but no description', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						name: 'my-cli',
						commands: [
							command({
								name: 'test',
								help: {
									usage: 'custom usage',
								},
							}),
						],
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\n\u001B[1mUsage:\u001B[22m\n  my-cli [flags...]\n  my-cli <command>\n\n\u001B[1mCommands:\u001B[22m\n  test        \n\n\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('undefined flags', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						flags: undefined,
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('empty flags', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						flags: {},
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('flags', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
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
				expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1mFlags:\u001B[22m\n      --flag                   \n      --flag-a <string>        \n      --flag-b <number>        \n      --flag-c <value>          (default: {})\n  -h, --help                   Show help\n']]);
			});

			test('help disabled', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						help: false,
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.called).toBe(false);
			});

			test('help disabled but shown', () => {
				const mocked = mockEnvFunctions();
				const argv = cli(
					{
						name: 'my-cli',
						help: false,
					},
					undefined,
					['--help'],
				);

				argv.showHelp({
					version: '1.2.3',
				});
				mocked.restore();

				expect(mocked.consoleLog.calls).toStrictEqual([['my-cli v1.2.3\n']]);
			});

			test('empty help.examples', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						help: {
							examples: [],
						},
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('help.version with --help', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						help: {
							version: '1.0.0',
						},
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.consoleLog.calls).toStrictEqual([['v1.0.0\n\n\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('help.version with --version', () => {
				const mocked = mockEnvFunctions();
				const parsed = cli(
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

			test('help.usage string', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						help: {
							usage: 'usage string',
						},
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1mUsage:\u001B[22m\n  usage string\n\n\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('help.usage array', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
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
				expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1mUsage:\u001B[22m\n  usage string a\n  usage string b\n  usage string c\n\n\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('help.usage false disables usage section', () => {
				const mocked = mockEnvFunctions();
				cli(
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

			test('help.description', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						help: {
							description: 'test description',
						},
					},
					undefined,
					['--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['test description\n\n\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('command help', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						name: 'my-cli',
						commands: [
							command({
								name: 'test',
								parameters: ['<arg a>', '<arg b>'],
								help: {
									description: 'test command',
								},
							}),
						],
					},
					undefined,
					['test', '--help'],
				);
				mocked.restore();

				expect(mocked.processExit.calls).toStrictEqual([[0]]);
				expect(mocked.consoleLog.calls).toStrictEqual([['my-cli test\n\ntest command\n\n\u001B[1mUsage:\u001B[22m\n  my-cli test [flags...] <arg a> <arg b>\n\n\u001B[1mFlags:\u001B[22m\n  -h, --help        Show help\n']]);
			});

			test('command help disabled', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						name: 'my-cli',
						commands: [
							command({
								name: 'test',
								help: false,
							}),
						],
					},
					undefined,
					['test', '--help'],
				);
				mocked.restore();

				expect(mocked.processExit.called).toBe(false);
			});
		});

		describe('responsive help', ({ test }) => {
			const testFlags = {
				flagA: {
					type: String,
					description: 'A long description for flag-a to test wrapping behavior and responsive rendering logic.',
					alias: 'a',
				},
				flagB: {
					type: Number,
					description: 'A long description for flag-b to test wrapping behavior and responsive rendering logic.',
					alias: 'b',
				},
			};

			test('normal width (default)', () => {
				const mocked = mockEnvFunctions();
				const originalColumns = process.stdout.columns;
				process.stdout.columns = Number.POSITIVE_INFINITY;

				cli({ flags: testFlags }, undefined, ['--help']);

				process.stdout.columns = originalColumns;
				mocked.restore();

				const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0]);
				// At infinite width, flags and descriptions should be on same line
				expect(output).toContain('-a, --flag-a <string>');
				expect(output).toContain('-b, --flag-b <number>');
			});

			test('narrow width (breakpoint > 40)', () => {
				const mocked = mockEnvFunctions();
				const originalColumns = process.stdout.columns;
				process.stdout.columns = 60;

				cli({ flags: testFlags }, undefined, ['--help']);

				process.stdout.columns = originalColumns;
				mocked.restore();

				const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0]);
				// At medium width, descriptions should be on separate line (word-wrapped)
				// Remove padding dots for easier assertion
				const cleanOutput = output.replaceAll('·', '');
				expect(cleanOutput).toContain('-a, --flag-a <string>');
				expect(cleanOutput).toContain('A long description for flag-a');
				expect(cleanOutput).toContain('-b, --flag-b <number>');
				expect(cleanOutput).toContain('A long description for flag-b');
			});

			test('very narrow width (breakpoint > 0)', () => {
				const mocked = mockEnvFunctions();
				const originalColumns = process.stdout.columns;
				process.stdout.columns = 30;

				cli({ flags: testFlags }, undefined, ['--help']);

				process.stdout.columns = originalColumns;
				mocked.restore();

				const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0]);
				// The '> 0' breakpoint sets columns to 1000, effectively disabling wrapping
				expect(output).toContain('-a, --flag-a <string>');
				expect(output).toContain('-b, --flag-b <number>');
			});
		});

		describe('invalid usage', ({ test }) => {
			test('missing required parameter', () => {
				const mocked = mockEnvFunctions();
				cli(
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

		test('show version', () => {
			const mocked = mockEnvFunctions();
			cli(
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

		test('smoke test', () => {
			const mocked = mockEnvFunctions();
			cli({
				name: 'my-cli',

				version: '1.1.1',

				commands: [
					command({
						name: 'my-command',
						help: {
							description: 'my command description',
						},
					}),
				],

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
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['my-cli v1.1.1\n\n\u001B[1mUsage:\u001B[22m\n  my-cli [flags...] <urls...>\n  my-cli <command>\n\n\u001B[1mCommands:\u001B[22m\n  my-command        my command description\n\n\u001B[1mFlags:\u001B[22m\n  -d, --dark-mode                Show tweet in dark mode\n  -h, --help                     Show help\n      --locale <locale>          Locale (default: "en")\n  -o, --output-dir <path>        Tweet screenshot output directory\n  -t, --show-tweet               Show tweet thread\n      --version                  Show version\n  -w, --width <width>            Width of tweet (default: 550)\n\n\u001B[1mExamples:\u001B[22m\n  # Snapshot a tweet\n  snap-tweet https://twitter.com/jack/status/20\n  \n  # Snapshot a tweet with Japanese locale\n  snap-tweet https://twitter.com/TwitterJP/status/578707432 --locale ja\n  \n  # Snapshot a tweet with dark mode and 900px width\n  snap-tweet https://twitter.com/Interior/status/463440424141459456 --width 900 --dark-mode\n']]);
		});

		test('help customization', () => {
			const simpleFlags = {
				bundle: {
					type: Boolean,
					description: 'Bundle all dependencies into the output files',
				},
				define: {
					type: String,
					description: 'Substitute K with V while parsing',
				},
			};

			const advancedFlags = {
				allowOverwrite: {
					type: Boolean,
					description: 'Allow output files to overwrite input files',
				},
				assetNames: {
					type: Boolean,
					description: 'Path template to use for "file" loader files (default "[name]-[hash]")',
				},
			};

			const mocked = mockEnvFunctions();
			cli({
				name: 'esbuild',

				version: '1.0.0',

				parameters: ['[entry points]'],

				flags: {
					...simpleFlags,
					...advancedFlags,

					// Overwrite to remove alias
					help: Boolean,
				},

				help: {
					examples: [
						'# Produces dist/entry_point.js and dist/entry_point.js.map',
						'esbuild --bundle entry_point.js --outdir=dist --minify --sourcemap',
					],

					render(nodes, renderers) {
						// Remove name
						nodes.splice(0, 1);

						// Replace "flags" with "options" in Usage
						nodes[0].data.body = nodes[0].data.body.replace('flags', 'options');

						// Add Documentation & Repository
						nodes.splice(1, 0, {
							type: 'section',
							data: {
								title: 'Documentation:',
								body: underline('https://esbuild.github.io/'),
							},
						});

						// Split Flags into "Simple options" and "Advanced options"
						const flags = nodes[2].data.body.data;
						nodes.splice(2, 1, {
							type: 'section',
							data: {
								title: 'Simple options:',
								body: {
									type: 'table',
									data: {
										...flags,
										tableData: flags.tableData.filter(
											([flagName]: [{ data: { name: string } }]) => (
												flagName.data.name in simpleFlags
											),
										),
									},
								},
								indentBody: 0,
							},
						}, {
							type: 'section',
							data: {
								title: 'Advanced options:',
								body: {
									type: 'table',
									data: {
										...flags,
										tableData: flags.tableData.filter(
											([flagName]: [{ data: { name: string } }]) => (
												flagName.data.name in advancedFlags
											),
										),
									},
								},
								indentBody: 0,
							},
						});

						// Update renderer so flags that accept a value shows `=...`
						renderers.flagOperator = () => '=';
						renderers.flagParameter = flagType => (flagType === Boolean ? '' : '...');

						const extendedRenderer = Object.assign(renderers, {
							someRenderer(value: number) {
								return `Received value: ${value}`;
							},
						});

						return extendedRenderer.render([
							...nodes,
							{
								type: 'someRenderer',
								data: 123,
							},
						]);
					},
				},
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(mocked.consoleLog.calls).toStrictEqual([['\u001B[1mUsage:\u001B[22m\n  esbuild [options...] [entry points]\n\n\u001B[1mDocumentation:\u001B[22m\n  \u001B[4mhttps://esbuild.github.io/\u001B[24m\n\n\u001B[1mSimple options:\u001B[22m\n  --bundle            Bundle all dependencies into the output files\n  --define=...        Substitute K with V while parsing\n\n\u001B[1mAdvanced options:\u001B[22m\n  --allow-overwrite        Allow output files to overwrite input files\n  --asset-names            Path template to use for "file" loader files (default "[name]-[hash]")\n\n\u001B[1mExamples:\u001B[22m\n  # Produces dist/entry_point.js and dist/entry_point.js.map\n  esbuild --bundle entry_point.js --outdir=dist --minify --sourcemap\n\nReceived value: 123']]);
		});

		describe('Renderers', ({ test }) => {
			test('render throws on invalid node type', () => {
				const renderers = new Renderers();
				expect(() => {
					renderers.render({
						type: 'nonExistentRenderer',
						data: 'test',
					} as any);
				}).toThrow('Invalid node type');
			});

			test('render with string returns string', () => {
				const renderers = new Renderers();
				expect(renderers.render('hello')).toBe('hello');
			});

			test('render with array joins with newlines', () => {
				const renderers = new Renderers();
				expect(renderers.render(['a', 'b', 'c'])).toBe('a\nb\nc');
			});

			test('text renderer returns string as-is', () => {
				const renderers = new Renderers();
				expect(renderers.render({
					type: 'text',
					data: 'hello world',
				})).toBe('hello world');
			});

			test('indentText with multi-line text', () => {
				const renderers = new Renderers();
				const result = renderers.indentText({
					text: 'line1\nline2\nline3',
					spaces: 2,
				});
				expect(result).toBe('  line1\n  line2\n  line3');
			});

			test('section with only title', () => {
				const renderers = new Renderers();
				const result = renderers.section({
					title: 'Title:',
				});
				// When colors are enabled, title is bolded with ANSI codes
				// When colors are disabled, title is uppercased
				expect(stripVTControlCharacters(result)).toBe('Title:\n\n');
			});

			test('section with only body', () => {
				const renderers = new Renderers();
				const result = renderers.section({
					body: 'body content',
				});
				expect(result).toBe('  body content\n');
			});

			test('flagParameter with Boolean type', () => {
				const renderers = new Renderers();
				expect(renderers.flagParameter(Boolean)).toBe('');
			});

			test('flagParameter with String type', () => {
				const renderers = new Renderers();
				expect(renderers.flagParameter(String)).toBe('<string>');
			});

			test('flagParameter with Number type', () => {
				const renderers = new Renderers();
				expect(renderers.flagParameter(Number)).toBe('<number>');
			});

			test('flagParameter with custom type', () => {
				const CustomType = (value: string) => value.toUpperCase();
				const renderers = new Renderers();
				expect(renderers.flagParameter(CustomType)).toBe('<value>');
			});

			test('flagParameter with array type', () => {
				const renderers = new Renderers();
				expect(renderers.flagParameter([String])).toBe('<string>');
				expect(renderers.flagParameter([Number])).toBe('<number>');
			});

			test('flagDefault with various types', () => {
				const renderers = new Renderers();
				expect(renderers.flagDefault('hello')).toBe('"hello"');
				expect(renderers.flagDefault(42)).toBe('42');
				expect(renderers.flagDefault(true)).toBe('true');
				expect(renderers.flagDefault({ key: 'value' })).toBe('{"key":"value"}');
			});
		});
	});
});
