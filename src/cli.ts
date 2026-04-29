import path from 'node:path';
import { typeFlag } from 'type-flag';
import { distance } from 'fastest-levenshtein';
import type {
	CallbackFunction,
	CliOptions,
	CommandEntry,
	ExitReason,
	HelpForm,
	ParsedArgv,
	HelpOptions,
	StrictOptions,
} from './types.ts';
import { defaultHelp } from './render/default-help.ts';
import { render } from './render/render.ts';
import { autoFlagLongHelp, autoFlagShortHelp, autoFlagVersion } from './utils/auto-flags.ts';
import { camelCase } from './utils/convert-case.ts';
import { getCliContext, runWithCliContext, type CliContext } from './async-context.ts';

const { stringify } = JSON;

/**
 * Thrown by `cli()` at every internal exit point — `--help`, `--version`,
 * missing required parameters, `strictFlags`, `strictCommands`, and the sync
 * no-command-match path. By default cli() catches this and calls
 * `process.exit(code)`; setting `throwOnExit: true` lets it propagate so
 * library users can catch and decide how the host process responds.
 */
export class CleyeExit extends Error {
	name = 'CleyeExit' as const;

	code: number;

	reason: ExitReason;

	constructor(code: number, reason: ExitReason) {
		super(`cleye exited with code ${code} (${reason})`);
		this.code = code;
		this.reason = reason;
	}
}

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
			&& (value === undefined || (spread && value.length === 0))
		) {
			console.error(`Error: Missing required parameter ${stringify(name)}\n`);
			showHelp();
			throw new CleyeExit(1, 'missing-required-parameter');
		}

		mapping[camelCaseName] = value;
	}
}

function helpEnabled(help: false | undefined | HelpOptions): help is (HelpOptions | undefined) {
	return help !== false;
}

type NameIndex = {
	names: string[];
	aliases: Map<string, string>;
};

const indexFlags = (flags: Record<string, unknown>): NameIndex => {
	const names: string[] = [];
	const aliases = new Map<string, string>();
	for (const [name, config] of Object.entries(flags)) {
		names.push(name);
		if (config && typeof config === 'object' && 'alias' in config) {
			const { alias } = config as { alias?: string | string[] };
			const list = typeof alias === 'string' && alias
				? [alias]
				: (Array.isArray(alias) ? alias.filter(Boolean) : []);
			for (const aliasName of list) {
				names.push(aliasName);
				aliases.set(aliasName, name);
			}
		}
	}
	return {
		names,
		aliases,
	};
};

/**
 * Closest-match search aware of canonical-vs-alias status. On a distance tie,
 * prefers the canonical name; when the winner is an alias, surfaces the
 * canonical via `aliasFor` so callers can build "Did you mean X (alias for Y)?"
 * messages. When `aliases` is empty, behaves as a plain closest-match search.
 */
const findClosest = (
	unknown: string,
	names: Iterable<string>,
	aliases: Map<string, string>,
): { name: string;
	aliasFor?: string; } | undefined => {
	if (unknown.length < 3) {
		return undefined;
	}
	let best: { name: string;
		distance: number;
		isAlias: boolean; } | undefined;
	for (const name of names) {
		const candidateDistance = distance(unknown, name);
		if (candidateDistance > 2) {
			continue;
		}
		const isAlias = aliases.has(name);
		if (
			!best
			|| candidateDistance < best.distance
			|| (candidateDistance === best.distance && best.isAlias && !isAlias)
		) {
			best = {
				name,
				distance: candidateDistance,
				isAlias,
			};
		}
	}
	if (!best) {
		return undefined;
	}
	return {
		name: best.name,
		aliasFor: best.isAlias ? aliases.get(best.name) : undefined,
	};
};

const handleUnknownFlags = (
	unknownFlags: Record<string, unknown>,
	flagIndex: NameIndex,
): void => {
	const unknownFlagNames = Object.keys(unknownFlags);
	if (unknownFlagNames.length === 0) {
		return;
	}

	for (const flag of unknownFlagNames) {
		const match = findClosest(flag, flagIndex.names, flagIndex.aliases);
		let suggestion = '';
		if (match) {
			suggestion = match.aliasFor
				? ` (Did you mean -${match.name} (alias for --${match.aliasFor})?)`
				: ` (Did you mean --${match.name}?)`;
		}
		console.error(`Error: Unknown flag: --${flag}.${suggestion}`);
	}

	throw new CleyeExit(1, 'unknown-flag');
};

const getCommandHandler = (entry: CommandEntry): ((...arguments_: unknown[]) => unknown) => {
	if (typeof entry === 'function') {
		return entry;
	}
	return entry.loader;
};

const isThenable = (value: unknown): value is PromiseLike<unknown> => (
	!!value
	&& (typeof value === 'object' || typeof value === 'function')
	&& typeof (value as { then?: unknown }).then === 'function'
);

const isModuleWithDefault = (
	value: unknown,
): value is { default: (...arguments_: unknown[]) => unknown } => (
	!!value
	&& typeof value === 'object'
	&& 'default' in value
	&& typeof (value as { default: unknown }).default === 'function'
);

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
	handler: (...arguments_: unknown[]) => unknown; } | undefined => {
	const resolvedName = potentialCommand in commands
		? potentialCommand
		: aliases.get(potentialCommand);

	if (resolvedName) {
		return {
			name: resolvedName,
			handler: getCommandHandler(commands[resolvedName]),
		};
	}
};

// Overload: with callback — async, resolves to the callback's return value
function cli<
	Options extends CliOptions<[...Parameters]>,
	Parameters extends string[],
	CallbackReturn,
>(
	options: StrictOptions<Options> & CliOptions<[...Parameters]>,
	callback: CallbackFunction<ParsedArgv<Options, Parameters>, CallbackReturn>,
	argv?: string[],
): Promise<CallbackReturn>;

// Overload: without callback — sync, returns parsed argv directly
function cli<
	Options extends CliOptions<[...Parameters]>,
	Parameters extends string[],
>(
	options: StrictOptions<Options> & CliOptions<[...Parameters]>,
	callback?: undefined,
	argv?: string[],
): ParsedArgv<Options, Parameters>;

// General overload
function cli(
	options: CliOptions,
	callback?: CallbackFunction<any, any>,
	argv?: string[],
): any;

function cli<
	Options extends CliOptions<[...Parameters]>,
	Parameters extends string[],
>(
	options: Options | (Options & CliOptions<[...Parameters]>),
	callback?: CallbackFunction<ParsedArgv<Options, Parameters>>,
	argvInput?: string[],
): any {
	if (!options) {
		throw new Error('Options is required');
	}

	if (
		(options.parameters?.length ?? 0) > 0
		&& options.commands && Object.keys(options.commands).length > 0
	) {
		throw new Error('cleye: `parameters` and `commands` are mutually exclusive at the same level. To accept arbitrary command names, omit `parameters` and inspect `parsed.command === undefined` with `parsed._[0]` in your callback.');
	}

	// Check AsyncLocalStorage for parent context
	const parentContext = getCliContext();
	const rawArgv = argvInput ?? parentContext?.argv ?? process.argv.slice(2);
	const parentOptions = parentContext?.parentOptions;
	const throwOnExit = options.throwOnExit ?? parentOptions?.throwOnExit ?? false;

	const handleExit = (error: unknown): never => {
		if (error instanceof CleyeExit && !throwOnExit) {
			return process.exit(error.code);
		}
		throw error;
	};

	try {
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

		// Track which flags cleye auto-injected. Auto-version/auto-help logic
		// only fires for injected flags — if the user defined `version`, `help`,
		// or `h` themselves (as a flag name OR an alias), cleye stays out of
		// the way.
		const injectedFlags = new Set<'version' | 'help' | 'h'>();
		const userFlagNames = new Set(indexFlags(flags).names);

		if (options.version && !userFlagNames.has('version')) {
			flags.version = autoFlagVersion;
			injectedFlags.add('version');
		}

		const { help } = options;
		const isHelpEnabled = helpEnabled(help);

		if (isHelpEnabled && !userFlagNames.has('h')) {
			flags.h = autoFlagShortHelp;
			injectedFlags.add('h');
		}

		if (isHelpEnabled && !userFlagNames.has('help')) {
			flags.help = autoFlagLongHelp;
			injectedFlags.add('help');
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
			injectedFlags.has('version')
		&& parsed.flags.version === true
		) {
			showVersion();
			throw new CleyeExit(0, 'version');
		}

		const showHelp = (helpOptions?: HelpOptions, form: HelpForm = 'long') => {
			const effectiveHelp = helpOptions ?? help;

			const effectiveOptions = {
				...options,
				name: effectiveName,
				flags,
				...(helpOptions ? { help: helpOptions } : {}),
			};
			const renderFunction = (typeof effectiveHelp === 'object' && effectiveHelp?.render) ? effectiveHelp.render : defaultHelp;
			const result = renderFunction(effectiveOptions, { form });
			let output: string;
			if (typeof result === 'string') {
				output = result;
			} else if (Array.isArray(result)) {
				output = render(...result);
			} else {
				output = render(result);
			}
			console.log(output);
		};

		const parsedFlags = parsed.flags as Record<string, unknown>;

		if (injectedFlags.has('help') && parsedFlags.help === true) {
		// --help wins over -h when both are present (long form is more informative)
			showHelp(undefined, 'long');
			throw new CleyeExit(0, 'help');
		}

		if (injectedFlags.has('h') && parsedFlags.h === true) {
			showHelp(undefined, 'short');
			throw new CleyeExit(0, 'help');
		}

		// Strict flags
		const strictFlags = options.strictFlags ?? parentOptions?.strictFlags;
		if (strictFlags) {
			handleUnknownFlags(parsed.unknownFlags, indexFlags(flags));
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
			handler: (...arguments_: unknown[]) => unknown;
		} | undefined;

		if (hitCommand && argv.length > 0) {
			matchedCommand = resolveCommand(argv[0], options.commands!, commandIndex.aliases);
		}

		const strictCommands = options.strictCommands ?? parentOptions?.strictCommands;
		if (
			strictCommands
		&& !matchedCommand
		&& options.commands
		&& commandIndex.names.size > 0
		) {
			const potentialCommand = (parsed._ as string[])[0];
			if (potentialCommand) {
				const match = findClosest(potentialCommand, commandIndex.names, commandIndex.aliases);
				let suggestion = '';
				if (match) {
					suggestion = match.aliasFor
						? ` (Did you mean "${match.name}" (alias for "${match.aliasFor}")?)`
						: ` (Did you mean "${match.name}"?)`;
				}
				console.error(`Error: Unknown command: "${potentialCommand}".${suggestion}`);
				throw new CleyeExit(1, 'unknown-command');
			}
		}

		// runCommand is idempotent — repeated calls return the same value
		// (Promise or sync, mirroring the handler's shape).
		let runCommandResult: unknown;
		let runCommandCalled = false;

		const resolvedOptions: CliOptions = {
			strictFlags,
			strictCommands,
			throwOnExit,
			booleanFlagNegation: options.booleanFlagNegation ?? parentOptions?.booleanFlagNegation,
		};

		const runCommand = (...handlerArguments: unknown[]): unknown => {
		// No matched command — runCommand is a callable noop. Returns
		// `undefined` synchronously; `await undefined` is a no-op so callers
		// can still write `await argv.runCommand()` if they want symmetry.
			if (!matchedCommand) {
				return undefined;
			}
			if (runCommandCalled) {
				return runCommandResult;
			}
			runCommandCalled = true;
			const commandArgv = argv.slice(1);
			const context: CliContext = {
				name: matchedCommand.name,
				argv: commandArgv,
				parentOptions: resolvedOptions,
			};

			// Wrap the entire chain — handler invocation AND any default-unwrap —
			// in `runWithCliContext` so module-default callees see the context
			// via `getCliContext()`. AsyncLocalStorage propagates through `.then`
			// callbacks attached inside the run.
			runCommandResult = runWithCliContext(context, () => {
				const handlerReturn = matchedCommand.handler(...handlerArguments);

				// Async handler / loader pattern — chain through Promise.
				// Module-namespace `{ default: fn }` returns are unwrapped.
				if (isThenable(handlerReturn)) {
					return handlerReturn.then(awaited => (
						isModuleWithDefault(awaited)
							? awaited.default(...handlerArguments)
							: awaited
					));
				}

				// Sync handler. Unwrap a module-with-default if returned.
				return isModuleWithDefault(handlerReturn)
					? handlerReturn.default(...handlerArguments)
					: handlerReturn;
			});

			return runCommandResult;
		};

		const result = {
			...parsed,
			command: matchedCommand?.name,
			runCommand,
			showHelp,
			showVersion,
		};

		if (typeof callback === 'function') {
		// Async path: callback runs, then we auto-invoke runCommand if it
		// wasn't already called. Returns the callback's resolved value.
		// This is the ONLY auto-invoke site — the sync (no-callback) path
		// below leaves runCommand for the caller to invoke manually.
			return (async () => {
				try {
					const callbackResult = await callback(result as any);
					if (matchedCommand && !runCommandCalled) {
						await runCommand();
					}
					return callbackResult;
				} catch (error) {
					return handleExit(error);
				}
			})();
		}

		// Sync path: no callback. Caller is responsible for invoking runCommand
		// themselves (`await argv.runCommand()`). If commands are defined and
		// none matched, show help and exit.
		if (
			!matchedCommand
		&& options.commands
		&& commandIndex.names.size > 0
		) {
			showHelp();
			throw new CleyeExit(1, 'no-command-match');
		}

		return result;
	} catch (error) {
		// Callback mode always returns a Promise — convert sync throws to
		// rejections so callers can chain `.catch()`. Without this, exits
		// like --help / strictCommands that fire before the async callback's
		// IIFE would escape as synchronous throws and bypass the chain.
		if (typeof callback === 'function' && error instanceof CleyeExit && throwOnExit) {
			return Promise.reject(error);
		}
		return handleExit(error);
	}
}

export { cli };
