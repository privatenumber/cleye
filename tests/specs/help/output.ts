import { stripVTControlCharacters } from 'node:util';
import { describe, test, expect } from 'manten';
import { cli, type CliOptions, type HelpContext } from '#cleye';
import { mockEnvFunctions } from '../../utils/mock-env-functions.ts';
import { withColumns } from '../../utils/with-columns.ts';

// Tests in this file assert content + layout, not styling. Strip ANSI from
// the captured help output so assertions remain hermetic against ambient
// color env (NO_COLOR / FORCE_COLOR / TTY state). One styling-lock test
// below intentionally compares the raw ANSI form.
//
// Also enforces "exactly one console.log call" — replaces the
// `toStrictEqual([['<output>']])` shape's implicit call-count check.
const getOutput = (mocked: ReturnType<typeof mockEnvFunctions>) => {
	expect(mocked.consoleLog.callCount).toBe(1);
	expect(mocked.consoleLog.calls[0]).toHaveLength(1);
	return stripVTControlCharacters(mocked.consoleLog.calls[0][0] as string);
};

describe('help output', () => {
	describe('show help', () => {
		test('empty cli', async () => {
			const mocked = mockEnvFunctions();
			cli({ name: '' }, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('Flags:\n  -h, --help  Show help (-h for short form)');
		});

		test('name', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: 'npm',
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('npm\n\nUsage: npm [flags...]\n\nFlags:\n  -h, --help  Show help (-h for short form)');
		});

		test('empty parameters', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: '',
				parameters: [],
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('Flags:\n  -h, --help  Show help (-h for short form)');
		});

		test('parameters with no name', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: '',
				parameters: ['<arg-a>', '[arg-b]'],
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('Flags:\n  -h, --help  Show help (-h for short form)');
		});

		test('parameters with name', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: 'my-cli',
				parameters: ['<arg-a>', '[arg-b]'],
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('my-cli\n\nUsage: my-cli [flags...] <arg-a> [arg-b]\n\nFlags:\n  -h, --help  Show help (-h for short form)');
		});

		test('parameters with optional --', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: 'my-cli',
				parameters: ['<arg-a>', '[arg-b]', '--', '[arg-c]'],
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('my-cli\n\nUsage: my-cli [flags...] <arg-a> [arg-b] [--] [arg-c]\n\nFlags:\n  -h, --help  Show help (-h for short form)');
		});

		test('parameters with required --', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: 'my-cli',
				parameters: ['<arg-a>', '[arg-b]', '--', '<arg-c>'],
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('my-cli\n\nUsage: my-cli [flags...] <arg-a> [arg-b] -- <arg-c>\n\nFlags:\n  -h, --help  Show help (-h for short form)');
		});

		test('empty commands', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: '',
				commands: {},
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('Flags:\n  -h, --help  Show help (-h for short form)');
		});

		test('commands', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: 'my-cli',
				commands: {
					test: () => {},
				},
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('my-cli\n\nUsage: my-cli [global flags...] <command>\n\nCommands:\n  test\n\nFlags:\n  -h, --help  Show help (-h for short form)');
		});

		test('commands with description', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: 'my-cli',
				commands: {
					test: {
						description: 'test command',
						loader: () => {},
					},
				},
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('my-cli\n\nUsage: my-cli [global flags...] <command>\n\nCommands:\n  test  test command\n\nFlags:\n  -h, --help  Show help (-h for short form)');
		});

		test('commands without description', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: 'my-cli',
				commands: {
					test: {
						loader: () => {},
					},
				},
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('my-cli\n\nUsage: my-cli [global flags...] <command>\n\nCommands:\n  test\n\nFlags:\n  -h, --help  Show help (-h for short form)');
		});

		test('undefined flags', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: '',
				flags: undefined,
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('Flags:\n  -h, --help  Show help (-h for short form)');
		});

		test('empty flags', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: '',
				flags: {},
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('Flags:\n  -h, --help  Show help (-h for short form)');
		});

		test('flags', async () => {
			const mocked = mockEnvFunctions();
			cli({
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
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('Flags:\n      --flag             \n      --flag-a <string>  \n      --flag-b <number>  \n      --flag-c <value>   (default: {})\n  -h, --help             Show help (-h for short form)');
		});

		test('help disabled', async () => {
			const mocked = mockEnvFunctions();
			cli({
				help: false,
			}, undefined, ['--help']);
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

			expect(getOutput(mocked)).toBe('my-cli v1.2.3\n\nUsage: my-cli [flags...]\n\nFlags:\n  -h, --help  Show help (-h for short form)');
		});

		test('empty help.examples', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: '',
				help: {
					examples: [],
				},
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('Flags:\n  -h, --help  Show help (-h for short form)');
		});

		test('help.version with --help', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: '',
				help: {
					version: '1.0.0',
				},
			}, undefined, ['--help']);
			mocked.restore();

			expect(getOutput(mocked)).toBe('v1.0.0\n\nFlags:\n  -h, --help  Show help (-h for short form)');
		});

		test('help.version with --version', async () => {
			const mocked = mockEnvFunctions();
			const parsed = cli({
				help: {
					version: '1.0.0',
				},
			}, undefined, ['--version']);
			mocked.restore();

			expect(mocked.processExit.called).toBe(false);
			expect({ ...parsed.unknownFlags }).toStrictEqual({
				version: [true],
			});
		});

		test('help.usage string', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: '',
				help: {
					usage: 'usage string',
				},
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('Usage:\nusage string\n\nFlags:\n  -h, --help  Show help (-h for short form)');
		});

		test('help.usage array', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: '',
				help: {
					usage: [
						'usage string a',
						'usage string b',
						'usage string c',
					],
				},
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('Usage:\nusage string a\nusage string b\nusage string c\n\nFlags:\n  -h, --help  Show help (-h for short form)');
		});

		test('help.usage false disables usage section', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: 'my-cli',
				help: {
					usage: false,
				},
			}, undefined, ['--help']);
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
			cli({
				name: '',
				help: {
					description: 'test description',
				},
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			expect(getOutput(mocked)).toBe('test description\n\nFlags:\n  -h, --help  Show help (-h for short form)');
		});

		test('styling: section headings, flag names, and arg labels emit ANSI', async () => {
			// Locks in the styling contract for the default help renderer.
			// Other "show help" tests strip ANSI to focus on content/layout;
			// this one is the single styling-aware assertion. Skipped when
			// the ambient env disables color — the styling contract doesn't
			// apply in that case.
			if (
				process.env.NO_COLOR
				|| !process.env.FORCE_COLOR
				|| process.env.FORCE_COLOR === '0'
			) {
				return;
			}
			const mocked = mockEnvFunctions();
			cli({
				name: 'my-cli',
				flags: {
					verbose: {
						type: Boolean,
						alias: 'v',
						description: 'verbose mode',
					},
				},
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			const raw = mocked.consoleLog.calls[0][0] as string;
			// Section headings: bold + green.
			expect(raw).toContain('\u001B[1m\u001B[32mUsage:\u001B[39m\u001B[22m');
			expect(raw).toContain('\u001B[1m\u001B[32mFlags:\u001B[39m\u001B[22m');
			// Long flag name: bold + cyan.
			expect(raw).toContain('\u001B[1m\u001B[36m--verbose\u001B[39m\u001B[22m');
			// Short flag: bold + cyan with leading dash.
			expect(raw).toContain('\u001B[1m\u001B[36m-v\u001B[39m\u001B[22m');
		});
	}, { parallel: false });

	describe('help as a function', () => {
		test('interpolates name, command, and version', () => {
			const mocked = mockEnvFunctions();
			cli({
				name: 'mycli',
				version: '2.1.0',
				help: ({ name, command, version }) => ({
					description: `${name} v${version}`,
					examples: [`${command} run --watch`],
				}),
			}, undefined, ['--help']);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[0]]);
			const output = getOutput(mocked);
			// description uses name + version; examples use command (=== name at root)
			expect(output).toContain('mycli v2.1.0');
			expect(output).toContain('mycli run --watch');
		});
	}, { parallel: false });

	describe('command path', () => {
		test('subcommand --help shows the full command path in usage', async () => {
			const mocked = mockEnvFunctions();
			await cli({
				name: 'npm',
				commands: {
					config: async () => {
						await cli({
							name: 'config',
							commands: {
								get: () => {
									cli({
										name: 'get',
										parameters: ['<key>'],
									});
								},
							},
						}, () => {});
					},
				},
			}, () => {}, ['config', 'get', '--help']);
			mocked.restore();

			// Not just the leaf `get` — the full path the user actually types.
			expect(getOutput(mocked)).toContain('Usage: npm config get [flags...] <key>');
		});

		test('help function in a subcommand receives the full command path', async () => {
			const mocked = mockEnvFunctions();
			await cli({
				name: 'npm',
				commands: {
					config: () => {
						cli({
							name: 'config',
							help: ({ name, command }) => ({
								examples: [`leaf:${name}`, `path:${command}`],
							}),
						});
					},
				},
			}, () => {}, ['config', '--help']);
			mocked.restore();

			const output = getOutput(mocked);
			expect(output).toContain('leaf:config');
			expect(output).toContain('path:npm config');
		});

		test('command path is dynamic per invocation; leaf name is stable', async () => {
			// One config object, invoked two ways. `name` (leaf) is constant;
			// `command` (full path) is resolved from the live parent chain, so
			// it differs depending on whether the command has a parent.
			const getCommand = {
				name: 'get',
				parameters: ['<key>'],
				help: ({ name, command }: HelpContext) => ({
					examples: [`name:${name}`, `cmd:${command}`],
				}),
			} satisfies CliOptions;

			// Standalone: no parent → command is just its own name.
			const solo = mockEnvFunctions();
			cli(getCommand, undefined, ['--help']);
			solo.restore();
			const soloOutput = getOutput(solo);
			expect(soloOutput).toContain('name:get');
			expect(soloOutput).toContain('cmd:get');
			expect(soloOutput).toContain('Usage: get [flags...] <key>');
			expect(soloOutput).not.toContain('npm'); // no phantom parent

			// Nested three levels deep (npm config get): same config object.
			const nested = mockEnvFunctions();
			await cli({
				name: 'npm',
				commands: {
					config: async () => {
						await cli({
							name: 'config',
							commands: {
								get: () => {
									cli(getCommand);
								},
							},
						}, () => {});
					},
				},
			}, () => {}, ['config', 'get', '--help']);
			nested.restore();
			const nestedOutput = getOutput(nested);
			expect(nestedOutput).toContain('name:get'); // leaf unchanged
			expect(nestedOutput).toContain('cmd:npm config get'); // full path picked up
			expect(nestedOutput).toContain('Usage: npm config get [flags...] <key>');
		});

		test('empty root name does not leak a leading space into the command path', async () => {
			const mocked = mockEnvFunctions();
			await cli({
				name: '',
				commands: {
					build: () => {
						cli({
							parameters: ['<target>'],
							help: ({ command }) => ({ examples: [`cmd:[${command}]`] }),
						});
					},
				},
			}, () => {}, ['build', '--help']);
			mocked.restore();

			const output = getOutput(mocked);
			// The path is `build`, not ` build` — no leading space from an empty root.
			expect(output).toContain('cmd:[build]');
			expect(output).not.toContain('cmd:[ build]');
			expect(output).toContain('Usage: build [flags...] <target>');
		});
	}, { parallel: false });

	describe('invalid usage', () => {
		test('missing required parameter', async () => {
			const mocked = mockEnvFunctions();
			cli({
				name: 'my-cli',
				parameters: ['<value-a>'],
			}, undefined, []);
			mocked.restore();

			expect(mocked.processExit.calls).toStrictEqual([[1]]);
			expect(mocked.consoleError.calls).toStrictEqual([['Error: Missing required parameter "value-a"\n']]);
		});
	}, { parallel: false });

	test('show version', async () => {
		const mocked = mockEnvFunctions();
		cli({
			version: '1.0.0',
		}, undefined, ['--version']);
		mocked.restore();

		expect(mocked.processExit.calls).toStrictEqual([[0]]);
		expect(getOutput(mocked)).toBe('1.0.0');
	});

	test('smoke test', async () => {
		const mocked = mockEnvFunctions();
		const restoreColumns = withColumns(Number.POSITIVE_INFINITY);
		cli({
			name: 'my-cli',

			version: '1.1.1',

			commands: {
				'my-command': {
					description: 'my command description',
					loader: () => {},
				},
			},

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
		restoreColumns();
		mocked.restore();

		expect(mocked.processExit.calls).toStrictEqual([[0]]);
		expect(getOutput(mocked)).toBe('my-cli v1.1.1\n\nUsage: my-cli [global flags...] <command>\n\nCommands:\n  my-command  my command description\n\nFlags:\n  -d, --dark-mode          Show tweet in dark mode\n  -h, --help               Show help (-h for short form)\n      --locale <locale>    Locale (default: "en")\n  -o, --output-dir <path>  Tweet screenshot output directory\n  -t, --show-tweet         Show tweet thread\n      --version            Show version\n  -w, --width <width>      Width of tweet (default: 550)\n\nExamples:\n# Snapshot a tweet\nsnap-tweet https://twitter.com/jack/status/20\n\n# Snapshot a tweet with Japanese locale\nsnap-tweet https://twitter.com/TwitterJP/status/578707432 --locale ja\n\n# Snapshot a tweet with dark mode and 900px width\nsnap-tweet https://twitter.com/Interior/status/463440424141459456 --width 900 --dark-mode');
	});

	test('acronyms in flag names render as single words (issue #38)', async () => {
		const mocked = mockEnvFunctions();
		cli({
			flags: {
				orgID: {
					type: String,
					description: 'Organization ID',
				},
				apiURL: {
					type: String,
					description: 'API endpoint',
				},
				oauth2Bearer: {
					type: String,
					description: 'OAuth token',
				},
			},
		}, undefined, ['--help']);
		mocked.restore();

		const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0]);
		expect(output).toContain('--org-id');
		expect(output).toContain('--api-url');
		expect(output).toContain('--oauth2-bearer');
		expect(output).not.toContain('--org-i-d');
		expect(output).not.toContain('--api-u-r-l');
		expect(output).not.toContain('--oauth2bearer');
	});
}, { parallel: false });
