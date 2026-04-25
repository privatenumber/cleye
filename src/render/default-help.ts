import { flagNameToKebab } from 'type-flag';
import type { CliOptions, Flags } from '../types.ts';
import { render } from './render.ts';
import {
	p, usage, section, cmds, flags as flagsAtom, type Flag, type Node,
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
		const short = typeof aliasRaw === 'string' && aliasRaw
			? aliasRaw
			: (Array.isArray(aliasRaw) && typeof aliasRaw[0] === 'string' ? aliasRaw[0] : undefined);

		return {
			long: `--${flagNameToKebab(name)}`,
			short,
			arg: argument,
			description: description || undefined,
		} satisfies Flag;
	});
};

/**
 * Compose the full help output from CliOptions using the atom system.
 *
 * The caller must pass `options.name` already resolved to the effective name
 * (i.e., falling back to the parent context name or argv[1] basename).
 *
 * This is the default renderer when the user has not set `help.render`.
 * The legacy Renderers + generateHelp pipeline continues to power `help.render`
 * callbacks (Phase D will remove that pipeline once no internal caller remains).
 */
export const defaultHelp = (
	options: CliOptions,
): string => {
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
	if (!('help' in allFlags)) {
		allFlags.help = {
			type: Boolean,
			alias: 'h',
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

	// ── Description ───────────────────────────────────────────────────────
	if (help?.description) {
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
			description: (
				typeof entry === 'object' && entry !== null && 'description' in entry
					? (entry.description ?? undefined)
					: undefined
			),
		}));
		nodes.push(section('Commands', cmds(commandList)));
	}

	// ── Flags ─────────────────────────────────────────────────────────────
	const flagList = flagsToAtomList(allFlags);
	if (flagList.length > 0) {
		nodes.push(section('Flags', flagsAtom(flagList)));
	}

	// ── Examples ──────────────────────────────────────────────────────────
	const examples = help?.examples;
	if (examples && (!Array.isArray(examples) || examples.length > 0)) {
		const examplesText = Array.isArray(examples) ? examples.join('\n') : examples;
		if (examplesText) {
			nodes.push(section('Examples', p(examplesText)));
		}
	}

	return render(...nodes);
};
