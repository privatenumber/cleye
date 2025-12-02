import { typeFlag } from 'type-flag';
import type {
	CallbackFunction,
	CliOptions,
	CliOptionsInternal,
	ParseArgv,
	parsedType,
	HelpOptions,
	HelpDocumentNode,
	StrictOptions,
} from './types';
import type { Command } from './command';
import { generateHelp, Renderers } from './render-help';
import { camelCase } from './utils/convert-case';
import { isValidScriptName } from './utils/script-name';

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

function cliBase<
	CommandName extends string | undefined,
	Options extends CliOptionsInternal,
	Parameters extends string[],
>(
	command: CommandName,
	options: Options,
	callback: CallbackFunction<ParseArgv<Options, Parameters>> | undefined,
	argv: string[],
) {
	const flags = { ...options.flags };
	// Expected to work even if flag is overwritten; add tests
	const isVersionEnabled = options.version && !('version' in flags);

	if (isVersionEnabled) {
		flags.version = {
			type: Boolean,
			description: 'Show version',
		};
	}

	const { help } = options;
	const isHelpEnabled = helpEnabled(help);

	// Expected to work even if overwritten; add tests
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
			ignore: options.ignoreArgv,
		},
	);

	const showVersion = () => {
		console.log(options.version);
	};

	if (
		isVersionEnabled

		// Can be overridden to different type
		&& parsed.flags.version === true
	) {
		showVersion();
		return process.exit(0);
	}

	const helpRenderers = new Renderers();
	const renderHelpFunction = (
		(isHelpEnabled && help?.render)
			? help.render
			: (nodes: HelpDocumentNode | HelpDocumentNode[]) => helpRenderers.render(nodes)
	);

	const showHelp = (helpOptions?: HelpOptions) => {
		const nodes = generateHelp({
			...options,
			...(helpOptions ? { help: helpOptions } : {}),
			flags,
		});

		console.log(renderHelpFunction(nodes, helpRenderers));
	};

	if (
		isHelpEnabled

		// Can be overridden to different type
		&& parsed.flags.help === true
	) {
		showHelp();
		return process.exit(0);
	}

	if (options.parameters) {
		let { parameters } = options;
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

	const parsedWithApi = {
		...parsed,
		showVersion,
		showHelp,
	};

	// Already flattened
	const result = {
		command,
		...parsedWithApi,
	};

	if (typeof callback === 'function') {
		const callbackResult = callback(parsedWithApi as any);

		// Make it awaitable in case the callback returns a promise
		if (callbackResult && 'then' in callbackResult) {
			return Object.assign(
				// We wrap the promise again incase a fake promise was returned
				Promise.resolve(callbackResult),
				result,
			);
		}
	}

	return result;
}

function getCommand<Commands extends Command[]>(
	potentialCommand: string,
	commands: [...Commands],
) {
	const commandMap = new Map<string, Command>();
	for (const command of commands) {
		const names = [command.options.name];

		const { alias } = command.options;
		if (alias) {
			if (Array.isArray(alias)) {
				names.push(...alias);
			} else {
				names.push(alias);
			}
		}

		for (const name of names) {
			if (commandMap.has(name)) {
				throw new Error(`Duplicate command name found: ${stringify(name)}`);
			}

			commandMap.set(name, command);
		}
	}

	return commandMap.get(potentialCommand);
}

function cli<
	Options extends CliOptions<undefined, [...Parameters]>,
	Parameters extends string[],
>(
	options: StrictOptions<Options> & CliOptions<undefined, [...Parameters]>,
	callback?: CallbackFunction<ParseArgv<Options, Parameters>>,
	argv?: string[],
): (
	{
		[
		Key in keyof ParseArgv<
			Options,
			Parameters,
			undefined
		>
		]: ParseArgv<
			Options,
			Parameters,
			undefined
		>[Key];
	} & Promise<void>
);

function cli<
	Options extends CliOptions<[...Commands], [...Parameters]>,
	Commands extends Command[],
	Parameters extends string[],
>(
	options: StrictOptions<Options> & CliOptions<[...Commands], [...Parameters]>,
	callback?: CallbackFunction<ParseArgv<Options, Parameters>>,
	argv?: string[],
): (
	(
		{
			[
			Key in keyof ParseArgv<
				Options,
				Parameters,
				undefined
			>
			]: ParseArgv<
				Options,
				Parameters,
				undefined
			>[Key];
		}
		| {
			[KeyA in keyof Commands]: (
				Commands[KeyA] extends Command
					? (
						{
							[
							KeyB in keyof Commands[KeyA][typeof parsedType]
							]: Commands[KeyA][typeof parsedType][KeyB];
						}
					) : never
			);
		}[number]
	) & Promise<void>
);

function cli<
	Options extends CliOptions<[...Commands], [...Parameters]>,
	Commands extends Command[],
	Parameters extends string[],
>(
	options: Options | (Options & CliOptions<[...Commands], [...Parameters]>),
	callback?: CallbackFunction<ParseArgv<Options, Parameters>>,
	argv = process.argv.slice(2),
): any {
	// Because if not configured, it's probably being misused or overlooked
	if (!options) {
		throw new Error('Options is required');
	}

	if ('name' in options && (!options.name || !isValidScriptName(options.name))) {
		throw new Error(`Invalid script name: ${stringify(options.name)}`);
	}

	const potentialCommand = argv[0];

	if (
		options.commands
		&& potentialCommand
		&& isValidScriptName(potentialCommand)
	) {
		const command = getCommand(potentialCommand, options.commands);

		if (command) {
			return cliBase(
				command.options.name,
				{
					...command.options,
					parent: options,
				},
				command.callback,
				argv.slice(1),
			);
		}
	}

	return cliBase(undefined, options, callback, argv);
}

export { cli };
