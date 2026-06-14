import path from 'node:path';
import { typeFlag } from 'type-flag';
import type {
	CallbackFunction,
	CliOptions,
	HelpForm,
	ParsedArgv,
	HelpOptions,
	StrictOptions,
} from './types.ts';
import { defaultHelp } from './render/default-help.ts';
import { renderToString } from './render/render.ts';
import { AUTO_FLAG, resolveAutoFlags } from './utils/auto-flags.ts';
import { unwrapDescribedDefaults } from './utils/flag-defaults.ts';
import { CleyeExit } from './utils/cleye-exit.ts';
import { isThenable, isModuleWithDefault } from './utils/promise-helpers.ts';
import { findClosest } from './utils/find-closest.ts';
import {
	END_OF_FLAGS,
	parseParameters,
	checkDuplicateParameters,
	type ParsedParameter,
} from './utils/parse-parameters.ts';
import { buildNameIndex, getFlagAlias, type NameIndex } from './utils/build-name-index.ts';
import { getCliContext, runWithCliContext, type CliContext } from './async-context.ts';

const mapParametersToArguments = (
	parameters: ParsedParameter[],
	cliArguments: string[],
	showHelp: () => void,
): Record<string, string | string[]> => {
	const mapping: Record<string, string | string[]> = Object.create(null);
	for (let i = 0; i < parameters.length; i += 1) {
		const {
			name, camelCaseName, required, spread,
		} = parameters[i];

		const value = spread ? cliArguments.slice(i) : cliArguments[i];

		if (
			required
			&& (value === undefined || (spread && value.length === 0))
		) {
			console.error(`Error: Missing required parameter "${name}"\n`);
			showHelp();
			throw new CleyeExit(1, 'missing-required-parameter');
		}

		mapping[camelCaseName] = value;

		if (spread) {
			break;
		}
	}
	return mapping;
};

/**
 * Bind positional argv tokens to the user's parameter declarations, including
 * the `--` end-of-flags split when present. Validates (parse-time) that no
 * two declared parameter names collide on camelCase, then (map-time) that
 * required parameters got values. Returns the camelCased mapping; the caller
 * installs it onto `parsed._`.
 */
const applyParameters = (
	rawParameters: string[],
	positionals: string[],
	eofPositionals: string[],
	showHelp: () => void,
): Record<string, string | string[]> => {
	const hasEof = rawParameters.indexOf(END_OF_FLAGS);
	const hasEofSplit = hasEof !== -1 && hasEof < rawParameters.length - 1;

	const parameters = hasEofSplit ? rawParameters.slice(0, hasEof) : rawParameters;
	const eofParameters = hasEofSplit ? rawParameters.slice(hasEof + 1) : [];
	let cliArguments = positionals;
	if (hasEofSplit && eofPositionals.length > 0) {
		cliArguments = positionals.slice(0, -eofPositionals.length);
	}

	const preEofParsed = parseParameters(parameters);
	const eofParsed = hasEofSplit ? parseParameters(eofParameters) : [];
	checkDuplicateParameters(hasEofSplit ? [...preEofParsed, ...eofParsed] : preEofParsed);

	const mapping = mapParametersToArguments(preEofParsed, cliArguments, showHelp);
	if (hasEofSplit) {
		Object.assign(mapping, mapParametersToArguments(eofParsed, eofPositionals, showHelp));
	}

	return mapping;
};

type Handler = (...arguments_: unknown[]) => unknown;

type MatchedCommand = {
	name: string;
	handler: Handler;
};

/**
 * Build a " (Did you mean X?)" / " (Did you mean X (alias for Y)?)" suggestion
 * clause from a `findClosest` result. The caller pre-renders the primary and
 * alias-target tokens for its surface (quoted command names vs dashed flags),
 * so the grammar lives in one place while formatting stays caller-specific.
 */
const buildDidYouMean = (primary: string, aliasTarget?: string): string => (
	aliasTarget
		? ` (Did you mean ${primary} (alias for ${aliasTarget})?)`
		: ` (Did you mean ${primary}?)`
);

/**
 * Build the `runCommand` closure exposed on `parsed` plus a `hasBeenCalled`
 * probe used by the callback path to skip auto-invoke when the user already
 * invoked it themselves (preserves fire-and-forget semantics for unhandled
 * rejections in user code).
 *
 * Each `runCommand` call invokes the matched handler. When no command matched,
 * returns a no-op that yields `undefined` synchronously so
 * `await parsed.runCommand()` is harmless.
 *
 * The handler invocation runs inside an AsyncLocalStorage context so nested
 * `cli()` calls in the handler see the parent's argv and inherit options.
 * Handlers returning a `{ default: fn }` shape (the dynamic-import / loader
 * pattern) get auto-unwrapped, both sync and async.
 */
const createRunCommand = (
	matchedCommand: MatchedCommand | undefined,
	argv: string[],
	resolvedOptions: CliOptions,
	commandPath: string,
): {
	runCommand: Handler;
	runCommandHasBeenCalled: () => boolean;
} => {
	let runCommandCalled = false;
	const runCommandHasBeenCalled = () => runCommandCalled;

	if (!matchedCommand) {
		return {
			runCommand: () => undefined,
			runCommandHasBeenCalled,
		};
	}

	const context: CliContext = {
		name: matchedCommand.name,
		// Accumulate the full invocation path from the matched command names
		// (what the user types), so nested help can render `npm config get`.
		// Guard the empty-root case (unnamed root CLI) so no leading space
		// leaks into the path and propagates to descendants.
		command: commandPath ? `${commandPath} ${matchedCommand.name}` : matchedCommand.name,
		argv: argv.slice(1),
		parentOptions: resolvedOptions,
	};
	const { handler } = matchedCommand;

	const runCommand: Handler = (...handlerArguments) => {
		runCommandCalled = true;

		return runWithCliContext(context, () => {
			const handlerReturn = handler(...handlerArguments);
			if (isThenable(handlerReturn)) {
				return handlerReturn.then(awaited => (
					isModuleWithDefault(awaited)
						? awaited.default(...handlerArguments)
						: awaited
				));
			}
			return isModuleWithDefault(handlerReturn)
				? handlerReturn.default(...handlerArguments)
				: handlerReturn;
		});
	};

	return {
		runCommand,
		runCommandHasBeenCalled,
	};
};

/**
 * Build the `showHelp` closure exposed on `parsed`. Resolves the user's
 * custom renderer (if any) or falls back to `defaultHelp`, and joins the
 * resulting `Node[]` (or accepts a pre-rendered `string`).
 */
const createShowHelp = (
	options: CliOptions,
	effectiveName: string,
	commandPath: string,
	flags: Record<string, unknown>,
	help: CliOptions['help'],
) => (helpOptions?: HelpOptions, form: HelpForm = 'long'): void => {
	// A function `help` is resolved lazily here (only when help is shown) with
	// the leaf name, full command path, and version.
	const resolvedHelp = typeof help === 'function'
		? help({
			name: effectiveName,
			command: commandPath,
			version: options.version,
		})
		: help;
	const effectiveHelp = typeof resolvedHelp === 'object' && helpOptions
		? {
			...resolvedHelp,
			...helpOptions,
			render: helpOptions.render ?? resolvedHelp.render,
		}
		: helpOptions ?? resolvedHelp;
	const effectiveOptions = {
		...options,
		// Render the header and auto-usage against the full invocation path so
		// a subcommand shows `npm config get`, not just the leaf `get`.
		name: commandPath,
		flags,
		...(effectiveHelp === undefined ? {} : { help: effectiveHelp }),
	} as CliOptions;
	const renderFunction = (typeof effectiveHelp === 'object' && effectiveHelp?.render) ? effectiveHelp.render : defaultHelp;
	console.log(renderToString(renderFunction(effectiveOptions, { form })));
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

	const hasParameters = (options.parameters?.length ?? 0) > 0;

	// Required parameters can't coexist with commands — when a command matches,
	// parameter validation is skipped, so the "required" annotation would only
	// fire in the fallback path. Force optional declarations instead.
	//
	// strictCommands and parameters are also semantically opposed: strictCommands
	// errors on unknown leading positionals, parameters absorbs them. Letting
	// both be set silently neuters strictCommands. Throw to make the conflict
	// explicit. (Inherited strictCommands is allowed — declaring parameters at
	// a child level implicitly overrides it for that level.)
	if (
		options.commands
		&& Object.keys(options.commands).length > 0
		&& hasParameters
	) {
		const hasRequiredParameter = options.parameters!.some(
			parameter => parameter.startsWith('<') && parameter.endsWith('>'),
		);
		if (hasRequiredParameter) {
			throw new Error('Required parameters cannot be used with commands');
		}
		if (options.strictCommands) {
			throw new Error('strictCommands cannot be used with parameters');
		}
	}

	// Check AsyncLocalStorage for parent context. Copy the source argv —
	// type-flag mutates its argv input as a low-level filter feature, and
	// we don't want to leak that to the caller's (or parent's) array.
	// `process.argv.slice(2)` is already a fresh array, no extra copy needed.
	const parentContext = getCliContext();
	const argv = argvInput?.slice() ?? parentContext?.argv.slice() ?? process.argv.slice(2);
	const parentOptions = parentContext?.parentOptions;
	const throwOnExit = options.throwOnExit ?? parentOptions?.throwOnExit ?? false;
	const booleanFlagNegation = options.booleanFlagNegation ?? parentOptions?.booleanFlagNegation;

	const handleExit = (error: unknown): never => {
		if (error instanceof CleyeExit && !throwOnExit) {
			return process.exit(error.code);
		}
		throw error;
	};

	try {
		const effectiveName = options.name ?? parentContext?.name ?? path.basename(process.argv[1] ?? '');
		// Full invocation path: the parent's accumulated path, or — at the
		// root — just this CLI's own name. Threaded into child contexts so
		// nested help renders the complete command (`npm config get`).
		const commandPath = parentContext?.command ?? effectiveName;

		const commandIndex: NameIndex = options.commands
			? buildNameIndex(
				options.commands,
				entry => (typeof entry === 'object' ? entry.alias : undefined),
				(alias) => {
					throw new Error(`Duplicate command alias: "${alias}"`);
				},
			)
			: {
				names: new Set(),
				aliases: new Map(),
			};

		let hitCommand = false;
		let firstPositionalSeen = false;

		// Parse flags
		const flags = { ...options.flags };

		// Auto-version/auto-help logic only fires for the names cleye actually
		// injected — if the user claimed `version`, `help`, or `h` (as a name
		// OR an alias), cleye stays out of the way.
		const injectedFlags = resolveAutoFlags(flags, options);
		const { help } = options;

		const parseFlags = unwrapDescribedDefaults(flags);

		const parsed = typeFlag(
			parseFlags,
			argv,
			{
				// `hitCommand` flips on the first positional IF it is a known
				// command. From then on, every remaining token is preserved
				// verbatim in argv for the matched command's handler. If the
				// first positional is unknown, we continue parsing so parent
				// flags appearing after it are extracted.
				ignore(type, flagOrArgv, value) {
					if (hitCommand) {
						return true;
					}

					const ignored = options.ignoreArgv?.(type, flagOrArgv, value);
					if (ignored) {
						return true;
					}

					if (type === 'argument' && !firstPositionalSeen) {
						firstPositionalSeen = true;
						if (commandIndex.names.has(flagOrArgv)) {
							hitCommand = true;
							return true;
						}
					}

					return false;
				},
				booleanNegation: booleanFlagNegation,
			},
		);

		const showVersion = () => {
			if (options.version !== undefined) {
				console.log(options.version);
			}
		};
		const showHelp = createShowHelp(options, effectiveName, commandPath, flags, help);

		let matchedCommand: MatchedCommand | undefined;

		if (hitCommand && argv.length > 0) {
			const potentialCommand = argv[0];
			const resolvedName = Object.hasOwn(options.commands!, potentialCommand)
				? potentialCommand
				: commandIndex.aliases.get(potentialCommand);
			if (resolvedName) {
				const entry = options.commands![resolvedName];
				matchedCommand = {
					name: resolvedName,
					handler: typeof entry === 'function' ? entry : entry.loader,
				};
			}
		}

		// Strict commands: when a command was expected but none matched, suggest
		// the closest known command/alias and exit.
		const strictCommands = options.strictCommands ?? parentOptions?.strictCommands;
		const positional = hitCommand ? argv[0] : parsed._[0];
		if (
			strictCommands
			&& !matchedCommand
			&& options.commands
			&& commandIndex.names.size > 0
			&& positional
			&& !hasParameters
		) {
			const match = findClosest(positional, commandIndex.names, commandIndex.aliases);
			const suggestion = match
				? buildDidYouMean(`"${match.name}"`, match.aliasFor ? `"${match.aliasFor}"` : undefined)
				: '';
			console.error(`Error: Unknown command: "${positional}".${suggestion}`);
			throw new CleyeExit(1, 'unknown-command');
		}

		// Auto-exits: `--help` wins over `-h` when both are present (long form
		// is more informative). The throws short-circuit cli(); the outer catch
		// either calls `process.exit` or rethrows depending on `throwOnExit`.
		const parsedFlags = parsed.flags as Record<string, unknown>;
		if (injectedFlags.has(AUTO_FLAG.version) && parsedFlags.version === true) {
			showVersion();
			throw new CleyeExit(0, 'version');
		}
		if (injectedFlags.has(AUTO_FLAG.help) && parsedFlags.help === true) {
			showHelp(undefined, 'long');
			throw new CleyeExit(0, 'help');
		}
		if (injectedFlags.has(AUTO_FLAG.helpShort) && parsedFlags.h === true) {
			showHelp(undefined, 'short');
			throw new CleyeExit(0, 'help');
		}

		// Strict flags: error on any unknown flag, suggesting the closest known
		// flag/alias by Levenshtein distance ≤ 2.
		const strictFlags = options.strictFlags ?? parentOptions?.strictFlags;
		if (strictFlags) {
			const unknownFlagNames = Object.keys(parsed.unknownFlags);
			if (unknownFlagNames.length > 0) {
				const flagIndex = buildNameIndex(flags, getFlagAlias);
				for (const flag of unknownFlagNames) {
					const match = findClosest(flag, flagIndex.names, flagIndex.aliases);
					const suggestion = match
						? buildDidYouMean(
							match.aliasFor ? `-${match.name}` : `--${match.name}`,
							match.aliasFor ? `--${match.aliasFor}` : undefined,
						)
						: '';
					console.error(`Error: Unknown flag: --${flag}.${suggestion}`);
				}
				throw new CleyeExit(1, 'unknown-flag');
			}
		}

		if (options.parameters) {
			const mapping = applyParameters(
				options.parameters as string[],
				parsed._ as string[],
				parsed._['--'],
				showHelp,
			);
			Object.assign(parsed._, mapping);
		}

		const resolvedOptions: CliOptions = {
			strictFlags,
			strictCommands,
			throwOnExit,
			booleanFlagNegation,
		};

		const { runCommand, runCommandHasBeenCalled } = createRunCommand(
			matchedCommand,
			argv,
			resolvedOptions,
			commandPath,
		);

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
					if (matchedCommand && !runCommandHasBeenCalled()) {
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
		// none matched, show help and exit — unless `parameters` are declared,
		// in which case the unparsed positional is a parameter value, not a
		// missing command.
		if (
			!matchedCommand
			&& options.commands
			&& commandIndex.names.size > 0
			&& !hasParameters
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
