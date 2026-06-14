import { stripVTControlCharacters } from 'node:util';
import { describe, test, expect } from 'manten';
import { spy } from 'nanospy';
import { defaultHelp } from '../../../src/render/default-help.ts';
import { render } from '../../../src/render/render.ts';
import { withColumns } from '../../utils/with-columns.ts';

// `defaultHelp` returns Node[]; tests assert on the rendered string.
const renderDefault = (...args: Parameters<typeof defaultHelp>) => render(...defaultHelp(...args));

process.stdout.columns = 80;

describe('defaultHelp', () => {
	describe('header', () => {
		test('renders name when provided', () => {
			const output = stripVTControlCharacters(renderDefault({ name: 'my-cli' }));
			expect(output).toContain('my-cli');
		});

		test('renders version prefixed with v', () => {
			const output = stripVTControlCharacters(renderDefault({
				name: 'my-cli',
				version: '1.2.3',
			}));
			expect(output).toContain('my-cli v1.2.3');
		});

		test('version without name still renders', () => {
			const output = stripVTControlCharacters(renderDefault({ version: '2.0.0' }));
			expect(output).toContain('v2.0.0');
		});

		test('no name and no version: no header line', () => {
			const output = stripVTControlCharacters(renderDefault({}));
			expect(output).not.toMatch(/^v?\d/);
		});

		test('description from help.description is shown', () => {
			const output = stripVTControlCharacters(renderDefault({
				help: { description: 'A helpful tool' },
			}));
			expect(output).toContain('A helpful tool');
		});
	});

	describe('auto usage', () => {
		test('shows usage line with [flags...]', () => {
			const output = stripVTControlCharacters(renderDefault({ name: 'my-cli' }));
			expect(output).toContain('Usage:');
			expect(output).toContain('my-cli [flags...]');
		});

		test('includes parameters in usage', () => {
			const output = stripVTControlCharacters(renderDefault({
				name: 'my-cli',
				parameters: ['<file>'],
			}));
			expect(output).toContain('my-cli [flags...] <file>');
		});

		test('includes global flags in command usage when commands present', () => {
			const output = stripVTControlCharacters(renderDefault({
				name: 'my-cli',
				commands: {
					build: {
						loader: () => {},
					},
				},
			}));
			expect(output).toContain('my-cli [global flags...] <command>');
		});

		test('custom usage string overrides auto usage', () => {
			const output = stripVTControlCharacters(renderDefault({
				name: 'my-cli',
				help: { usage: 'my-cli <custom>' },
			}));
			expect(output).toContain('Usage:');
			expect(output).toContain('my-cli <custom>');
			expect(output).not.toContain('[flags...]');
		});

		test('custom usage array joins with newline', () => {
			const output = stripVTControlCharacters(renderDefault({
				name: 'my-cli',
				help: { usage: ['my-cli foo', 'my-cli bar'] },
			}));
			expect(output).toContain('my-cli foo');
			expect(output).toContain('my-cli bar');
		});

		test('multi-line usage preserves authored line breaks when the block exceeds the width', () => {
			const restore = withColumns(20);
			try {
				const output = stripVTControlCharacters(renderDefault({
					name: 'my-cli',
					help: { usage: ['my-cli build <file>', 'my-cli deploy --prod'] },
				}));
				// Each authored line stays intact rather than being reflowed.
				expect(output).toContain('my-cli build <file>');
				expect(output).toContain('my-cli deploy --prod');
			} finally {
				restore();
			}
		});

		test('usage: false suppresses usage section', () => {
			const output = stripVTControlCharacters(renderDefault({
				name: 'my-cli',
				help: { usage: false },
			}));
			expect(output).not.toContain('Usage:');
		});

		test('no name: no auto usage', () => {
			const output = stripVTControlCharacters(renderDefault({}));
			expect(output).not.toContain('Usage:');
		});
	});

	describe('flags section', () => {
		test('shows --help flag by default', () => {
			const output = stripVTControlCharacters(renderDefault({ name: 'my-cli' }));
			expect(output).toContain('--help');
		});

		test('merges auto-injected -h and --help in generated output', () => {
			const output = stripVTControlCharacters(renderDefault({}));
			expect(output).toBe('Flags:\n  -h, --help  Show help (-h for short form)');
		});

		test('does not merge help display when user owns --help', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					help: {
						type: Boolean,
						description: 'Use custom help',
					},
				},
			}));
			expect(output).toContain('Show short help');
			expect(output).toContain('Use custom help');
			expect(output).not.toContain('-h, --help');
		});

		test('shows user-defined flags', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					output: {
						type: String,
						description: 'Output path',
					},
				},
			}));
			expect(output).toContain('--output');
			expect(output).toContain('Output path');
		});

		test('shows --version flag when version is set', () => {
			const output = stripVTControlCharacters(renderDefault({
				name: 'my-cli',
				version: '1.0.0',
			}));
			expect(output).toContain('--version');
		});

		test('flag with alias shows short form', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					output: {
						type: String,
						alias: 'o',
						description: 'Output path',
					},
				},
			}));
			expect(output).toContain('-o, --output');
		});

		test('flag with explicit undefined alias renders long form only', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					output: {
						type: String,
						alias: undefined,
						description: 'Output path',
					},
				},
			}));
			expect(output).not.toContain('-o, --output');
			expect(output).toContain('--output');
		});

		test('empty flag alias throws', () => {
			expect(() => renderDefault({
				flags: {
					verbose: {
						type: Boolean,
						alias: '',
						description: 'Verbose mode',
					},
				},
			})).toThrow('Flag alias "" for flag "verbose" cannot be empty');
		});

		test('flag alias array throws instead of rendering unsupported short form', () => {
			const flags = {
				verbose: {
					type: Boolean,
					alias: ['v'],
					description: 'Verbose mode',
				},
			} as unknown as NonNullable<Parameters<typeof defaultHelp>[0]['flags']>;

			expect(() => renderDefault({
				flags,
			})).toThrow('Flag alias for flag "verbose" must be a string');
		});

		test('Boolean flag has no <arg> label', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					verbose: {
						type: Boolean,
						description: 'Verbose mode',
					},
				},
			}));
			// Should not show <string> or <value> after --verbose
			const flagLine = output.split('\n').find(line => line.includes('--verbose')) ?? '';
			expect(flagLine).not.toContain('<string>');
			expect(flagLine).not.toContain('<value>');
		});

		test('String flag shows <string> arg label', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					name: { type: String },
				},
			}));
			const flagLine = output.split('\n').find(line => line.includes('--name')) ?? '';
			expect(flagLine).toContain('<string>');
		});

		test('Number flag shows <number> arg label', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					port: { type: Number },
				},
			}));
			const flagLine = output.split('\n').find(line => line.includes('--port')) ?? '';
			expect(flagLine).toContain('<number>');
		});

		test('flag placeholder overrides type-inferred label', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					target: {
						type: String,
						placeholder: '<url>',
					},
				},
			}));
			const flagLine = output.split('\n').find(line => line.includes('--target')) ?? '';
			expect(flagLine).toContain('<url>');
		});

		test('default value appended to description', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					retries: {
						type: Number,
						description: 'Retry count',
						default: 3,
					},
				},
			}));
			expect(output).toContain('(default: 3)');
		});

		test('falsy default 0 is shown in help', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					timeout: {
						type: Number,
						description: 'Timeout in ms',
						default: 0,
					},
				},
			}));
			expect(output).toContain('(default: 0)');
		});

		test('falsy default false is shown in help', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					verbose: {
						type: Boolean,
						description: 'Verbose mode',
						default: false,
					},
				},
			}));
			expect(output).toContain('(default: false)');
		});

		test('falsy default empty string is shown in help', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					prefix: {
						type: String,
						description: 'Output prefix',
						default: '',
					},
				},
			}));
			expect(output).toContain('(default: "")');
		});

		test('flags sorted naturally by displayed name', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					zebra: { type: Boolean },
					flag10: { type: Boolean },
					apple: { type: Boolean },
					flag2: { type: Boolean },
					dryRun: { type: Boolean },
					'a-b': { type: Boolean },
					ab: { type: Boolean },
				},
			}));
			const flagOrder = [
				'--a-b',
				'--ab',
				'--apple',
				'--dry-run',
				'--flag2',
				'--flag10',
				'--zebra',
			].map(flag => output.indexOf(flag));
			expect(flagOrder.every(index => index >= 0)).toBe(true);
			expect(flagOrder).toStrictEqual([...flagOrder].sort((a, b) => a - b));
		});

		test('camelCase flag name converted to kebab-case', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					dryRun: { type: Boolean },
				},
			}));
			expect(output).toContain('--dry-run');
			expect(output).not.toContain('--dryRun');
		});

		test('array flag type unwraps element type for arg label', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					tag: { type: [String] },
					port: { type: [Number] },
				},
			}));
			const tagLine = output.split('\n').find(line => line.includes('--tag')) ?? '';
			const portLine = output.split('\n').find(line => line.includes('--port')) ?? '';
			expect(tagLine).toContain('<string>');
			expect(portLine).toContain('<number>');
		});

		test('function default is not invoked while rendering help', () => {
			const defaultFunction = spy(() => 'computed-default');
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					token: {
						type: String,
						description: 'API token',
						default: defaultFunction,
					},
				},
			}));
			expect(output).toContain('(default: computed)');
			expect(defaultFunction.called).toBe(false);
		});

		test('described default uses description in help', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					timeout: {
						type: Number,
						description: 'Request timeout',
						default: {
							value: 30,
							description: '30 seconds',
						},
					},
				},
			}));
			expect(output).toContain('(default: 30 seconds)');
		});

		test('described function default uses description without invoking value', () => {
			const defaultFunction = spy(() => 'computed-default');
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					token: {
						type: String,
						description: 'API token',
						default: {
							value: defaultFunction,
							description: 'from config',
						},
					},
				},
			}));
			expect(output).toContain('(default: from config)');
			expect(defaultFunction.called).toBe(false);
		});

		test('object default with only value key renders as a plain default object', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					timeout: {
						type: Number,
						default: { value: 30 },
					},
				},
			}));
			expect(output).toContain('(default: {"value":30})');
		});

		test('object default with only description key renders as a plain default object', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					timeout: {
						type: Number,
						default: { description: '30 seconds' },
					},
				},
			}));
			expect(output).toContain('(default: {"description":"30 seconds"})');
		});

		test('explicit undefined default does not render a default annotation', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					token: {
						type: String,
						description: 'API token',
						default: undefined,
					},
				},
			}));
			expect(output).toContain('API token');
			expect(output).not.toContain('(default:');
		});

		test('described default with non-string description throws while rendering help', () => {
			expect(() => renderDefault({
				flags: {
					timeout: {
						type: Number,
						default: {
							value: 30,
							description: 30,
						},
					},
				},
			})).toThrow('Invalid described default');
		});

		test('single-character flag name renders as short-only flag', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					x: {
						type: String,
						description: 'short-only string',
					},
					y: {
						type: Boolean,
						description: 'short-only boolean',
					},
				},
			}));
			const xLine = output.split('\n').find(line => line.includes('-x')) ?? '';
			const yLine = output.split('\n').find(line => line.includes('-y')) ?? '';
			expect(xLine).toContain('-x');
			expect(xLine).toContain('<string>');
			expect(xLine).not.toContain('--x');
			expect(yLine).toContain('-y');
			expect(yLine).not.toContain('--y');
		});

		test('single-character flag without description renders cleanly', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					q: { type: Boolean },
				},
			}));
			const qLine = output.split('\n').find(line => line.includes('-q')) ?? '';
			expect(qLine).toContain('-q');
			expect(qLine).not.toContain('--q');
		});

		test('does not render --help/-h when options.help === false', () => {
			// Standalone defaultHelp should respect `help: false` the same way
			// cli() does — no `--help` or `-h` row in the flags section.
			const output = stripVTControlCharacters(renderDefault({
				name: 'my-cli',
				help: false,
				flags: { verbose: Boolean },
			}));
			expect(output).not.toContain('--help');
			expect(output).not.toContain('-h ');
		});

		test('does not inject -h when a user flag aliases h', () => {
			// User claimed `h` as an alias for `--verbose`. defaultHelp must
			// not also inject `autoFlagShortHelp` — there's only one `-h`,
			// and it belongs to the user's flag.
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					verbose: {
						type: Boolean,
						alias: 'h',
					},
				},
			}));
			// The single `-h` row should be the user's --verbose; the
			// stand-alone short-help row (no --long counterpart) must not exist.
			const hLines = output.split('\n').filter(line => /\s-h(?:\s|,|$)/.test(line));
			expect(hLines.length).toBe(1);
			expect(hLines[0]).toContain('--verbose');
		});
	});

	describe('commands section', () => {
		test('renders commands with descriptions', () => {
			const output = stripVTControlCharacters(renderDefault({
				name: 'my-cli',
				commands: {
					build: {
						description: 'Build the project',
						loader: () => {},
					},
					deploy: {
						description: 'Deploy the app',
						loader: () => {},
					},
				},
			}));
			expect(output).toContain('Commands:');
			expect(output).toContain('build');
			expect(output).toContain('Build the project');
			expect(output).toContain('deploy');
			expect(output).toContain('Deploy the app');
		});

		test('no commands section when commands is empty', () => {
			const output = stripVTControlCharacters(renderDefault({ name: 'my-cli' }));
			expect(output).not.toContain('Commands:');
		});
	});

	describe('examples section', () => {
		test('single example string is shown', () => {
			const output = stripVTControlCharacters(renderDefault({
				help: { examples: 'my-cli --verbose' },
			}));
			expect(output).toContain('Examples:');
			expect(output).toContain('my-cli --verbose');
		});

		test('array of examples joined with newlines', () => {
			const output = stripVTControlCharacters(renderDefault({
				help: { examples: ['my-cli foo', 'my-cli bar'] },
			}));
			expect(output).toContain('my-cli foo');
			expect(output).toContain('my-cli bar');
		});

		test('empty examples array produces no section', () => {
			const output = stripVTControlCharacters(renderDefault({
				help: { examples: [] },
			}));
			expect(output).not.toContain('Examples:');
		});

		test('examples keep one per line when the block exceeds the terminal width', () => {
			const restore = withColumns(30);
			try {
				const examples = ['demo alpha', 'demo bravo', 'demo charlie', 'demo delta'];
				const output = stripVTControlCharacters(renderDefault({
					name: 'tool',
					help: { examples },
				}));
				// Every example stays intact on its own line: the cumulative block
				// length exceeds 30, but no individual command is split.
				for (const example of examples) {
					expect(output).toContain(example);
				}
				// No example was broken onto a continuation line.
				expect(output).not.toMatch(/demo\n/);
			} finally {
				restore();
			}
		});

		test('examples preserve blank-line grouping', () => {
			const restore = withColumns(20);
			try {
				const output = stripVTControlCharacters(renderDefault({
					name: 'tool',
					help: {
						examples: [
							'# Group one',
							'tool foo',
							'',
							'# Group two',
							'tool bar',
						],
					},
				}));
				expect(output).toContain('# Group one\ntool foo\n\n# Group two\ntool bar');
			} finally {
				restore();
			}
		});

		test('a single example longer than the terminal width is not wrapped', () => {
			const restore = withColumns(20);
			try {
				const longExample = 'tool deploy --target production --region us-east-1';
				const output = stripVTControlCharacters(renderDefault({
					name: 'tool',
					help: { examples: [longExample] },
				}));
				expect(output).toContain(longExample);
			} finally {
				restore();
			}
		});

		test('resolves a function help when defaultHelp is called directly', () => {
			// Documented manual path: render(...defaultHelp(options)). The
			// function must be resolved here, not silently dropped.
			const output = stripVTControlCharacters(renderDefault({
				name: 'mycli',
				help: ({ name, command }) => ({
					description: `desc ${name}`,
					examples: [`${command} run`],
				}),
			}));
			expect(output).toContain('desc mycli');
			expect(output).toContain('mycli run');
		});
	});

	describe('short form', () => {
		test('short form contains usage line', () => {
			const output = stripVTControlCharacters(renderDefault({ name: 'my-cli' }, { form: 'short' }));
			expect(output).toContain('Usage:');
		});

		test('short form contains -h and --help flags', () => {
			const output = stripVTControlCharacters(renderDefault({ name: 'my-cli' }, { form: 'short' }));
			expect(output).toContain('-h');
			expect(output).toContain('--help');
		});

		test('short form shows flags with one-line descriptions', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					verbose: {
						type: Boolean,
						description: 'Enable verbose mode',
					},
				},
			}, { form: 'short' }));
			expect(output).toContain('--verbose');
			expect(output).toContain('Enable verbose mode');
		});

		test('short form omits lead description paragraph', () => {
			const output = stripVTControlCharacters(renderDefault({
				name: 'my-cli',
				help: { description: 'A very helpful tool' },
			}, { form: 'short' }));
			expect(output).not.toContain('A very helpful tool');
		});

		test('short form omits examples section', () => {
			const output = stripVTControlCharacters(renderDefault({
				help: { examples: 'my-cli --verbose' },
			}, { form: 'short' }));
			expect(output).not.toContain('Examples:');
			expect(output).not.toContain('my-cli --verbose');
		});

		test('short form shows command names without descriptions', () => {
			const output = stripVTControlCharacters(renderDefault({
				name: 'my-cli',
				commands: {
					build: {
						description: 'Build the project',
						loader: () => {},
					},
					deploy: {
						description: 'Deploy the app',
						loader: () => {},
					},
				},
			}, { form: 'short' }));
			expect(output).toContain('Commands:');
			expect(output).toContain('build');
			expect(output).toContain('deploy');
			expect(output).not.toContain('Build the project');
			expect(output).not.toContain('Deploy the app');
		});

		test('short form strips default-value suffix from flag descriptions', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					retries: {
						type: Number,
						description: 'Retry count',
						default: 3,
					},
				},
			}, { form: 'short' }));
			expect(output).toContain('Retry count');
			expect(output).not.toContain('(default: 3)');
		});

		test('short form preserves authored default-looking descriptions', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					output: {
						type: String,
						description: 'Destination (default: stdout)',
					},
				},
			}, { form: 'short' }));
			expect(output).toContain('Destination (default: stdout)');
		});

		test('long form (default) includes description and examples', () => {
			const output = stripVTControlCharacters(renderDefault({
				name: 'my-cli',
				help: {
					description: 'A very helpful tool',
					examples: 'my-cli --verbose',
				},
			}));
			expect(output).toContain('A very helpful tool');
			expect(output).toContain('Examples:');
		});
	});
}, { parallel: false });
