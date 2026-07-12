import type {
	TypeFlag,
	Flags as BaseFlags,
	IgnoreFunction,
} from 'type-flag';
import type { Node } from './render/components.ts';
import type {
	AnyFunction,
	CamelCase,
	DescribedDefault,
	NoopRunCommand,
	ParameterType,
	ResolvedFlags,
	RunCommandFor,
	StripBrackets,
} from './types-internal.ts';

export type { DescribedDefault } from './types-internal.ts';

export type Flags = BaseFlags<{

	/**
	 * Description to be used in help output
	 *
	 * @example
	 * ```
	 * description: 'Unit of output (metric, imperial)',
	 * ```
	 */
	description?: string;

	/**
	 * Placeholder label to be used in help output
	 *
	 * @example Required value
	 * ```
	 * placeholder: '<locale>'
	 * ```
	 */
	placeholder?: string;

	/**
	 * Section title used to group this flag in help output. Prefer the
	 * `group()` helper, which stamps this onto a set of flags for you.
	 */
	group?: string;

	/**
	 * Default value plus display text for help output. `value` is used for
	 * parsing; `description` is rendered in help without executing `value`.
	 * Objects with only `value` or only `description` are plain object defaults.
	 */
	default?: unknown | (() => unknown) | DescribedDefault;
}>;

export type HelpForm = 'short' | 'long';

/**
 * Accepted return shapes for `help.render`:
 *   - `Node[]` — most idiomatic; cleye joins them.
 *   - `Node` — a single node.
 *   - `string` — pre-rendered output (escape hatch).
 */
export type HelpRenderer = (
	options: CliOptions,
	options_: { form: HelpForm },
) => Node | Node[] | string;

export type HelpOptions = {

	/** Version of the script displayed in `--help` output. Use to avoid enabling `--version` flag. */
	version?: string;

	/** Description of the script or command to display in `--help` output. */
	description?: string;

	/** Usage code examples to display in `--help` output. */
	usage?: false | string | string[];

	/** Example code snippets to display in `--help` output. */
	examples?: string | string[];

	/**
	 * Function to customize the help output. Receives the full CLI options
	 * and the resolved render context. Return one of:
	 *
	 *   - `Node[]` — components to compose; cleye joins them with blank lines
	 *   - `Node`   — a single component
	 *   - `string`     — pre-rendered output (escape hatch)
	 *
	 * Composing with the default: `[...defaultHelp(opts, ctx), footer('…')]`.
	 */
	render?: HelpRenderer;
};

/**
 * Context passed to a `help` function, resolved when help is rendered. Lets
 * the script interpolate its own name into `examples`, `usage`, or
 * `description` without repeating it.
 */
export type HelpContext = {

	/** This command's own name (the leaf). For the root CLI, the program name. */
	name: string;

	/**
	 * The full invocation path including parent commands, e.g. `npm config get`.
	 * For the root CLI, this equals `name`.
	 */
	command: string;

	/** The configured version, if any. */
	version?: string;
};

/**
 * A command entry in the commands map.
 *
 * - Shorthand: a function to call when the command is matched.
 * - Full form: an object with metadata for help + a loader function.
 */
export type CommandEntry =
	| AnyFunction
	| {
		description?: string;
		alias?: string | string[];
		loader: AnyFunction;
	};

export type Commands = Record<string, CommandEntry>;

export type CliOptions<
	Parameters extends string[] = string[],
> = {

	/**
	 * Parameters accepted by the script. Parameters must be in the following formats:
	 *
	 * - Required parameter: `<parameter name>`
	 * - Optional parameter: `[parameter name]`
	 * - Required spread parameter: `<parameter name...>`
	 * - Optional spread parameter: `[parameter name...]`
	 *
	 * Names must contain at least one alphanumeric character (after
	 * camelCase normalization).
	 */
	parameters?: Parameters;

	/** Commands to register to the script. */
	commands?: Commands;

	/**
	 * Command name displayed in `--help`. At the entry point this is your bin
	 * name (the command users type); defaults to `basename(process.argv[1])`
	 * when omitted, so set it explicitly for a published CLI. Subcommands derive
	 * their name from the command map automatically — setting it on a nested
	 * command has no effect on the default `--help` (the full command path is
	 * always used).
	 */
	name?: string;

	/** Version of the script displayed in `--version` and `--help` outputs. */
	version?: string;

	/** Flags accepted by the script. */
	flags?: Flags;

	/**
	 * Options to configure the help documentation. Pass in `false` to disable
	 * handling `--help, -h`.
	 *
	 * Can also be a function that receives the resolved {@link HelpContext}
	 * (`name`, `command`, `version`) and returns `HelpOptions`. Useful for
	 * interpolating the command name into `examples`, `usage`, or
	 * `description` without repeating it:
	 *
	 * ```
	 * help: ({ command }) => ({ examples: [`${command} <query>`] })
	 * ```
	 */
	help?: false | HelpOptions | ((context: HelpContext) => HelpOptions);

	/** Which argv elements to ignore from parsing. */
	ignoreArgv?: IgnoreFunction;

	/**
	 * When enabled, prints an error and exits if unknown flags are passed.
	 * Suggests the closest matching flag name when possible.
	 */
	strictFlags?: boolean;

	/**
	 * When enabled, prints an error and exits if an unknown command is passed.
	 * Suggests the closest matching command name when possible. Inherited by
	 * nested cli() calls via context.
	 */
	strictCommands?: boolean;

	/**
	 * Enable `--no-<flag>` negation for boolean flags.
	 *
	 * When enabled, `--no-verbose` is equivalent to `--verbose=false`.
	 * Only applies to flags defined as `Boolean`.
	 */
	booleanFlagNegation?: boolean;

	/**
	 * When enabled, cleye throws `CleyeExit` instead of calling `process.exit`
	 * on `--help`, `--version`, validation failures, and `strictFlags` /
	 * `strictCommands` errors. Catch the throw to keep cleye safe to embed in
	 * a host process. Inherited by nested cli() calls via context.
	 */
	throwOnExit?: boolean;
};

/**
 * Why cleye is terminating. Carried by the thrown `CleyeExit` so callers can
 * distinguish info requests (`'help'`, `'version'`) from validation failures.
 */
export type ExitReason =
	| 'help'
	| 'version'
	| 'missing-required-parameter'
	| 'unknown-flag'
	| 'invalid-flag-value'
	| 'unknown-command'
	| 'no-command-match';

/**
 * Discriminated union over `command`. Each branch pairs a matched command
 * name with a `runCommand` typed for that command. The `undefined` branch
 * (no match) is always present so `parsed.runCommand` is callable
 * regardless of which command was matched.
 */
type CommandUnion<C> =
	| (C extends Commands
		? {
			[K in keyof C & string]: {
				command: K;
				runCommand: RunCommandFor<C[K]>;
			};
		}[keyof C & string]
		: never)
	| {
		command: undefined;
		runCommand: NoopRunCommand;
	};

export type ParsedArgv<
	Options extends {
		flags?: Flags;
		commands?: Commands;
	},
	Parameters extends string[],
> = TypeFlag<ResolvedFlags<Options>> & {
	_: {
		[
		Parameter in Parameters[number]
		as CamelCase<StripBrackets<Parameter>>
		]: ParameterType<Parameter>;
	};

	/** Show help documentation. */
	showHelp: (options?: HelpOptions) => void;

	/**
	 * Print the configured `version` to stdout. No-op when no version is set.
	 */
	showVersion: () => void;
} & CommandUnion<Options['commands']>;

/**
 * The user's callback to `cli()`. Receives the parsed argv (flattened via the
 * mapped type so editor hovers display the resolved shape) and may return
 * any value, which becomes the resolved value of `cli()`.
 */
export type CallbackFunction<Parsed, Return = unknown> = (
	parsed: { [Key in keyof Parsed]: Parsed[Key] },
) => Return | Promise<Return>;

/**
 * Helper to reject unknown properties on the `cli()` options object.
 * Maps any key not in `CliOptions` to `never`, surfacing a type error
 * when excess properties are passed. Callers must ensure `T` extends
 * `CliOptions` — this type does not enforce that itself.
 */
export type StrictOptions<T> = T & Record<Exclude<keyof T, keyof CliOptions>, never>;
