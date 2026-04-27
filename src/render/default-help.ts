import { flagNameToKebab } from 'type-flag';
import type { CliOptions, Flags, HelpForm } from '../types.ts';
import {
	type Atoms, type Flag, type Node,
	p as defaultP, usage as defaultUsage, section as defaultSection,
	cmds as defaultCmds, flags as defaultFlags,
} from './atoms.ts';

const inferFlagArgument = (typeValue: unknown): string | undefined => {
	if (typeValue === Boolean) {
		return undefined;
	}
	if (Array.isArray(typeValue)) {
		return inferFlagArgument(typeValue[0]);
	}
	if (typeValue === String) {
		return 'string';
	}
	if (typeValue === Number) {
		return 'number';
	}
	return 'value';
};

const flagsToAtomList = (rawFlags: Flags): Flag[] => {
	const names = Object.keys(rawFlags).sort((a, b) => (a < b ? -1 : (a > b ? 1 : 0)));
	return names.map((name) => {
		const config = rawFlags[name];
		const cfg = (
			config !== null
			&& typeof config === 'object'
			&& !Array.isArray(config)
			&& typeof config !== 'function'
		)
			? config as Record<string, unknown>
			: { type: config };

		const type = cfg.type ?? config;

		let argument: string | undefined;
		if ('placeholder' in cfg && typeof cfg.placeholder === 'string') {
			argument = cfg.placeholder.replaceAll(/^<|>$/g, '');
		} else {
			argument = inferFlagArgument(type);
		}

		let description = typeof cfg.description === 'string' ? cfg.description : '';
		if ('default' in cfg) {
			let defaultValue = cfg.default;
			if (typeof defaultValue === 'function') {
				defaultValue = (defaultValue as () => unknown)();
			}
			if (defaultValue !== undefined) {
				description += ` (default: ${JSON.stringify(defaultValue)})`;
			}
		}

		const aliasRaw = cfg.alias;
		const aliasShort = typeof aliasRaw === 'string' && aliasRaw
			? aliasRaw
			: (Array.isArray(aliasRaw) && typeof aliasRaw[0] === 'string' ? aliasRaw[0] : undefined);

		// Single-char flag names are short flags (-x), not long flags (--x)
		if (name.length === 1) {
			return {
				short: name,
				arg: argument,
				description: description || undefined,
			} satisfies Flag;
		}

		return {
			long: `--${flagNameToKebab(name)}`,
			short: aliasShort,
			arg: argument,
			description: description || undefined,
		} satisfies Flag;
	});
};

/**
 * Build a `defaultHelp` function bound to a specific atom set. Called once
 * by `cleye/help` (with the default `.length`-based atoms) and once by
 * `cleye/help/responsive` (with `stringWidth`-based atoms).
 */
export const createDefaultHelp = (
	atoms: Pick<Atoms, 'p' | 'usage' | 'section' | 'cmds' | 'flags'>,
) => (
	options: CliOptions,
	options_: { form?: HelpForm } = {},
): Node[] => {
	const {
		p, usage, section, cmds, flags: flagsAtom,
	} = atoms;
	const form = options_.form ?? 'long';
	const isShort = form === 'short';
	const help = typeof options.help === 'object' ? options.help : undefined;
	const name = options.name ?? '';

	// Build the full flag set: user flags + auto-injected version/help
	const allFlags: Flags = { ...options.flags };
	if (options.version && !('version' in allFlags)) {
		allFlags.version = {
			type: Boolean,
			description: 'Show version',
		};
	}
	if (!('h' in allFlags)) {
		allFlags.h = {
			type: Boolean,
			description: 'Show short help',
		};
	}
	if (!('help' in allFlags)) {
		allFlags.help = {
			type: Boolean,
			description: 'Show help',
		};
	}

	const nodes: Node[] = [];

	// ── Name + version header ──────────────────────────────────────────────
	const versionString = options.version ?? help?.version;
	const nameWithVersion = [
		name || undefined,
		versionString ? `v${versionString}` : undefined,
	].filter(Boolean).join(' ');

	if (nameWithVersion) {
		nodes.push(p(nameWithVersion));
	}

	// ── Description (long form only) ──────────────────────────────────────
	if (!isShort && help?.description) {
		nodes.push(p(help.description));
	}

	// ── Usage ─────────────────────────────────────────────────────────────
	const customUsage = help && 'usage' in help ? help.usage : undefined;

	if (customUsage === false) {
		// Explicitly disabled
	} else if (customUsage !== undefined) {
		// User-supplied string or string[]
		const lines = Array.isArray(customUsage) ? customUsage : [customUsage];
		const body = lines.join('\n');
		nodes.push(section('Usage', p(body)));
	} else if (name) {
		// Auto-computed usage from name + flags + parameters + commands
		const hasFlags = Object.keys(allFlags).length > 0;
		const hasParameters = options.parameters && options.parameters.length > 0;
		const hasCommands = options.commands && Object.keys(options.commands).length > 0;

		const usageLines: string[] = [];

		const firstLine: string[] = [name];
		if (hasFlags) {
			firstLine.push('[flags...]');
		}
		if (hasParameters) {
			const params = options.parameters!;
			const eofIndex = params.indexOf('--');
			const hasRequiredAfterEof = eofIndex !== -1
				&& params.slice(eofIndex + 1).some(parameter => parameter.startsWith('<'));

			firstLine.push(
				...params.map((parameter) => {
					if (parameter !== '--') {
						return parameter;
					}
					return hasRequiredAfterEof ? '--' : '[--]';
				}),
			);
		}

		if (firstLine.length > 1) {
			usageLines.push(firstLine.join(' '));
		}

		if (hasCommands) {
			usageLines.push(`${name} <command>`);
		}

		if (usageLines.length > 0) {
			nodes.push(usage(name, usageLines[0].slice(name.length + 1)));

			// Additional lines (e.g. command usage) rendered as a follow-up section
			if (usageLines.length > 1) {
				// Replace the last pushed node with a section containing all lines
				nodes.pop();
				nodes.push(section('Usage', p(usageLines.join('\n'))));
			}
		}
	}

	// ── Commands ──────────────────────────────────────────────────────────
	if (options.commands && Object.keys(options.commands).length > 0) {
		const commandList = Object.entries(options.commands).map(([cmdName, entry]) => ({
			name: cmdName,
			// Short form: omit descriptions — names only
			description: isShort
				? undefined
				: (
					typeof entry === 'object' && entry !== null && 'description' in entry
						? (entry.description ?? undefined)
						: undefined
				),
		}));
		nodes.push(section('Commands', cmds(commandList)));
	}

	// ── Flags ─────────────────────────────────────────────────────────────
	// Short form: strip default-value annotations from descriptions so each
	// flag fits on one line. We build a pruned copy of the flag list.
	const flagList = isShort
		? flagsToAtomList(allFlags).map(flag => ({
			...flag,
			// Drop the "(default: ...)" suffix appended during flagsToAtomList
			description: flag.description?.replace(/ \(default: .*\)$/, '') || flag.description,
		}))
		: flagsToAtomList(allFlags);

	if (flagList.length > 0) {
		nodes.push(section('Flags', flagsAtom(flagList)));
	}

	// ── Examples (long form only) ─────────────────────────────────────────
	if (!isShort) {
		const examples = help?.examples;
		if (examples && (!Array.isArray(examples) || examples.length > 0)) {
			const examplesText = Array.isArray(examples) ? examples.join('\n') : examples;
			if (examplesText) {
				nodes.push(section('Examples', p(examplesText)));
			}
		}
	}

	return nodes;
};

export const defaultHelp = createDefaultHelp({
	p: defaultP,
	usage: defaultUsage,
	section: defaultSection,
	cmds: defaultCmds,
	flags: defaultFlags,
});
