/**
 * Demonstrates multi-group flag sections using the cleye/help atom API.
 *
 * Pattern: build the help document from scratch inside `help.render`,
 * declaring `Flag[]` arrays directly — one per logical group — then
 * composing them with `section()` calls.
 *
 * Based on the real esbuild CLI: https://github.com/evanw/esbuild
 *
 * Usage:
 *   node --experimental-strip-types examples/esbuild/index.ts --help
 */

import { underline } from 'ansis';
import { cli } from '#cleye';
import {
	render, usage, section, flags, footer, type Flag,
} from '#cleye/help';

// ── Simple options ────────────────────────────────────────────────────────

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
		description: 'Output format (iife | cjs | esm, no default when not bundling)',
	},
	loader: {
		type: String,
		description: 'Use loader L to load file extension X (js | jsx | ts | tsx | json | ...)',
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
		description: 'Environment target (e.g. es2017, chrome58, node10, default esnext)',
	},
	watch: {
		type: Boolean,
		description: 'Watch mode: rebuild on file system changes',
	},
};

// ── Advanced options ──────────────────────────────────────────────────────

const advancedFlags = {
	allowOverwrite: {
		type: Boolean,
		description: 'Allow output files to overwrite input files',
	},
	assetNames: {
		type: String,
		description: 'Path template to use for "file" loader files (default "[name]-[hash]")',
	},
	chunkNames: {
		type: String,
		description: 'Path template to use for code splitting chunks (default "[name]-[hash]")',
	},
	entryNames: {
		type: String,
		description: 'Path template to use for entry point output paths (default "[dir]/[name]")',
	},
	globalName: {
		type: String,
		description: 'The name of the global for the IIFE format',
	},
	keepNames: {
		type: Boolean,
		description: 'Preserve "name" on functions and classes',
	},
	legalComments: {
		type: String,
		description: 'Where to place license comments (none | inline | eof | linked | external)',
	},
	metafile: {
		type: String,
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
	resolveExtensions: {
		type: String,
		description: 'Comma-separated list of implicit extensions (default ".tsx,.ts,.jsx,.js,.css,.json")',
	},
	tsconfig: {
		type: String,
		description: 'Use this tsconfig.json file instead of other ones',
	},
};

// ── Flag lists for the help document ─────────────────────────────────────
//
// Declared as Flag[] directly so help.render can compose them into
// named sections without re-reading the cleye flag config at render time.

const simpleFlagList: Flag[] = [
	{
		long: '--bundle',
		description: 'Bundle all dependencies into the output files',
	},
	{
		long: '--define',
		arg: 'key=value',
		description: 'Substitute K with V while parsing',
	},
	{
		long: '--external',
		arg: 'module',
		description: 'Exclude module M from the bundle (can use * wildcards)',
	},
	{
		long: '--format',
		arg: 'iife|cjs|esm',
		description: 'Output format',
	},
	{
		long: '--loader',
		arg: 'ext=loader',
		description: 'Use loader L for file extension X',
	},
	{
		long: '--minify',
		description: 'Minify the output (sets all --minify-* flags)',
	},
	{
		long: '--outdir',
		arg: 'dir',
		description: 'The output directory (for multiple entry points)',
	},
	{
		long: '--outfile',
		arg: 'file',
		description: 'The output file (for one entry point)',
	},
	{
		long: '--platform',
		arg: 'browser|node|neutral',
		description: 'Platform target (default browser)',
	},
	{
		long: '--sourcemap',
		description: 'Enable a source map',
	},
	{
		long: '--splitting',
		description: 'Enable code splitting (currently only for esm)',
	},
	{
		long: '--target',
		arg: 'env',
		description: 'Environment target (e.g. es2017, chrome58, node10, default esnext)',
	},
	{
		long: '--watch',
		description: 'Watch mode: rebuild on file system changes',
	},
];

const advancedFlagList: Flag[] = [
	{
		long: '--allow-overwrite',
		description: 'Allow output files to overwrite input files',
	},
	{
		long: '--asset-names',
		arg: 'template',
		description: 'Path template for "file" loader files (default "[name]-[hash]")',
	},
	{
		long: '--chunk-names',
		arg: 'template',
		description: 'Path template for code splitting chunks (default "[name]-[hash]")',
	},
	{
		long: '--entry-names',
		arg: 'template',
		description: 'Path template for entry point output paths (default "[dir]/[name]")',
	},
	{
		long: '--global-name',
		arg: 'name',
		description: 'The name of the global for the IIFE format',
	},
	{
		long: '--keep-names',
		description: 'Preserve "name" on functions and classes',
	},
	{
		long: '--legal-comments',
		arg: 'none|inline|eof|linked|external',
		description: 'Where to place license comments',
	},
	{
		long: '--metafile',
		arg: 'file',
		description: 'Write build metadata to a JSON file',
	},
	{
		long: '--minify-whitespace',
		description: 'Remove whitespace in output files',
	},
	{
		long: '--minify-identifiers',
		description: 'Shorten identifiers in output files',
	},
	{
		long: '--minify-syntax',
		description: 'Use equivalent but shorter syntax in output files',
	},
	{
		long: '--resolve-extensions',
		arg: 'extensions',
		description: 'Comma-separated implicit extensions (default ".tsx,.ts,.jsx,.js,.css,.json")',
	},
	{
		long: '--tsconfig',
		arg: 'file',
		description: 'Use this tsconfig.json instead of others',
	},
];

await cli({
	name: 'esbuild',

	version: '0.25.0',

	parameters: ['[entry points...]'],

	flags: {
		...simpleFlags,
		...advancedFlags,
	},

	help: {
		render() {
			return render(
				usage('esbuild', '[options] [entry points...]'),
				section('Documentation', footer(underline('https://esbuild.github.io/'))),
				section('Repository', footer(underline('https://github.com/evanw/esbuild'))),
				section('Simple options', flags(simpleFlagList)),
				section('Advanced options', flags(advancedFlagList)),
				section(
					'Examples',
					footer([
						'# Bundle entry_point.js with minification and source maps',
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
						'# Watch for changes and rebuild automatically',
						'esbuild app.ts --bundle --watch',
					].join('\n')),
				),
			);
		},
	},
}, () => {
	console.log('would run esbuild...');
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
