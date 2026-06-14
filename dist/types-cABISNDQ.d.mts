import { Flags as Flags$1, IgnoreFunction, TypeFlag } from 'type-flag';

/**
 * A help-document node. Inspectable as data (debuggable via console.log)
 * AND callable for rendering (open-ended dispatch via .render method).
 *
 * `kind` is informational only — used for debugging and optional filtering.
 * Dispatch is via `.render()`, not a switch on `kind`, so users can add
 * their own components by returning any object matching this shape.
 */
type Node = {
    readonly kind: string;
    render: () => string;
    readonly [key: string]: unknown;
};
/**
 * MVP shape for a command-line flag. Later phases may extend with
 * env, group, etc.
 *
 * At least one of `short` or `long` must be present. A flag with only
 * `short` (e.g. `-h` with no `--help` counterpart) is valid.
 */
type Flag = {
    short?: string;
    long?: string;
    arg?: string;
    description?: string;
};
declare const p: (text: string) => Node;
declare const usage: (name: string, pattern: string) => Node;
declare const footer: (text: string) => Node;
declare const section: (title: string, ...body: Node[]) => Node;
declare const cmds: (commands: {
    name: string;
    description?: string;
}[]) => Node;
declare const flagsInline: (flagList: Flag[]) => Node;
declare const flagsHanging: (flagList: Flag[]) => Node;
declare const flags: (flagList: Flag[]) => Node;

/**
 * Any callable. Used as the constraint for handler/loader functions in
 * CommandEntry and the type-machinery that extracts and forwards their
 * signatures (`EntryHandler`, `RunCommandFor`).
 *
 * `any` is intentional here: using `unknown[]` for a function constraint makes
 * typed handlers such as `(name: string) => void` fail parameter compatibility.
 */
type AnyFunction = (...arguments_: any) => any;
/**
 * Default value plus explicit help text. Recognized only when both `value` and
 * `description` are present; objects with just one of those keys remain plain
 * object defaults.
 */
type DescribedDefault<Value = unknown> = {
    value: Value | (() => Value);
    description: string;
};
/**
 * The shape of `runCommand` when no command matched — a callable noop that
 * returns `undefined` synchronously. `await undefined` is a no-op, so callers
 * can still write `await argv.runCommand()` if they want symmetry across
 * the discriminated union's branches.
 */
type NoopRunCommand = () => undefined;
type AlphabetLowercase = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
type Numeric = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type AlphaNumeric = AlphabetLowercase | Uppercase<AlphabetLowercase> | Numeric;
type CamelCase<Word extends string> = (Word extends `${infer FirstCharacter}${infer Rest}` ? (FirstCharacter extends AlphaNumeric ? `${FirstCharacter}${CamelCase<Rest>}` : Capitalize<CamelCase<Rest>>) : Word);
type StripBrackets<Parameter extends string> = (Parameter extends `<${infer ParameterName}>` | `[${infer ParameterName}]` ? (ParameterName extends `${infer SpreadName}...` ? SpreadName : ParameterName) : never);
type ParameterType<Parameter extends string> = (Parameter extends `<${infer _ParameterName}...>` | `[${infer _ParameterName}...]` ? string[] : Parameter extends `<${infer _ParameterName}>` ? string : Parameter extends `[${infer _ParameterName}]` ? string | undefined : never);
/**
 * Augment the user-declared flags with auto-injected `version` (when
 * `options.version` is set) and `help` (unless `options.help` is `false`).
 * Used to compute `ParsedArgv['flags']`.
 *
 * Defaults `flags` to `{}` when omitted so the intersection doesn't collapse
 * to `never` for the no-flags case (e.g. `cli({})`).
 */
type NormalizeDescribedDefault<Default> = (Default extends DescribedDefault<infer Value> ? Value | (() => Value) : Default);
type NormalizeDescribedDefaults<Schemas> = {
    [FlagName in keyof Schemas]: Schemas[FlagName] extends {
        default: infer Default;
    } ? Omit<Schemas[FlagName], 'default'> & {
        default: NormalizeDescribedDefault<Default>;
    } : Schemas[FlagName];
};
type UserFlags<Options extends {
    flags?: Flags$1;
}> = Options['flags'] extends Flags$1 ? NormalizeDescribedDefaults<Options['flags']> : unknown;
type FlagKeyExists<Options extends {
    flags?: Flags$1;
}, FlagName extends string> = (Options['flags'] extends Flags$1 ? FlagName extends keyof Options['flags'] ? true : false : false);
type AutoFlag<Options extends {
    flags?: Flags$1;
}, FlagName extends string, Schema> = FlagKeyExists<Options, FlagName> extends true ? unknown : Schema;
type ResolvedFlags<Options extends {
    flags?: Flags$1;
}> = (UserFlags<Options> & (Options extends {
    version: string;
} ? AutoFlag<Options, 'version', {
    version: BooleanConstructor;
}> : unknown) & (Options extends {
    help: false;
} ? unknown : AutoFlag<Options, 'help', {
    help: BooleanConstructor;
}>));
/** Extract the handler from a CommandEntry — the entry itself or `entry.loader`. */
type EntryHandler<Entry> = Entry extends AnyFunction ? Entry : Entry extends {
    loader: infer Loader extends AnyFunction;
} ? Loader : never;
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
type RunCommandFor<Entry> = EntryHandler<Entry> extends (...arguments_: infer Arguments) => infer Return ? Return extends Promise<infer Resolved> ? Resolved extends {
    default: infer Default extends AnyFunction;
} ? (...arguments_: Parameters<Default>) => Promise<Awaited<ReturnType<Default>>> : (...arguments_: Arguments) => Promise<Resolved> : Return extends {
    default: infer Default extends AnyFunction;
} ? (...arguments_: Parameters<Default>) => ReturnType<Default> : (...arguments_: Arguments) => Return : never;

type Flags = Flags$1<{
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
     * Default value plus display text for help output. `value` is used for
     * parsing; `description` is rendered in help without executing `value`.
     * Objects with only `value` or only `description` are plain object defaults.
     */
    default?: unknown | (() => unknown) | DescribedDefault;
}>;
type HelpForm = 'short' | 'long';
/**
 * Accepted return shapes for `help.render`:
 *   - `Node[]` — most idiomatic; cleye joins them.
 *   - `Node` — a single node.
 *   - `string` — pre-rendered output (escape hatch).
 */
type HelpRenderer = (options: CliOptions, options_: {
    form: HelpForm;
}) => Node | Node[] | string;
type HelpOptions = {
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
type HelpContext = {
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
type CommandEntry = AnyFunction | {
    description?: string;
    alias?: string | string[];
    loader: AnyFunction;
};
type Commands = Record<string, CommandEntry>;
type CliOptions<Parameters extends string[] = string[]> = {
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
    /** Name of the script displayed in `--help` output. */
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
type ExitReason = 'help' | 'version' | 'missing-required-parameter' | 'unknown-flag' | 'unknown-command' | 'no-command-match';
/**
 * Discriminated union over `command`. Each branch pairs a matched command
 * name with a `runCommand` typed for that command. The `undefined` branch
 * (no match) is always present so `parsed.runCommand` is callable
 * regardless of which command was matched.
 */
type CommandUnion<C> = (C extends Commands ? {
    [K in keyof C & string]: {
        command: K;
        runCommand: RunCommandFor<C[K]>;
    };
}[keyof C & string] : never) | {
    command: undefined;
    runCommand: NoopRunCommand;
};
type ParsedArgv<Options extends {
    flags?: Flags;
    commands?: Commands;
}, Parameters extends string[]> = TypeFlag<ResolvedFlags<Options>> & {
    _: {
        [Parameter in Parameters[number] as CamelCase<StripBrackets<Parameter>>]: ParameterType<Parameter>;
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
type CallbackFunction<Parsed, Return = unknown> = (parsed: {
    [Key in keyof Parsed]: Parsed[Key];
}) => Return | Promise<Return>;
/**
 * Helper to reject unknown properties on the `cli()` options object.
 * Maps any key not in `CliOptions` to `never`, surfacing a type error
 * when excess properties are passed. Callers must ensure `T` extends
 * `CliOptions` — this type does not enforce that itself.
 */
type StrictOptions<T> = T & Record<Exclude<keyof T, keyof CliOptions>, never>;

export { cmds as h, flags as i, flagsHanging as j, flagsInline as k, footer as l, p, section as s, usage as u };
export type { CallbackFunction as C, DescribedDefault as D, ExitReason as E, Flag as F, HelpContext as H, Node as N, ParsedArgv as P, StrictOptions as S, CliOptions as a, CommandEntry as b, Commands as c, Flags as d, HelpForm as e, HelpOptions as f, HelpRenderer as g };
