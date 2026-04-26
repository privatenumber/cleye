import type {
	TypeFlag,
	Flags as BaseFlags,
	IgnoreFunction,
} from 'type-flag';

export type Flags = BaseFlags<{

	/**
	Description to be used in help output

	@example
	```
	description: 'Unit of output (metric, imperial)',
	```
	*/
	description?: string;

	/**
	Placeholder label to be used in help output

	@example Required value
	```
	placeholder: '<locale>'
	```
	*/
	placeholder?: string;
}>;

export type HelpForm = 'short' | 'long';

export type HelpRenderer = (
	options: CliOptions,
	options_: { form: HelpForm },
) => string;

export type HelpOptions = {

	/**
	Version of the script displayed in `--help` output. Use to avoid enabling `--version` flag.
	*/
	version?: string;

	/**
	Description of the script or command to display in `--help` output.
	*/
	description?: string;

	/**
	Usage code examples to display in `--help` output.
	*/
	usage?: false | string | string[];

	/**
	Example code snippets to display in `--help` output.
	*/
	examples?: string | string[];

	/**
	Function to customize the help output. Receives the full CLI options and
	the resolved render context. Returns the rendered help string.
	*/
	render?: HelpRenderer;
};

/**
 * A command entry in the commands map.
 *
 * - Shorthand: a function to call when the command is matched
 * - Full form: an object with metadata for help + a loader function
 */
export type CommandEntry =
	| ((argument?: any) => any)
	| {
		description?: string;
		alias?: string | string[];
		loader: (argument?: any) => any;
	};

export type Commands = Record<string, CommandEntry>;

export type CliOptions<
	Parameters extends string[] = string[],
> = {

	/**
	Name of the script displayed in `--help` output.
	*/
	name?: string;

	/**
	Version of the script displayed in `--version` and `--help` outputs.
	*/
	version?: string;

	/**
	Parameters accepted by the script. Parameters must be in the following formats:

	- Required parameter: `<parameter name>`
	- Optional parameter: `[parameter name]`
	- Required spread parameter: `<parameter name...>`
	- Optional spread parameter: `[parameter name...]`
	*/
	parameters?: Parameters;

	/**
	Commands to register to the script.
	*/
	commands?: Commands;

	/**
	Flags accepted by the script
	*/
	flags?: Flags;

	/**
	Options to configure the help documentation. Pass in `false` to disable handling `--help, -h`.
	*/
	help?: false | HelpOptions;

	/**
	 * Which argv elements to ignore from parsing
	 */
	ignoreArgv?: IgnoreFunction;

	/**
	 * When enabled, prints an error and exits if unknown flags are passed.
	 * Suggests the closest matching flag name when possible.
	 */
	strictFlags?: boolean;

	/**
	 * Enable `--no-<flag>` negation for boolean flags.
	 *
	 * When enabled, `--no-verbose` is equivalent to `--verbose=false`.
	 * Only applies to flags defined as `Boolean`.
	 */
	booleanFlagNegation?: boolean;
};

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

type HasVersion<Options extends { flags?: Flags }> = (
	Options extends { version: string }
		? Options['flags'] & { version: BooleanConstructor }
		: Options['flags']
);

type HasHelp<Options extends { flags?: Flags }> = (
	Options extends { help: false }
		? Options['flags']
		: Options['flags'] & { help: BooleanConstructor }
);

type HasHelpOrVersion<Options extends { flags?: Flags }> = (
	HasVersion<Options> & HasHelp<Options>
);

/**
 * Extract the handler function from a CommandEntry.
 *
 * - Function shorthand: the entry itself.
 * - Object form: `entry.loader`.
 */
type EntryHandler<Entry> = Entry extends (...arguments_: any) => any
	? Entry
	: Entry extends { loader: infer Loader extends (...arguments_: any) => any }
		? Loader
		: never;

/**
 * If a handler resolves to a module namespace with a callable `default`
 * export (the lazy-loader pattern: `loader: () => import('./cmd.ts')`),
 * unwrap to the default export's signature. Otherwise the handler is
 * invoked directly.
 */
type Invokable<Handler extends (...arguments_: any) => any> =
	Awaited<ReturnType<Handler>> extends {
		default: infer Default extends (...arguments_: any) => any;
	}
		? Default
		: Handler;

/**
 * The shape of `runCommand` for a specific matched command — preserves the
 * handler's argument and return-value types, wrapping the return in a Promise.
 */
type RunCommandFor<Entry> =
	Invokable<EntryHandler<Entry>> extends (...arguments_: infer Arguments) => infer Return
		? (...arguments_: Arguments) => Promise<Awaited<Return>>
		: never;

/**
 * Discriminated union over `command`. Each branch pairs the matched command
 * name with a `runCommand` typed for that command. The `undefined` branch is
 * the noop case (no command matched).
 */
type CommandUnion<C> = C extends Commands
	? (
		| {
			[K in keyof C & string]: {
				command: K;
				runCommand: RunCommandFor<C[K]>;
			}
		}[keyof C & string]
		| { command: undefined;
			runCommand: () => Promise<undefined>; }
	)
	: { command: undefined;
		runCommand: () => Promise<undefined>; };

export type ParsedArgv<
	Options extends { flags?: Flags;
		commands?: Commands; },
	Parameters extends string[],
> = TypeFlag<HasHelpOrVersion<Options>> & {
	_: {
		[
		Parameter in Parameters[number]
		as CamelCase<StripBrackets<Parameter>>
		]: ParameterType<Parameter>;
	};

	/** Show help documentation */
	showHelp: (options?: HelpOptions) => void;

	/** Show version */
	showVersion: () => void;
} & CommandUnion<Options['commands']>;

export type CallbackFunction<Parsed, Return = unknown> = (
	parsed: { [Key in keyof Parsed]: Parsed[Key] },
) => Return | Promise<Return>;

/**
 * Helper type to reject unknown properties in cli() options.
 * Maps any key not in CliOptions to `never`, causing a type error
 * when excess properties are passed.
 */
export type StrictOptions<T> = T & Record<Exclude<keyof T, keyof CliOptions>, never>;
