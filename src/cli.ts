import path from 'node:path';
import { typeFlag } from 'type-flag';
import { closest, distance } from 'fastest-levenshtein';
import type {
	CallbackFunction,
	CliOptions,
	CommandEntry,
	ParsedArgv,
	HelpOptions,
	StrictOptions,
} from './types.ts';
import { generateHelp, Renderers } from './render-help/index.ts';
import { defaultHelp } from './render/default-help.ts';
import { camelCase } from './utils/convert-case.ts';
import { getCliContext, runWithCliContext, type CliContext } from './async-context.ts';

const { stringify } = JSON;

const specialCharactersPattern = /[|\\{}()[\]^$+*?.]/;

type ParsedParameter = {
	name: string;
	required: boolean;
	spread: boolean;
};

function parseParameters(parameters: string[]) {
	const parsedParameters: ParsedParameter[] = [];

	let hasOptional: string | undefined;
	let hasSpread: string | undefined;

	for (const parameter of parameters) {
		if (hasSpread) {
			throw new Error(`Invalid parameter: Spread parameter ${stringify(hasSpread)} must be last`);
		}

		const firstCharacter = parameter[0];
		const lastCharacter = parameter.at(-1);

		let required: boolean | undefined;
		if (firstCharacter === '<' && lastCharacter === '>') {
			required = true;

			if (hasOptional) {
				throw new Error(`Invalid parameter: Required parameter ${stringify(parameter)} cannot come after optional parameter ${stringify(hasOptional)}`);
			}
		}

		if (firstCharacter === '[' && lastCharacter === ']') {
			required = false;
			hasOptional = parameter;
		}

		if (required === undefined) {
			throw new Error(`Invalid parameter: ${stringify(parameter)}. Must be wrapped in <> (required parameter) or [] (optional parameter)`);
		}

		let name = parameter.slice(1, -1);

		const spread = name.slice(-3) === '...';

		if (spread) {
			hasSpread = parameter;
			name = name.slice(0, -3);
		}

		const invalidCharacter = name.match(specialCharactersPattern);
		if (invalidCharacter) {
			throw new Error(`Invalid parameter: ${stringify(parameter)}. Invalid character found ${stringify(invalidCharacter[0])}`);
		}

		parsedParameters.push({
			name,
			required,
			spread,
		});
	}

	return parsedParameters;
}

function mapParametersToArguments(
	mapping: Record<string, string | string[]>,
	parameters: ParsedParameter[],
	cliArguments: string[],
	showHelp: () => void,
) {
	for (let i = 0; i < parameters.length; i += 1) {
		const { name, required, spread } = parameters[i];
		const camelCaseName = camelCase(name);
		if (camelCaseName in mapping) {
			throw new Error(`Invalid parameter: ${stringify(name)} is used more than once.`);
		}

		const value = spread ? cliArguments.slice(i) : cliArguments[i];

		if (spread) {
			i = parameters.length;
		}

		if (
			required
			&& (!value || (spread && value.length === 0))
		) {
			console.error(`Error: Missing required parameter ${stringify(name)}\n`);
			showHelp();
			return process.exit(1);
		}

		mapping[camelCaseName] = value;
	}
}

function helpEnabled(help: false | undefined | HelpOptions): help is (HelpOptions | undefined) {
	return help !== false;
}

const getKnownFlagNames = (flags: Record<string, unknown>): string[] => {
	const names: string[] = [];
	for (const [name, config] of Object.entries(flags)) {
		names.push(name);
		if (config && typeof config === 'object' && 'alias' in config) {
			const { alias } = config as { alias?: string | string[] };
			if (typeof alias === 'string' && alias) {
				names.push(alias);
			} else if (Array.isArray(alias)) {
				names.push(...alias.filter(Boolean));
			}
		}
	}
	return names;
};

const findClosestFlag = (
	unknown: string,
	knownFlags: string[],
): string | undefined => {
	if (unknown.length < 3 || knownFlags.length === 0) {
		return undefined;
	}
	const match = closest(unknown, knownFlags);
	return distance(unknown, match) <= 2 ? match : undefined;
};

const handleUnknownFlags = (
	unknownFlags: Record<string, unknown>,
	knownFlagNames: string[],
): void => {
	const unknownFlagNames = Object.keys(unknownFlags);
	if (unknownFlagNames.length === 0) {
		return;
	}

	for (const flag of unknownFlagNames) {
		const closestMatch = findClosestFlag(flag, knownFlagNames);
		const suggestion = closestMatch ? ` (Did you mean --${closestMatch}?)` : '';
		console.error(`Error: Unknown flag: --${flag}.${suggestion}`);
	}

	process.exit(1);
};

const getCommandHandler = (entry: CommandEntry): ((argument?: unknown) => unknown) => {
	if (typeof entry === 'function') {
		return entry;
	}
	return entry.loader;
};

type CommandIndex = {
	names: Set<string>;
	aliases: Map<string, string>;
};

const buildCommandIndex = (commands: Record<string, CommandEntry>): CommandIndex => {
	const names = new Set<string>();
	const aliases = new Map<string, string>();
	for (const [name, entry] of Object.entries(commands)) {
		names.add(name);
		if (typeof entry === 'object' && entry.alias) {
			const entryAliases = Array.isArray(entry.alias) ? entry.alias : [entry.alias];
			for (const alias of entryAliases) {
				if (aliases.has(alias)) {
					throw new Error(`Duplicate command alias: ${stringify(alias)}`);
				}
				names.add(alias);
				aliases.set(alias, name);
			}
		}
	}
	return {
		names,
		aliases,
	};
};

const resolveCommand = (
	potentialCommand: string,
	commands: Record<string, CommandEntry>,
	aliases: Map<string, string>,
): { name: string;
	handler: (argument?: unknown) => unknown; } | undefined => {
	const resolvedName = potentialCommand in commands
		? potentialCommand
		: aliases.get(potentialCommand);

	if (resolvedName) {
		return {
			name: resolvedName,
			handler: getCommandHandler(commands[resolvedName]),
		};
	}

	return undefined;
};

// Overload: with callback
function cli<
	Options extends CliOptions<[...Parameters]>,
	Parameters extends string[],
>(
	options: StrictOptions<Options> & CliOptions<[...Parameters]>,
	callback: CallbackFunction<ParsedArgv<Options, Parameters>>,
	argv?: string[],
): Promise<ParsedArgv<Options, Parameters>>;

// Overload: without callback
function cli<
	Options extends CliOptions<[...Parameters]>,
	Parameters extends string[],
>(
	options: StrictOptions<Options> & CliOptions<[...Parameters]>,
	callback?: undefined,
	argv?: string[],
): Promise<ParsedArgv<Options, Parameters>>;

// General overload
function cli(
	options: CliOptions,
	callback?: CallbackFunction<any>,
	argv?: string[],
): Promise<any>;

async function cli<
	Options extends CliOptions<[...Parameters]>,
	Parameters extends string[],
>(
	options: Options | (Options & CliOptions<[...Parameters]>),
	callback?: CallbackFunction<ParsedArgv<Options, Parameters>>,
	argvInput?: string[],
): Promise<any> {
	if (!options) {
		throw new Error('Options is required');
	}

	// Check AsyncLocalStorage for parent context
	const parentContext = getCliContext();
	const rawArgv = argvInput ?? parentContext?.argv ?? process.argv.slice(2);
	const parentOptions = parentContext?.parentOptions;

	const effectiveName = options.name ?? parentContext?.name ?? path.basename(process.argv[1] ?? '');

	const commandIndex: CommandIndex = options.commands
		? buildCommandIndex(options.commands)
		: {
			names: new Set(),
			aliases: new Map(),
		};

	const argv = rawArgv;
	let hitCommand = false;

	// Parse flags
	const flags = { ...options.flags };
	const isVersionEnabled = options.version && !('version' in flags);

	if (isVersionEnabled) {
		flags.version = {
			type: Boolean,
			description: 'Show version',
		};
	}

	const { help } = options;
	const isHelpEnabled = helpEnabled(help);

	if (isHelpEnabled && !('help' in flags)) {
		flags.help = {
			type: Boolean,
			alias: 'h',
			description: 'Show help',
		};
	}

	const parsed = typeFlag(
		flags,
		argv,
		{
			ignore(type, flagOrArgv, value) {
				if (hitCommand) {
					return true;
				}

				if (type === 'argument' && commandIndex.names.has(flagOrArgv)) {
					hitCommand = true;
					return true;
				}

				return options.ignoreArgv?.(type, flagOrArgv, value);
			},
			booleanNegation: options.booleanFlagNegation ?? parentOptions?.booleanFlagNegation,
		},
	);

	const showVersion = () => {
		console.log(options.version);
	};

	if (
		isVersionEnabled
		&& parsed.flags.version === true
	) {
		showVersion();
		return process.exit(0);
	}

	const showHelp = (helpOptions?: HelpOptions) => {
		const effectiveHelp = helpOptions ?? help;

		if (typeof effectiveHelp === 'object' && effectiveHelp?.render) {
			// Legacy path: user-supplied render function gets the old node tree.
			const helpRenderers = new Renderers();
			const nodes = generateHelp({
				...options,
				name: effectiveName,
				...(helpOptions ? { help: helpOptions } : {}),
				flags,
			});
			console.log(effectiveHelp.render(nodes, helpRenderers));
		} else {
			// New default: atom-based composition.
			console.log(defaultHelp(
				{
					...options,
					name: effectiveName,
					flags,
					...(helpOptions ? { help: helpOptions } : {}),
				},
			));
		}
	};

	if (
		isHelpEnabled
		&& parsed.flags.help === true
	) {
		showHelp();
		return process.exit(0);
	}

	// Strict flags
	const strictFlags = options.strictFlags ?? parentOptions?.strictFlags;
	if (strictFlags) {
		handleUnknownFlags(parsed.unknownFlags, getKnownFlagNames(flags));
	}

	// Map parameters
	if (options.parameters) {
		let parameters = options.parameters as string[];
		let cliArguments = parsed._ as string[];
		const hasEof = parameters.indexOf('--');
		const eofParameters = parameters.slice(hasEof + 1);
		const mapping: Record<string, string | string[]> = Object.create(null);

		let eofArguments: string[] = [];
		if (hasEof > -1 && eofParameters.length > 0) {
			parameters = parameters.slice(0, hasEof);
			eofArguments = parsed._['--'];
			cliArguments = cliArguments.slice(0, -eofArguments.length || undefined);
		}

		mapParametersToArguments(
			mapping,
			parseParameters(parameters),
			cliArguments,
			showHelp,
		);

		if (hasEof > -1 && eofParameters.length > 0) {
			mapParametersToArguments(
				mapping,
				parseParameters(eofParameters),
				eofArguments,
				showHelp,
			);
		}

		Object.assign(
			parsed._,
			mapping,
		);
	}

	let matchedCommand: {
		name: string;
		handler: (argument?: unknown) => unknown;
	} | undefined;

	if (hitCommand && argv.length > 0) {
		matchedCommand = resolveCommand(argv[0], options.commands!, commandIndex.aliases);
	}

	// runCommand is callable at most once — subsequent calls return the same promise
	let runCommandPromise: Promise<void> | undefined;
	let runCommandCalled = false;

	const resolvedOptions: CliOptions = {
		strictFlags,
		booleanFlagNegation: options.booleanFlagNegation ?? parentOptions?.booleanFlagNegation,
	};

	const runCommand = matchedCommand
		? (handlerArgument?: unknown) => {
			if (!runCommandCalled) {
				runCommandCalled = true;
				const commandArgv = argv.slice(1);
				const context: CliContext = {
					name: matchedCommand!.name,
					argv: commandArgv,
					parentOptions: resolvedOptions,
				};
				runCommandPromise = (async () => {
					const result = await runWithCliContext(
						context,
						() => matchedCommand!.handler(handlerArgument),
					);

					// `loader: () => import('./cmd.ts')` resolves to a module namespace;
					// call its default export as the handler if present.
					if (
						result
						&& typeof result === 'object'
						&& 'default' in result
						&& typeof result.default === 'function'
					) {
						await result.default(handlerArgument);
					}
				})();
			}
			return runCommandPromise!;
		}
		: undefined;

	const result = {
		...parsed,
		command: matchedCommand?.name,
		runCommand,
		showHelp,
		showVersion,
	};

	if (typeof callback === 'function') {
		await callback(result as any, runCommand);
	}

	if (runCommand && !runCommandCalled) {
		await runCommand();
	} else if (
		!matchedCommand
		&& options.commands
		&& commandIndex.names.size > 0
		&& typeof callback !== 'function'
	) {
		showHelp();
		process.exit(1);
	}

	return result;
}

export { cli };
