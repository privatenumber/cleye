import type { TypeFlagOptions } from 'type-flag';
import type {
	CallbackFunction,
	Flags,
	HelpOptions,
	ParseArgv,
	parsedType,
} from './types';
import { isValidScriptName } from './utils/script-name';

export type CommandOptions<Parameters = string[]> = {
	/**
	Name of the command used to invoke it. Also displayed in `--help` output.
	*/
	name: string;

	/**
	Aliases for the command used to invoke it. Also displayed in `--help` output.
	*/
	alias?: string | string[];

	/**
	Parameters accepted by the command. Parameters must be in the following formats:

	- Required parameter: `<parameter name>`
	- Optional parameter: `[parameter name]`
	- Required spread parameter: `<parameter name...>`
	- Optional spread parameter: `[parameter name...]`
	*/
	parameters?: Parameters;

	/**
	Flags accepted by the command
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

export function command<
	Options extends CommandOptions<[...Parameters]>,
	Parameters extends string[],
>(
	options: Readonly<Options> & CommandOptions<[...Parameters]>,
	callback?: CallbackFunction<ParseArgv<Options, Parameters>>,
): Command<Options, ParseArgv<Options, Parameters, Options['name']>> {
	if (!options) {
		throw new Error('Command options are required');
	}

	const { name } = options;
	if (options.name === undefined) {
		throw new Error('Command name is required');
	}

	if (!isValidScriptName(name)) {
		throw new Error(`Invalid command name ${JSON.stringify(name)}. Command names must be one word.`);
	}

	// @ts-expect-error Missing parsedType, a type only property
	return {
		options,
		callback,
	};
}

export type Command<
	Options extends CommandOptions = CommandOptions,
	ParsedType = any,
> = {
	readonly options: Options;
	readonly callback?: CallbackFunction<any>;
	[parsedType]: ParsedType;
};
