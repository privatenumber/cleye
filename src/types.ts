import type {
	TypeFlag,
	Flags as BaseFlags,
	IgnoreFunction,
} from 'type-flag';
import type { Node } from './render/types.ts';

/**
 * Any callable. Used as the constraint for handler/loader functions in
 * CommandEntry and the type-machinery that extracts and forwards their
 * signatures (`EntryHandler`, `Invokable`, `RunCommandFor`).
 */
type AnyFunction = (...arguments_: any) => any;

/**
 * The shape of `runCommand` when no command matched — a callable noop that
 * returns `undefined` synchronously. `await undefined` is a no-op, so callers
 * can still write `await argv.runCommand()` if they want symmetry across
 * the discriminated union's branches.
 */
type NoopRunCommand = () => undefined;

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
	 *   - `Node[]` — atoms to compose; cleye joins them with blank lines
	 *   - `Node`   — a single atom
	 *   - `string`     — pre-rendered output (escape hatch)
	 *
	 * Composing with the default: `[...defaultHelp(opts, ctx), footer('…')]`.
	 */
	render?: HelpRenderer;
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

/**
 * `parameters` and `commands` are mutually exclusive at the same level: the
 * leading positional token cannot meaningfully be both a parameter value and
 * a command name. Pick one. Wildcard dispatch (catching arbitrary command
 * names) is done by leaving `commands` defined and inspecting
 * `parsed.command === undefined` plus `parsed._[0]` in the callback.
 */
type ParametersOrCommands<Parameters extends string[]> =
	| {

		/**
		 * Parameters accepted by the script. Parameters must be in the following formats:
		 *
		 * - Required parameter: `<parameter name>`
		 * - Optional parameter: `[parameter name]`
		 * - Required spread parameter: `<parameter name...>`
		 * - Optional spread parameter: `[parameter name...]`
		 */
		parameters?: Parameters;
		commands?: never;
	}
	| {
		parameters?: never;

		/** Commands to register to the script. */
		commands?: Commands;
	};

export type CliOptions<
	Parameters extends string[] = string[],
> = ParametersOrCommands<Parameters> & {

	/** Name of the script displayed in `--help` output. */
	name?: string;

	/** Version of the script displayed in `--version` and `--help` outputs. */
	version?: string;

	/** Flags accepted by the script. */
	flags?: Flags;

	/**
	 * Options to configure the help documentation. Pass in `false` to disable
	 * handling `--help, -h`.
	 */
	help?: false | HelpOptions;

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
	| 'unknown-command'
	| 'no-command-match';

type AlphabetLowercase = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
type Numeric = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type AlphaNumeric = AlphabetLowercase | Uppercase<AlphabetLowercase> | Numeric;

type CamelCase<Word extends string> = (
	Word extends `${infer FirstCharacter}${infer Rest}`
		? (
			FirstCharacter extends AlphaNumeric
				? `${FirstCharacter}${CamelCase<Rest>}`
				: Capitalize<CamelCase<Rest>>
		)
		: Word
);

type StripBrackets<Parameter extends string> = (
	Parameter extends `<${infer ParameterName}>` | `[${infer ParameterName}]`
		? (
			ParameterName extends `${infer SpreadName}...`
				? SpreadName
				: ParameterName
		)
		: never
);

type ParameterType<Parameter extends string> = (
	Parameter extends `<${infer _ParameterName}...>` | `[${infer _ParameterName}...]`
		? string[]
		: Parameter extends `<${infer _ParameterName}>`
			? string
			: Parameter extends `[${infer _ParameterName}]`
				? string | undefined
				: never
);

/**
 * Augment the user-declared flags with auto-injected `version` (when
 * `options.version` is set) and `help` (unless `options.help` is `false`).
 * Used to compute `ParsedArgv['flags']`.
 *
 * Defaults `flags` to `{}` when omitted so the intersection doesn't collapse
 * to `never` for the no-flags case (e.g. `cli({})`).
 */
type ResolvedFlags<Options extends { flags?: Flags }> = (
	(Options['flags'] extends Flags ? Options['flags'] : unknown)
	& (Options extends { version: string } ? { version: BooleanConstructor } : unknown)
	& (Options extends { help: false } ? unknown : { help: BooleanConstructor })
);

/** Extract the handler from a CommandEntry — the entry itself or `entry.loader`. */
type EntryHandler<Entry> = Entry extends AnyFunction
	? Entry
	: Entry extends { loader: infer Loader extends AnyFunction }
		? Loader
		: never;

/**
 * The shape of `runCommand` for a specific matched command. Mirrors the
 * resolved handler's sync/async character:
 *
 * - Sync handler (`cmd: () => 42`) → `runCommand` returns `42` directly.
 * - Async handler (`cmd: async () => 42`) → `runCommand` returns `Promise<42>`.
 * - Loader pattern returning a module namespace (`loader: () => import(...)`)
 *   → always async because `import()` is async; the default export's return
 *   value is unwrapped through the awaited Promise.
 *
 * Synchronous handlers that return a `{ default: fn }` shape get the same
 * default-unwrap treatment without an extra Promise wrap.
 */
type RunCommandFor<Entry> =
	EntryHandler<Entry> extends (...arguments_: infer Arguments) => infer Return
		? Return extends Promise<infer Resolved>
			? Resolved extends { default: infer Default extends AnyFunction }
				? (...arguments_: Parameters<Default>) => Promise<Awaited<ReturnType<Default>>>
				: (...arguments_: Arguments) => Promise<Resolved>
			: Return extends { default: infer Default extends AnyFunction }
				? (...arguments_: Parameters<Default>) => ReturnType<Default>
				: (...arguments_: Arguments) => Return
		: never;

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

	/** Show version. */
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
