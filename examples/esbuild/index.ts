import { underline } from 'colorette';
import { cli } from '../../src';

const simpleFlags = {
	bundle: {
		type: Boolean,
		description: 'Bundle all dependencies into the output files',
	},
	define: {
		type: String,
		description: 'Substitute K with V while parsing',
	},
	external: {
		type: String,
		description: 'Exclude module M from the bundle (can use * wildcards)',
	},
	format: {
		type: String,
		description: 'Output format (iife | cjs | esm, no default when not bundling, otherwise default is iife when platform is browser and cjs when platform is node)',
	},
	loader: {
		type: String,
		description: 'Use loader L to load file extension X, where L is one of: js | jsx | ts | tsx | json | text | base64 | file | dataurl | binary',
	},
	minify: {
		type: Boolean,
		description: 'Minify the output (sets all --minify-* flags)',
	},
	outdir: {
		type: String,
		description: 'The output directory (for multiple entry points)',
	},
	outfile: {
		type: String,
		description: 'The output file (for one entry point)',
	},
	platform: {
		type: String,
		description: 'Platform target (browser | node | neutral, default browser)',
	},
	serve: {
		type: String,
		description: 'Start a local HTTP server on this host:port for outputs',
	},
	sourcemap: {
		type: Boolean,
		description: 'Enable a source map',
	},
	splitting: {
		type: Boolean,
		description: 'Enable code splitting (currently only for esm)',
	},
	target: {
		type: String,
		description: 'Environment target (e.g. es2017, chrome58, firefox57, safari11, edge16, node10, default esnext)',
	},
	watch: {
		type: Boolean,
		description: 'Watch mode: rebuild on file system changes',
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
	charset: {
		type: Boolean,
		description: 'Do not escape UTF-8 code points',
	},
	chunkNames: {
		type: Boolean,
		description: 'Path template to use for code splitting chunks (default "[name]-[hash]")',
	},
	color: {
		type: Boolean,
		description: 'Force use of color terminal escapes (true | false)',
	},
	entryNames: {
		type: Boolean,
		description: 'Path template to use for entry point output paths (default "[dir]/[name]", can also use "[hash]")',
	},
	globalName: {
		type: Boolean,
		description: 'The name of the global for the IIFE format',
	},
	jsxFactory: {
		type: Boolean,
		description: 'What to use for JSX instead of React.createElement',
	},
	jsxFragment: {
		type: Boolean,
		description: 'What to use for JSX instead of React.Fragment',
	},
	jsx: {
		type: Boolean,
		description: 'Set to "preserve" to disable transforming JSX to JS',
	},
	keepNames: {
		type: Boolean,
		description: 'Preserve "name" on functions and classes',
	},
	legalComments: {
		type: Boolean,
		description: 'Where to place license comments (none | inline | eof | linked | external, default eof when bundling and inline otherwise)',
	},
	logLevel: {
		type: Boolean,
		description: 'Disable logging (verbose | debug | info | warning | error | silent, default info)',
	},
	logLimit: {
		type: Boolean,
		description: 'Maximum message count or 0 to disable (default 10)',
	},
	mainFields: {
		type: Boolean,
		description: 'Override the main file order in package.json (default "browser,module,main" when platform is browser and "main,module" when platform is node)',
	},
	metafile: {
		type: Boolean,
		description: 'Write metadata about the build to a JSON file',
	},
	minifyWhitespace: {
		type: Boolean,
		description: 'Remove whitespace in output files',
	},
	minifyIdentifiers: {
		type: Boolean,
		description: 'Shorten identifiers in output files',
	},
	minifySyntax: {
		type: Boolean,
		description: 'Use equivalent but shorter syntax in output files',
	},
	outbase: {
		type: Boolean,
		description: 'The base path used to determine entry point output paths (for multiple entry points)',
	},
	preserveSymlinks: {
		type: Boolean,
		description: 'Disable symlink resolution for module lookup',
	},
	publicPath: {
		type: Boolean,
		description: 'Set the base URL for the "file" loader',
	},
	resolveExtensions: {
		type: Boolean,
		description: 'A comma-separated list of implicit extensions (default ".tsx,.ts,.jsx,.js,.css,.json")',
	},
	servedir: {
		type: Boolean,
		description: 'What to serve in addition to generated output files',
	},
	sourceRoot: {
		type: Boolean,
		description: 'Sets the "sourceRoot" field in generated source maps',
	},
	sourcefile: {
		type: Boolean,
		description: 'Set the source file for the source map (for stdin)',
	},
	sourcesContent: {
		type: Boolean,
		description: 'Omit "sourcesContent" in generated source maps',
	},
	treeShaking: {
		type: Boolean,
		description: 'Set to "ignore-annotations" to work with packages that have incorrect tree-shaking annotations',
	},
	tsconfig: {
		type: Boolean,
		description: 'Use this tsconfig.json file instead of other ones',
	},
	version: {
		type: Boolean,
		description: 'Print the current version (0.12.14) and exit',
	},
};

const app = cli({

	name: 'esbuild',

	version: '1.0.0',

	parameters: ['[entry points]'],

	flags: {
		...simpleFlags,
		...advancedFlags,
		help: Boolean,
	},

	help: {
		examples: [
			'# Produces dist/entry_point.js and dist/entry_point.js.map',
			'esbuild --bundle entry_point.js --outdir=dist --minify --sourcemap',
			'',
			'# Allow JSX syntax in .js files',
			'esbuild --bundle entry_point.js --outfile=out.js --loader:.js=jsx',
			'',
			'# Substitute the identifier RELEASE for the literal true',
			'esbuild example.js --outfile=out.js --define:RELEASE=true',
			'',
			'# Provide input via stdin, get output via stdout',
			'esbuild --minify --loader=ts < input.ts > output.js',
			'',
			'# Automatically rebuild when input files are changed',
			'esbuild app.ts --bundle --watch',
			'',
			'# Start a local HTTP server for everything in "www"',
			'esbuild app.ts --bundle --servedir=www --outdir=www/js',
		],

		render(nodes, renderers) {
			const [, usage, flags, examples] = nodes;

			// Replace "flags" with "options"
			usage.data.body = usage.data.body.replace('flags', 'options');

			// Update renderer so flags that accept a value shows `=...`
			renderers.flagOperator = () => '=';
			renderers.flagParameter = flagType => (flagType === Boolean ? '' : '...');

			const { tableData: flagsTableData } = flags.data.body.data;

			return renderers.render([
				usage,

				// Add Documentation & Repository links
				{
					type: 'section',
					data: {
						title: 'Documentation:',
						body: underline('https://esbuild.github.io/'),
					},
				},
				{
					type: 'section',
					data: {
						title: 'Repository:',
						body: underline('https://github.com/evanw/esbuild'),
					},
				},

				// Split Flags into "Simple options" and "Advanced options"
				{
					type: 'section',
					data: {
						title: 'Simple options:',
						body: {
							type: 'table',
							data: {
								...flags,
								tableData: flagsTableData.filter(
									([flagName]: [{ data: { name: string }}]) => flagName.data.name in simpleFlags,
								),
							},
						},
						indentBody: 0,
					},
				},
				{
					type: 'section',
					data: {
						title: 'Advanced options:',
						body: {
							type: 'table',
							data: {
								...flags,
								tableData: flagsTableData.filter(
									([flagName]: [{ data: { name: string }}]) => flagName.data.name in advancedFlags,
								),
							},
						},
						indentBody: 0,
					},
				},
				flags,
				examples,
			]);
		},
	},
});

console.log(app);
