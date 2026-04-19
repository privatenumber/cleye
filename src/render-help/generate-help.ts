import type {
	CliOptions,
	CommandEntry,
	HelpDocumentNode,
} from '../types.ts';
import { renderFlags } from './render-flags.ts';

type Options = CliOptions & {
	// flags may be augmented with help/version before passing in
	flags?: CliOptions['flags'];
};

const getVersion = (options: Options) => (
	options.version ?? (
		options.help
			? (typeof options.help === 'object' ? options.help.version : undefined)
			: undefined
	)
);

function getNameAndVersion(options: Options) {
	const name = [];

	if (options.name) {
		name.push(options.name);
	}

	const version = getVersion(options);
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
		|| typeof help !== 'object'
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
	const help = (typeof options.help === 'object' && options.help) || {};

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

		const usage = [options.name];

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
			const hasRequiredParametersAfterEof = hasEof !== -1 && parameters.slice(hasEof + 1).some(parameter => parameter.startsWith('<'));
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
			options.commands
			&& Object.keys(options.commands).length > 0
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

function getCommandDescription(entry: CommandEntry): string {
	if (typeof entry === 'object' && 'description' in entry) {
		return entry.description ?? '';
	}
	return '';
}

function getCommands(options: Options) {
	if (
		!options.commands
		|| Object.keys(options.commands).length === 0
	) {
		return;
	}

	const commands = Object.entries(options.commands).map(
		([name, entry]) => [name, getCommandDescription(entry)],
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
		|| typeof help !== 'object'
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

type Truthy = <T>(value?: T) => value is T;

export const generateHelp = (options: Options): HelpDocumentNode[] => (
	[
		getNameAndVersion,
		getDescription,
		getUsage,
		getCommands,
		getFlags,
		getExamples,
	].map(
		helpSectionGenerator => helpSectionGenerator(options),
	).filter(
		Boolean as any as Truthy,
	)
);
