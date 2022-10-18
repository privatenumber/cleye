import { testSuite, expect } from 'manten';
import { underline } from 'kolorist';
import { mockEnvFunctions } from '../utils/mock-env-functions';
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
				expect(mocked.consoleLog.calls).toStrictEqual([['FLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['npm\n\nUSAGE:\n  npm [flags...]\n\nFLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['FLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['FLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\nUSAGE:\n  my-cli [flags...] <arg-a> [arg-b]\n\nFLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\nUSAGE:\n  my-cli [flags...] <arg-a> [arg-b] [--] [arg-c]\n\nFLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\nUSAGE:\n  my-cli [flags...] <arg-a> [arg-b] -- <arg-c>\n\nFLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['FLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\nUSAGE:\n  my-cli [flags...]\n  my-cli <command>\n\nCOMMANDS:\n  test                                                                                                                                                                                                                                                                       \n\nFLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['my-cli\n\nUSAGE:\n  my-cli [flags...]\n  my-cli <command>\n\nCOMMANDS:\n  test        test command                                                                                                                                                                                                                                                   \n\nFLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['FLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['FLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['FLAGS:\n      --flag                                                                                                                                                                                                                                                                 \n      --flag-a <string>                                                                                                                                                                                                                                                      \n      --flag-b <number>                                                                                                                                                                                                                                                      \n      --flag-c <value>          (default: {})                                                                                                                                                                                                                                \n  -h, --help                   Show help                                                                                                                                                                                                                                     \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['FLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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

				expect(mocked.consoleLog.calls).toStrictEqual([['v1.0.0\n\nFLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['USAGE:\n  usage string\n\nFLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['USAGE:\n  usage string a\n  usage string b\n  usage string c\n\nFLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['test description\n\nFLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
				expect(mocked.consoleLog.calls).toStrictEqual([['my-cli test\n\ntest command\n\nUSAGE:\n  my-cli test [flags...] <arg a> <arg b>\n\nFLAGS:\n  -h, --help        Show help                                                                                                                                                                                                                                                \n']]);
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
			expect(mocked.consoleLog.calls).toStrictEqual([['my-cli v1.1.1\n\nUSAGE:\n  my-cli [flags...] <urls...>\n  my-cli <command>\n\nCOMMANDS:\n  my-command        my command description                                                                                                                                                                                                                                   \n\nFLAGS:\n  -d, --dark-mode                Show tweet in dark mode                                                                                                                                                                                                                     \n  -h, --help                     Show help                                                                                                                                                                                                                                   \n      --locale <locale>          Locale (default: "en")                                                                                                                                                                                                                      \n  -o, --output-dir <path>        Tweet screenshot output directory                                                                                                                                                                                                           \n  -t, --show-tweet               Show tweet thread                                                                                                                                                                                                                           \n      --version                  Show version                                                                                                                                                                                                                                \n  -w, --width <width>            Width of tweet (default: 550)                                                                                                                                                                                                               \n\nEXAMPLES:\n  # Snapshot a tweet\n  snap-tweet https://twitter.com/jack/status/20\n  \n  # Snapshot a tweet with Japanese locale\n  snap-tweet https://twitter.com/TwitterJP/status/578707432 --locale ja\n  \n  # Snapshot a tweet with dark mode and 900px width\n  snap-tweet https://twitter.com/Interior/status/463440424141459456 --width 900 --dark-mode\n']]);
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
											([flagName]: [{ data: { name: string }}]) => (
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
											([flagName]: [{ data: { name: string }}]) => (
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
			expect(mocked.consoleLog.calls).toStrictEqual([['USAGE:\n  esbuild [options...] [entry points]\n\nDOCUMENTATION:\n  \u001B[4mhttps://esbuild.github.io/\u001B[24m\n\nSIMPLE OPTIONS:\n  --bundle            Bundle all dependencies into the output files                                                                                                                                                                                                          \n  --define=...        Substitute K with V while parsing                                                                                                                                                                                                                      \n\nADVANCED OPTIONS:\n  --allow-overwrite        Allow output files to overwrite input files                                                                                                                                                                                                       \n  --asset-names            Path template to use for "file" loader files (default "[name]-[hash]")                                                                                                                                                                            \n\nEXAMPLES:\n  # Produces dist/entry_point.js and dist/entry_point.js.map\n  esbuild --bundle entry_point.js --outdir=dist --minify --sourcemap\n\nReceived value: 123']]);
		});
	});
});
