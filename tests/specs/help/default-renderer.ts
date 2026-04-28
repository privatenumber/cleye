import { stripVTControlCharacters } from 'node:util';
import { describe, test, expect } from 'manten';
import { defaultHelp } from '../../../src/render/default-help.ts';
import { render } from '../../../src/render/render.ts';

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

		test('includes command usage line when commands present', () => {
			const output = stripVTControlCharacters(renderDefault({
				name: 'my-cli',
				commands: {
					build: {
						loader: () => {},
					},
				},
			}));
			expect(output).toContain('my-cli <command>');
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

		test('flags sorted alphabetically', () => {
			const output = stripVTControlCharacters(renderDefault({
				flags: {
					zebra: { type: Boolean },
					apple: { type: Boolean },
				},
			}));
			const appleIndex = output.indexOf('--apple');
			const zebraIndex = output.indexOf('--zebra');
			expect(appleIndex).toBeLessThan(zebraIndex);
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
