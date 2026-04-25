/**
 * Demonstrates an example-led help structure using the cleye/help atom API.
 *
 * Pattern: `usage()` → `section('COMMON COMMANDS', p(...))` → per-group
 * `section('Flags', flags([...]))` calls. Flag lists are declared as `Flag[]`
 * with ANSI-styled long names to match the real tsc help output.
 *
 * Based on the real TypeScript compiler CLI: https://github.com/microsoft/TypeScript
 *
 * Usage:
 *   node --experimental-strip-types examples/tsc/index.ts --help
 */

import assert from 'node:assert';
import { blue } from 'ansis';
import { cli } from '#cleye';
import {
	render, usage, section, flags, footer, p, type Flag,
} from '#cleye/help/responsive';

const targetValues = ['es3', 'es5', 'es6', 'es2015', 'es2016', 'es2017', 'es2018', 'es2019', 'es2020', 'es2021', 'esnext'] as const;
type TargetValue = typeof targetValues[number];

const moduleValues = ['none', 'commonjs', 'amd', 'system', 'umd', 'es6', 'es2015', 'es2020', 'esnext'] as const;
type ModuleValue = typeof moduleValues[number];

const jsxValues = [undefined, 'preserve', 'react-native', 'react', 'react-jsx', 'react-jsxdev'] as const;
type JsxValue = typeof jsxValues[number];

// ── CLI flag definitions ──────────────────────────────────────────────────

const commandLineFlags = {
	watch: {
		type: Boolean,
		alias: 'w',
		description: 'Watch input files.',
	},
	all: {
		type: Boolean,
		description: 'Show all compiler options.',
	},
	version: {
		type: Boolean,
		alias: 'v',
		description: "Print the compiler's version.",
	},
	init: {
		type: Boolean,
		description: 'Initializes a TypeScript project and creates a tsconfig.json file.',
	},
	project: {
		type: String,
		alias: 'p',
		description: "Compile the project given the path to its configuration file, or to a folder with a 'tsconfig.json'.",
	},
	build: {
		type: Boolean,
		alias: 'b',
		description: 'Build one or more projects and their dependencies, if out of date',
	},
	showConfig: {
		type: Boolean,
		description: 'Print the final configuration instead of building.',
	},
};

const commonCompilerOptions = {
	target: {
		type: (value: TargetValue) => {
			assert.ok(targetValues.includes(value), 'Invalid target value');
			return value;
		},
		alias: 't',
		description: `Set the JavaScript language version for emitted JavaScript and include compatible library declarations.\none of: ${targetValues.join(', ')}`,
		default: 'ES3',
	},

	module: {
		type: (value: ModuleValue) => {
			assert.ok(moduleValues.includes(value), 'Invalid module value');
			return value;
		},
		alias: 'm',
		description: `Specify what module code is generated.\none of: ${moduleValues.join(', ')}`,
	},

	allowJs: {
		type: Boolean,
		description: "Allow JavaScript files to be a part of your program. Use the 'checkJS' option to get errors from these files.",
	},

	jsx: {
		type: (value: JsxValue) => {
			assert.ok(jsxValues.includes(value), 'Invalid jsx value');
			return value;
		},
		description: `Specify what JSX code is generated.\none of: ${jsxValues.filter(Boolean).join(', ')}`,
	},

	declaration: {
		type: Boolean,
		alias: 'd',
		description: 'Generate .d.ts files from TypeScript and JavaScript files in your project.',
	},

	sourceMap: {
		type: Boolean,
		description: 'Create source map files for emitted JavaScript files.',
	},

	outDir: {
		type: String,
		description: 'Specify an output folder for all emitted files.',
	},

	noEmit: {
		type: Boolean,
		description: 'Disable emitting files from a compilation.',
	},

	strict: {
		type: Boolean,
		description: 'Enable all strict type-checking options.',
	},

	esModuleInterop: {
		type: Boolean,
		description: 'Emit additional JavaScript to ease support for importing CommonJS modules.',
	},
};

// ── Flag lists for the help document ─────────────────────────────────────
//
// Long names are styled with ANSI blue to replicate the real tsc output.
// Declared as Flag[] directly so help.render can compose them into named
// sections without re-reading the cleye flag config at render time.

const commandLineFlagList: Flag[] = [
	{
		long: blue('--help'),
		short: 'h',
		description: 'Print this message.',
	},
	{
		long: blue('--watch'),
		short: 'w',
		description: 'Watch input files.',
	},
	{
		long: blue('--all'),
		description: 'Show all compiler options.',
	},
	{
		long: blue('--version'),
		short: 'v',
		description: "Print the compiler's version.",
	},
	{
		long: blue('--init'),
		description: 'Initializes a TypeScript project and creates a tsconfig.json file.',
	},
	{
		long: blue('--project'),
		short: 'p',
		arg: 'path',
		description: "Compile the project at the given path or folder with a 'tsconfig.json'.",
	},
	{
		long: blue('--build'),
		short: 'b',
		description: 'Build one or more projects and their dependencies, if out of date.',
	},
	{
		long: blue('--showConfig'),
		description: 'Print the final configuration instead of building.',
	},
];

const compilerOptionFlagList: Flag[] = [
	{
		long: blue('--target'),
		short: 't',
		arg: 'version',
		description: `Set the JavaScript language version for emitted JavaScript.\none of: ${targetValues.join(', ')}`,
	},
	{
		long: blue('--module'),
		short: 'm',
		arg: 'kind',
		description: `Specify what module code is generated.\none of: ${moduleValues.join(', ')}`,
	},
	{
		long: blue('--allowJs'),
		description: 'Allow JavaScript files to be part of your program.',
	},
	{
		long: blue('--jsx'),
		arg: 'kind',
		description: `Specify what JSX code is generated.\none of: ${jsxValues.filter(Boolean).join(', ')}`,
	},
	{
		long: blue('--declaration'),
		short: 'd',
		description: 'Generate .d.ts files from TypeScript and JavaScript files.',
	},
	{
		long: blue('--sourceMap'),
		description: 'Create source map files for emitted JavaScript files.',
	},
	{
		long: blue('--outDir'),
		arg: 'dir',
		description: 'Specify an output folder for all emitted files.',
	},
	{
		long: blue('--noEmit'),
		description: 'Disable emitting files from a compilation.',
	},
	{
		long: blue('--strict'),
		description: 'Enable all strict type-checking options.',
	},
	{
		long: blue('--esModuleInterop'),
		description: 'Emit additional JavaScript to ease support for importing CommonJS modules.',
	},
];

// ── Common commands text (replicates the COMMON COMMANDS block) ───────────

const commonCommandsText = [
	`${blue('tsc')}`,
	'Compiles the current project (tsconfig.json in the working directory.)',
	'',
	`${blue('tsc app.ts util.ts')}`,
	'Ignoring tsconfig.json, compiles the specified files with default compiler options.',
	'',
	`${blue('tsc -b')}`,
	'Build a composite project in the working directory.',
	'',
	`${blue('tsc --init')}`,
	'Creates a tsconfig.json with the recommended settings in the working directory.',
	'',
	`${blue('tsc -p ./path/to/tsconfig.json')}`,
	'Compiles the TypeScript project located at the specified path.',
	'',
	`${blue('tsc --noEmit')}`,
	`${blue('tsc --target esnext')}`,
	'Compiles the current project, with additional settings.',
].join('\n');

await cli({
	flags: {
		...commandLineFlags,
		...commonCompilerOptions,
	},

	help: {
		render() {
			return render(
				p('tsc: The TypeScript Compiler - Version 0.0.0'),
				usage('tsc', '[options] [file...]'),
				section('COMMON COMMANDS', footer(commonCommandsText)),
				section('COMMAND LINE FLAGS', flags(commandLineFlagList)),
				section('COMMON COMPILER OPTIONS', flags(compilerOptionFlagList)),
				footer('You can learn about all of the compiler options at https://aka.ms/tsconfig-reference'),
			);
		},
	},
}, () => {
	console.log('would run tsc...');
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
