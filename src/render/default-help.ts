import type { CliOptions, Flags, HelpForm } from '../types.ts';
import { autoFlagLongHelp, autoFlagShortHelp, autoFlagVersion } from '../utils/auto-flags.ts';
import {
	type Components, type Node,
	p as defaultP, usage as defaultUsage, section as defaultSection,
	cmds as defaultCmds, flags as defaultFlags,
} from './components.ts';
import { flagsToComponentList } from './flag-to-component.ts';

/**
 * Build a `defaultHelp` function bound to a specific component set. Called
 * once by `cleye/help` (with the default `.length`-based components) and
 * once by `cleye/help/responsive` (with `stringWidth`-based components).
 */
export const createDefaultHelp = (
	components: Pick<Components, 'p' | 'usage' | 'section' | 'cmds' | 'flags'>,
) => (
	options: CliOptions,
	options_: { form?: HelpForm } = {},
): Node[] => {
	const {
		p, usage, section, cmds, flags: flagsComponent,
	} = components;
	const form = options_.form ?? 'long';
	const isShort = form === 'short';
	const help = typeof options.help === 'object' ? options.help : undefined;
	const name = options.name ?? '';

	// Build the full flag set: user flags + auto-injected version/help.
	// When invoked from cli's showHelp the spread is already done upstream,
	// so the `in` checks are no-ops; standalone callers (`defaultHelp({...})`)
	// rely on this branch to get help/version flags rendered.
	const allFlags: Flags = { ...options.flags };
	if (options.version && !('version' in allFlags)) {
		allFlags.version = autoFlagVersion;
	}
	if (!('h' in allFlags)) {
		allFlags.h = autoFlagShortHelp;
	}
	if (!('help' in allFlags)) {
		allFlags.help = autoFlagLongHelp;
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
		? flagsToComponentList(allFlags).map(flag => ({
			...flag,
			// Drop the "(default: ...)" suffix appended during flagsToComponentList
			description: flag.description?.replace(/ \(default: .*\)$/, '') || flag.description,
		}))
		: flagsToComponentList(allFlags);

	if (flagList.length > 0) {
		nodes.push(section('Flags', flagsComponent(flagList)));
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
