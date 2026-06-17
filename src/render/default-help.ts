import type { CliOptions, Flags, HelpForm } from '../types.ts';
import {
	AUTO_FLAG,
	autoFlagLongHelp,
	autoFlagShortHelp,
	resolveAutoFlags,
} from '../utils/auto-flags.ts';
import { getDefaultDescription, isFlagConfigObject } from '../utils/flag-defaults.ts';
import {
	type Components, type Node,
	p as defaultP, usage as defaultUsage, section as defaultSection,
	cmds as defaultCmds, flags as defaultFlags, footer as defaultFooter,
} from './components.ts';
import { flagsToComponentList } from './flag-to-component.ts';

/**
 * Build a `defaultHelp` function bound to a specific component set. Called
 * once by `cleye/help` (with the default `.length`-based components) and
 * once by `cleye/help/responsive` (with `stringWidth`-based components).
 */
export const createDefaultHelp = (
	components: Pick<Components, 'p' | 'usage' | 'section' | 'cmds' | 'flags' | 'footer'>,
) => (
	options: CliOptions,
	options_: { form?: HelpForm } = {},
): Node[] => {
	const {
		p, usage, section, cmds, flags: flagsComponent, footer,
	} = components;
	const form = options_.form ?? 'long';
	const isShort = form === 'short';
	const name = options.name ?? '';
	// Resolve a function `help` here too, so the documented manual path
	// (`render(...defaultHelp(options))`) behaves like it does via cli(). When
	// invoked through cli()'s showHelp the function is already resolved
	// upstream, so this only fires for direct callers; `command` falls back to
	// `name` (a standalone render has no parent chain).
	const helpOption = typeof options.help === 'function'
		? options.help({
			name,
			command: name,
			version: options.version,
		})
		: options.help;
	const help = typeof helpOption === 'object' ? helpOption : undefined;

	// Examples render only when they join to non-empty text. Compute once so the
	// long-form Examples section and the short-form hint agree on whether there
	// are examples to show (e.g. `examples: ['']` joins to '' — nothing to show).
	const examplesValue = help?.examples;
	const examplesText = examplesValue && (Array.isArray(examplesValue) ? examplesValue.join('\n') : examplesValue);

	// Build the full flag set: user flags + auto-injected version/help.
	// `resolveAutoFlags` is the single source of truth shared with cli.ts —
	// alias-aware, respects `options.help === false`. When invoked from cli's
	// showHelp the upstream injection has already populated these names, so
	// the resolver's name-collision checks correctly skip the redundant adds.
	const allFlags: Flags = { ...options.flags };
	resolveAutoFlags(allFlags, options);

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
		// Render verbatim: usage patterns are preformatted lines, not prose.
		// `footer` never reflows, so authored line breaks survive and a single
		// over-long line overflows (stays copy-pasteable) rather than wrapping.
		nodes.push(section('Usage', footer(body)));
	} else if (name) {
		// Auto-computed usage from name + flags + parameters + commands
		const hasFlags = Object.keys(allFlags).length > 0;
		const hasParameters = options.parameters && options.parameters.length > 0;
		const hasCommands = options.commands && Object.keys(options.commands).length > 0;

		let usageLine: string | undefined;

		if (hasCommands) {
			const firstLine = [name];
			if (hasFlags) {
				firstLine.push('[global flags...]');
			}
			firstLine.push('<command>');
			usageLine = firstLine.join(' ');
		} else {
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
				usageLine = firstLine.join(' ');
			}
		}

		if (usageLine) {
			nodes.push(usage(name, usageLine.slice(name.length + 1)));
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
	// Short form: omit generated default-value annotations so each flag fits
	// on one line without stripping authored text that happens to look similar.
	if (
		allFlags[AUTO_FLAG.helpShort] === autoFlagShortHelp
		&& allFlags[AUTO_FLAG.help] === autoFlagLongHelp
	) {
		delete allFlags[AUTO_FLAG.helpShort];
		allFlags[AUTO_FLAG.help] = {
			...autoFlagLongHelp,
			alias: AUTO_FLAG.helpShort,
			description: 'Show help (-h for short form)',
		};
	}
	const flagList = isShort
		? flagsToComponentList(allFlags, { includeDefaultDescriptions: false })
		: flagsToComponentList(allFlags);

	if (flagList.length > 0) {
		nodes.push(section('Flags', flagsComponent(flagList)));
	}

	// ── Examples (long form only) ─────────────────────────────────────────
	if (!isShort && examplesText) {
		// Render verbatim (see Usage above): examples are preformatted command
		// lines. Reflowing them splits commands mid-line and breaks copy-paste.
		nodes.push(section('Examples', footer(examplesText)));
	}

	// ── Short-form hint ───────────────────────────────────────────────────
	// Short help hides the description, examples, command descriptions, and
	// flag defaults. When the long form would actually reveal more of those,
	// point the user to `--help`.
	if (isShort) {
		const hasLongFormExtras = Boolean(
			help?.description
			|| examplesText
			|| Object.values(options.commands ?? {}).some(
				entry => typeof entry === 'object' && entry !== null && 'description' in entry && Boolean(entry.description),
			)
			|| Object.values(options.flags ?? {}).some(
				config => isFlagConfigObject(config) && 'default' in config && getDefaultDescription(config.default) !== undefined,
			),
		);

		if (hasLongFormExtras) {
			nodes.push(p('Pass --help for more details.'));
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
	footer: defaultFooter,
});
