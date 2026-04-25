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

export type ParsedArgv<
	Options extends { flags?: Flags },
	Parameters extends string[],
> = TypeFlag<HasHelpOrVersion<Options>> & {
	_: {
		[
		Parameter in Parameters[number]
		as CamelCase<StripBrackets<Parameter>>
		]: ParameterType<Parameter>;
	};

	/** Name of the matched command, or undefined if no command matched */
	command: string | undefined;

	/** Trigger the matched command. Undefined if no command matched. Callable at most once. */
	runCommand: ((context?: unknown) => Promise<void>) | undefined;

	/** Show help documentation */
	showHelp: (options?: HelpOptions) => void;

	/** Show version */
	showVersion: () => void;
};

export type CallbackFunction<Parsed> = (
	parsed: { [Key in keyof Parsed]: Parsed[Key] },
	runCommand: ((context?: unknown) => Promise<void>) | undefined,
) => void | Promise<void>;

/**
 * Helper type to reject unknown properties in cli() options.
 * Maps any key not in CliOptions to `never`, causing a type error
 * when excess properties are passed.
 */
export type StrictOptions<T> = T & Record<Exclude<keyof T, keyof CliOptions>, never>;
