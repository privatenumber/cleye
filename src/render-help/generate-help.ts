import type {
	CliOptionsInternal,
	HelpDocumentNode,
} from '../types';
import type { CommandOptions } from '../command';
import { renderFlags } from './render-flags';

type Options = CliOptionsInternal | CommandOptions;

const getVersion = (options?: CliOptionsInternal) => (
	!options || (
		options.version ?? (
			options.help
				? options.help.version
				: undefined
		)
	)
);

const getName = (options: Options) => {
	const parentName = ('parent' in options) && options.parent?.name;
	return (parentName ? `${parentName} ` : '') + options.name;
};

function getNameAndVersion(options: Options) {
	const name = [];

	if (options.name) {
		name.push(getName(options));
	}

	const version = getVersion(options) ?? (('parent' in options) && getVersion(options.parent));
	if (version) {
		name.push(`v${version}`);
	}

	if (name.length === 0) {
		return;
	}

	return {
		id: 'name',
		type: 'text',
		data: `${name.join(' ')}\n`,
	} as const;
}

function getDescription(options: Options) {
	const { help } = options;
	if (
		!help
		|| !help.description
	) {
		return;
	}

	return {
		id: 'description',
		type: 'text',
		data: `${help.description}\n`,
	} as const;
}

function getUsage(options: Options) {
	const help = options.help || {};

	if ('usage' in help) {
		if (!help.usage) {
			return;
		}

		return {
			id: 'usage',
			type: 'section',
			data: {
				title: 'Usage:',
				body: (
					Array.isArray(help.usage)
						? help.usage.join('\n')
						: help.usage
				),
			},
		} as const;
	} if (options.name) {
		const usages: string[] = [];

		const usage = [getName(options)];

		if (
			options.flags
			&& Object.keys(options.flags).length > 0
		) {
			usage.push('[flags...]');
		}

		if (
			options.parameters
			&& options.parameters.length > 0
		) {
			const { parameters } = options;
			const hasEof = parameters.indexOf('--');
			const hasRequiredParametersAfterEof = hasEof > -1 && parameters.slice(hasEof + 1).some(parameter => parameter.startsWith('<'));
			usage.push(
				parameters
					.map((parameter) => {
						if (parameter !== '--') {
							return parameter;
						}
						return hasRequiredParametersAfterEof ? '--' : '[--]';
					})
					.join(' '),
			);
		}

		if (usage.length > 1) {
			usages.push(usage.join(' '));
		}

		if (
			'commands' in options
			&& options.commands?.length
		) {
			usages.push(`${options.name} <command>`);
		}

		if (usages.length > 0) {
			return {
				id: 'usage',
				type: 'section',
				data: {
					title: 'Usage:',
					body: usages.join('\n'),
				},
			} as const;
		}
	}
}

function getCommands(options: Options) {
	if (
		!('commands' in options)
		|| !options.commands?.length
	) {
		return;
	}

	const commands = options.commands.map(
		command => [command.options.name, command.options.help ? command.options.help.description : ''],
	);

	const commandsTable = {
		type: 'table',
		data: {
			tableData: commands,
			tableOptions: [
				{
					width: 'content-width',
					paddingLeft: 2,
					paddingRight: 8,
				},
			],
		},
	};

	return {
		id: 'commands',
		type: 'section',
		data: {
			title: 'Commands:',
			body: commandsTable,
			indentBody: 0,
		},
	} as const;
}

function getFlags(options: Options) {
	if (
		!options.flags
		|| Object.keys(options.flags).length === 0
	) {
		return;
	}

	return {
		id: 'flags',
		type: 'section',
		data: {
			title: 'Flags:',
			body: renderFlags(options.flags),
			indentBody: 0,
		},
	} as const;
}

function getExamples(options: Options) {
	const { help } = options;
	if (
		!help
		|| !help.examples
		|| help.examples.length === 0
	) {
		return;
	}

	let { examples } = help;

	if (Array.isArray(examples)) {
		examples = examples.join('\n');
	}

	if (examples) {
		return {
			id: 'examples',
			type: 'section',
			data: {
				title: 'Examples:',
				body: examples,
			},
		} as const;
	}
}

function getAliases(options: Options) {
	if (
		!('alias' in options)
		|| !options.alias
	) {
		return;
	}

	const { alias } = options;
	const aliases = Array.isArray(alias) ? alias.join(', ') : alias;

	return {
		id: 'aliases',
		type: 'section',
		data: {
			title: 'Aliases:',
			body: aliases,
		},
	} as const;
}

type Truthy = <T>(value?: T) => value is T;

export const generateHelp = (options: Options): HelpDocumentNode[] => (
	[
		getNameAndVersion,
		getDescription,
		getUsage,
		getCommands,
		getFlags,
		getExamples,
		getAliases,
	].map(
		helpSectionGenerator => helpSectionGenerator(options),
	).filter(
		Boolean as any as Truthy,
	)
);
