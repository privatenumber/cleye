/**
 * Demo showing how `tsc --help` can be re-implemented with cleye
 *
 * Usage:
 *  npx esno examples/tsc --help
 */

import assert from 'assert';
import { cli } from '#cleye';
import {
	render, section, flags as flagsAtom, p, footer,
} from '#cleye/help/responsive';

// https://github.com/microsoft/TypeScript/blob/7a12909ae3f03b1feed19df2082aa84e5c7a5081/src/executeCommandLine/executeCommandLine.ts#L111
const blue = (string_: string) => `\u001B[94m${string_}\u001B[39m`;

const targetType = ['es3', 'es5', 'es6', 'es2015', 'es2016', 'es2017', 'es2018', 'es2019', 'es2020', 'es2021', 'esnext'];

const moduleTypes = ['none', 'commonjs', 'amd', 'system', 'umd', 'es6', 'es2015', 'es2020', 'esnext'] as const;

const libraryTypes = ['es5', 'es6', 'es2015', 'es7', 'es2016', 'es2017', 'es2018', 'es2019', 'es2020', 'es2021', 'esnext', 'dom', 'dom.iterable', 'webworker', 'webworker.importscripts', 'webworker.iterable', 'scripthost', 'es2015.core', 'es2015.coll ection', 'es2015.generator', 'es2015.iterable', 'es2015.promise', 'es2015.proxy', 'es2015.reflect', 'es2015 .symbol', 'es2015.symbol.wellknown', 'es2016.array.include', 'es2017.object', 'es2017.sharedmemory', 'es2 017.string', 'es2017.intl', 'es2017.typedarrays', 'es2018.asyncgenerator', 'es2018.asynciterable', 'es201 8.intl', 'es2018.promise', 'es2018.regexp', 'es2019.array', 'es2019.object', 'es2019.string', 'es2019.symbo l', 'es2020.bigint', 'es2020.promise', 'es2020.sharedmemory', 'es2020.string', 'es2020.symbol.wellknown', 'es2020.intl', 'es2021.promise', 'es2021.string', 'es2021.weakref', 'esnext.array', 'esnext.symbol', 'esnext .asynciterable', 'esnext.intl', 'esnext.bigint', 'esnext.string', 'esnext.promise', 'esnext.weakref'] as const;

const jsxTypes = [undefined, 'preserve', 'react-native', 'react', 'react-jsx', 'react-jsxdev'] as const;

const commandLineFlags = {
	help: {
		type: Boolean,
		alias: 'h',
		description: 'Print this message.',
	},
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
		description: 'Print the compiler\'s version.',
	},
	init: {
		type: Boolean,
		description: 'Initializes a TypeScript project and creates a tsconfig.json file.',
	},
	project: {
		type: Boolean,
		alias: 'p',
		description: 'Compile the project given the path to its configuration file, or to a folder with a \'tsconfig.json\'.',
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
	pretty: {
		type: Boolean,
		description: 'Enable color and formatting in TypeScript\'s output to make compiler errors easier to read',
		default: true,
	},

	target: {
		type: (value: typeof targetType[number]) => {
			assert.ok(targetType.includes(value), 'Invalid target type');
			return value;
		},
		alias: 't',
		description: `Set the JavaScript language version for emitted JavaScript and include compatible library declarations.\none of: ${targetType.join(', ')}`,
		default: 'ES3',
	},

	module: {
		type: (value: typeof moduleTypes[number]) => {
			assert.ok(moduleTypes.includes(value), 'Invalid module type');
			return value;
		},
		alias: 'm',
		description: `Specify what module code is generated.\none of: ${moduleTypes.join(', ')}`,
	},

	lib: {
		type: [
			(value: typeof libraryTypes[number]) => {
				assert.ok(libraryTypes.includes(value), 'Invalid library type');
				return value;
			},
		] as const,
		description: `Specify a set of bundled library declaration files that describe the target runtime environment.\none or more: ${libraryTypes.join(', ')}`,
	},

	allowJs: {
		type: Boolean,
		description: 'Allow JavaScript files to be a part of your program. Use the `checkJS` option to get errors from these files.',

	},

	checkJs: {
		type: Boolean,
		description: 'Enable error reporting in type-checked JavaScript files.',
	},

	jsx: {
		type: (value: typeof jsxTypes[number]) => {
			assert.ok(jsxTypes.includes(value), 'Invalid jsx type');
			return value;
		},
		description: `Specify what JSX code is generated.\none of: ${jsxTypes.join(', ')}`,
	},

	declaration: {
		type: Boolean,
		alias: 'd',
		description: 'Generate .d.ts files from TypeScript and JavaScript files in your project.',
	},

	declarationMap: {
		type: Boolean,
		description: 'Create sourcemaps for d.ts files.',
	},

	emitDeclarationOnly: {
		type: Boolean,
		description: 'Only output d.ts files and not JavaScript files.',
	},

	sourceMap: {
		type: Boolean,
		description: 'Create source map files for emitted JavaScript files.',
	},

	outFile: {
		type: String,
		description: 'Specify a file that bundles all outputs into one JavaScript file. If `declaration` is true, also designates a file that bundles all .d.ts output.',
	},

	outDir: {
		type: String,
		description: 'Specify an output folder for all emitted files.',
	},

	removeComments: {
		type: Boolean,
		description: 'Disable emitting comments.',
	},

	noEmit: {
		type: Boolean,
		description: 'Disable emitting files from a compilation.',
	},

	strict: {
		type: Boolean,
		description: 'Enable all strict type-checking options.',
	},

	types: {
		type: String,
		description: 'Specify type package names to be included without being referenced in a source file.',
	},

	esModuleInterop: {
		type: Boolean,
		description: 'Emit additional JavaScript to ease support for importing CommonJS modules. This enables `allowSyntheticDefaultImports` for type compatibility.',
	},
};

await cli({
	flags: {
		...commandLineFlags,
		...commonCompilerOptions,
	},

	help: {
		usage: false,
		examples: [
			blue('tsc'),
			'Compiles the current project (tsconfig.json in the working directory.)',

			'',

			blue('tsc app.ts util.ts'),
			'Ignoring tsconfig.json, compiles the specified files with default compiler options.',

			'',

			blue('tsc -b'),
			'Build a composite project in the working directory.',

			'',

			blue('tsc --init'),
			'Creates a tsconfig.json with the recommended settings in the working directory.',

			'',

			blue('tsc -p ./path/to/tsconfig.json'),
			'Compiles the TypeScript project located at the specified path.',

			'',

			blue('tsc --help --all'),
			'An expanded version of this information, showing all possible compiler options',

			'',

			blue('tsc --noEmit'),
			blue('tsc --target esnext'),
			'Compiles the current project, with additional settings.',
		],

		render(options) {
			const allFlags = options.flags ?? {};
			const help = typeof options.help === 'object' ? options.help : {};
			const examplesText = Array.isArray(help.examples) ? help.examples.join('\n') : (help.examples ?? '');

			// Convert a flag config to an atom Flag, with blue-styled long name
			const toFlag = (flagName: string) => {
				const config = allFlags[flagName];
				const cfg = (config && typeof config === 'object' && !Array.isArray(config) && typeof config !== 'function')
					? config as Record<string, unknown>
					: { type: config };
				const type = cfg.type ?? config;
				const isBoolean = type === Boolean;
				const argument = isBoolean ? undefined : 'value';
				const short = 'alias' in cfg && typeof cfg.alias === 'string' ? cfg.alias : undefined;
				return {
					long: blue(`--${flagName.replaceAll(/([A-Z])/g, '-$1').toLowerCase()}`),
					short,
					arg: argument,
					description: 'description' in cfg && typeof cfg.description === 'string' ? cfg.description : undefined,
				};
			};

			const cmdFlagList = Object.keys(commandLineFlags).map(toFlag);
			const compilerFlagList = Object.keys(commonCompilerOptions).map(toFlag);

			return render(
				p('tsc: The TypeScript Compiler - Version 0.0.0'),
				section('COMMON COMMANDS', p(examplesText)),
				section('COMMAND LINE FLAGS', flagsAtom(cmdFlagList)),
				section('COMMON COMPILER OPTIONS', flagsAtom(compilerFlagList)),
				footer('You can learn about all of the compiler options at https://aka.ms/tsconfig-reference'),
			);
		},
	},
}, (argv) => {
	console.log(argv);
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
