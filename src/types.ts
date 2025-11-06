import type {
	TypeFlag,
	TypeFlagOptions,
	Flags as BaseFlags,
} from 'type-flag';
import type { Command } from './command';
import type { Renderers } from './render-help/renderers';

export declare const parsedType: unique symbol;

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

export type CallbackFunction<Parsed> = (parsed: {
	// This exposes the content of "TypeFlag<T>" in type hints
	[Key in keyof Parsed]: Parsed[Key];
}) => void | Promise<void>;

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

export type HelpDocumentNode<Types extends PropertyKey = keyof Renderers> = {
	id?: string;
	type: Types;
	data: any;
};

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
	Function to customize the help document before it is logged.
	*/
	render?: (
		nodes: HelpDocumentNode<keyof Renderers>[],
		renderers: Renderers,
	) => string;
};

export type CliOptions<
	Commands = Command[],
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
	ignoreArgv?: TypeFlagOptions['ignore'];
};

export type CliOptionsInternal<
	Commands = Command[],
> = CliOptions<Commands> & {
	parent?: CliOptions;
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

type WithCommand<
	Options extends TypeFlag,
	CommandName extends string | undefined = undefined,
> = {
	command: CommandName;
} & Options;

type TypeFlagWrapper<
	Options extends { flags?: Flags },
	Parameters extends string[],
> = TypeFlag<HasHelpOrVersion<Options>> & {
	_: {
		[
		Parameter in Parameters[number]
		as CamelCase<StripBrackets<Parameter>>
		]: ParameterType<Parameter>;
	};
	showHelp: (options?: HelpOptions) => void;
	showVersion: () => void;
};

export type ParseArgv<
	Options extends { flags?: Flags },
	Parameters extends string[],
	CommandName extends string | undefined = '',
> = (
	CommandName extends ''
		? TypeFlagWrapper<Options, Parameters>
		: WithCommand<TypeFlagWrapper<Options, Parameters>, CommandName>
);
