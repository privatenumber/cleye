import { underline } from 'colorette';
import { cli, command } from '../src';

let mockProcessExit: jest.SpyInstance;
let mockConsoleLog: jest.SpyInstance;

beforeAll(() => {
	process.stdout.columns = 90;
	mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();
});

beforeEach(() => {
	mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

	mockProcessExit.mockClear();
});

afterEach(() => {
	mockConsoleLog.mockRestore();
});

afterAll(() => {
	mockProcessExit.mockRestore();
});

describe('show help', () => {
	test('empty cli', () => {
		cli(
			{},
			undefined,
			['--help'],
		);

		expect(mockProcessExit).toHaveBeenCalledWith(0);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('name', () => {
		cli(
			{
				name: 'npm',
			},
			undefined,
			['--help'],
		);

		expect(mockProcessExit).toHaveBeenCalledWith(0);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('empty parameters', () => {
		cli(
			{
				parameters: [],
			},
			undefined,
			['--help'],
		);

		expect(mockProcessExit).toHaveBeenCalledWith(0);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('parameters with no name', () => {
		cli(
			{
				parameters: ['<arg-a>', '[arg-b]'],
			},
			undefined,
			['--help'],
		);

		expect(mockProcessExit).toHaveBeenCalledWith(0);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('parameters with name', () => {
		cli(
			{
				name: 'my-cli',
				parameters: ['<arg-a>', '[arg-b]'],
			},
			undefined,
			['--help'],
		);

		expect(mockProcessExit).toHaveBeenCalledWith(0);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('empty commands', () => {
		cli(
			{
				commands: [],
			},
			undefined,
			['--help'],
		);

		expect(mockProcessExit).toHaveBeenCalledWith(0);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('commands', () => {
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

		expect(mockProcessExit).toHaveBeenCalledWith(0);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('commands with description', () => {
		const testCommand = command({
			name: 'test',
			help: {
				description: 'test command',
			},
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

		expect(mockProcessExit).toHaveBeenCalledWith(0);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('undefined flags', () => {
		cli(
			{
				flags: undefined,
			},
			undefined,
			['--help'],
		);

		expect(mockProcessExit).toHaveBeenCalledWith(0);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('empty flags', () => {
		cli(
			{
				flags: {},
			},
			undefined,
			['--help'],
		);

		expect(mockProcessExit).toHaveBeenCalledWith(0);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('flags', () => {
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

		expect(mockProcessExit).toHaveBeenCalledWith(0);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('help disabled', () => {
		cli(
			{
				help: false,
			},
			undefined,
			['--help'],
		);

		expect(mockProcessExit).not.toHaveBeenCalled();
	});

	test('help disabled but shown', () => {
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

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('empty help.examples', () => {
		cli(
			{
				help: {
					examples: [],
				},
			},
			undefined,
			['--help'],
		);

		expect(mockProcessExit).toHaveBeenCalledWith(0);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('help.version with --help', () => {
		cli(
			{
				help: {
					version: '1.0.0',
				},
			},
			undefined,
			['--help'],
		);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('help.version with --version', () => {
		const parsed = cli(
			{
				help: {
					version: '1.0.0',
				},
			},
			undefined,
			['--version'],
		);

		expect(mockProcessExit).not.toHaveBeenCalled();

		expect(parsed.unknownFlags).toStrictEqual({
			version: [true],
		});
	});

	test('help.usage string', () => {
		cli(
			{
				help: {
					usage: 'usage string',
				},
			},
			undefined,
			['--help'],
		);

		expect(mockProcessExit).toHaveBeenCalledWith(0);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('help.usage array', () => {
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

		expect(mockProcessExit).toHaveBeenCalledWith(0);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('help.description', () => {
		cli(
			{
				help: {
					description: 'test description',
				},
			},
			undefined,
			['--help'],
		);

		expect(mockProcessExit).toHaveBeenCalledWith(0);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('command help', () => {
		const testCommand = command({
			name: 'test',
			parameters: ['<arg a>', '<arg b>'],
			help: {
				description: 'test command',
			},
		});

		cli(
			{
				name: 'my-cli',
				commands: [
					testCommand,
				],
			},
			undefined,
			['test', '--help'],
		);

		expect(mockProcessExit).toHaveBeenCalledWith(0);

		const { calls } = mockConsoleLog.mock;
		expect(calls[0][0]).toMatchSnapshot();
	});

	test('command help disabled', () => {
		const testCommand = command({
			name: 'test',
			help: false,
		});

		cli(
			{
				name: 'my-cli',
				commands: [
					testCommand,
				],
			},
			undefined,
			['test', '--help'],
		);

		expect(mockProcessExit).not.toHaveBeenCalled();
	});
});

test('show version', () => {
	cli(
		{
			version: '1.0.0',
		},
		undefined,
		['--version'],
	);

	expect(mockProcessExit).toHaveBeenCalledWith(0);

	const { calls } = mockConsoleLog.mock;
	expect(calls[0][0]).toMatchSnapshot();
});

test('smoke test', () => {
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

	expect(mockProcessExit).toHaveBeenCalledWith(0);

	const { calls } = mockConsoleLog.mock;
	expect(calls[0][0]).toMatchSnapshot();
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
									([flagName]: [{ data: { name: string }}]) => flagName.data.name in simpleFlags,
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
									([flagName]: [{ data: { name: string }}]) => flagName.data.name in advancedFlags,
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

	expect(mockProcessExit).toHaveBeenCalledWith(0);

	const { calls } = mockConsoleLog.mock;
	expect(calls[0][0]).toMatchSnapshot();
});
