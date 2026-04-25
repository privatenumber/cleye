import { bold, cyan, green } from 'ansis';
import type { Node } from './types.ts';

export type { Node };

/**
 * MVP shape for a command-line flag. Later phases may extend with
 * env, group, etc.
 *
 * At least one of `short` or `long` must be present. A flag with only
 * `short` (e.g. `-h` with no `--help` counterpart) is valid.
 */
export type Flag = {
	short?: string;
	long?: string;
	arg?: string;
	description?: string;
};

const getWidth = (): number => process.stdout.columns ?? 80;

// ─── Word-wrap ─────────────────────────────────────────────────────────────

/**
 * Wrap `text` to `width` columns. Continuation lines are prefixed with
 * `contIndent` so callers can align wrapped text under a hanging column.
 */
const wrap = (text: string, width: number, contIndent: string): string => {
	const words = text.split(' ');
	const lines: string[] = [];
	let current = '';
	for (const word of words) {
		if (current.length === 0) {
			current = word;
		} else if (current.length + 1 + word.length <= width) {
			current += ` ${word}`;
		} else {
			lines.push(current);
			current = word;
		}
	}
	if (current) {
		lines.push(current);
	}
	return lines.map((line, i) => (i === 0 ? line : contIndent + line)).join('\n');
};

// ─── Inline atoms ──────────────────────────────────────────────────────────

/** Paragraph; wraps to terminal width. */
export const p = (text: string): Node => ({
	kind: 'paragraph',
	text,
	render: () => wrap(text, getWidth(), ''),
});

/**
 * Styled usage line: `Usage: <name> <pattern>`.
 * "Usage:" is bold-green; `name` is bold-cyan; each space-separated
 * chunk of `pattern` is cyan.
 */
export const usage = (name: string, pattern: string): Node => ({
	kind: 'usage',
	name,
	pattern,
	render: () => `${bold(green('Usage:'))} ${bold(cyan(name))} ${
			pattern.split(' ').map(token => cyan(token)).join(' ')
		}`,
});

/** Literal footer text; no transformation. */
export const footer = (text: string): Node => ({
	kind: 'footer',
	text,
	render: () => text,
});

// ─── Block atoms ───────────────────────────────────────────────────────────

/**
 * Section with a bold-green `title:` heading followed by body nodes.
 * Body nodes are joined with `\n`; callers use `render()` to join
 * top-level sections with `\n\n`.
 */
export const section = (title: string, ...body: Node[]): Node => ({
	kind: 'section',
	title,
	body,
	render: () => {
		const heading = bold(green(`${title}:`));
		const content = body.map(node => node.render()).join('\n');
		return `${heading}\n${content}`;
	},
});

/** Two-column command table: name (cyan) + description. */
export const cmds = (commands: { name: string;
	description?: string; }[]): Node => ({
	kind: 'cmds',
	commands,
	render: () => {
		const width = getWidth();
		const nameWidth = Math.max(...commands.map(c => c.name.length));
		const descStart = 2 + nameWidth + 2;
		return commands
			.map(({ name, description }) => {
				const padding = ' '.repeat(nameWidth - name.length + 2);
				const nameCell = `  ${cyan(name)}${padding}`;
				if (!description) {
					return nameCell.trimEnd();
				}
				return `${nameCell}${wrap(description, width - descStart, ' '.repeat(descStart))}`;
			})
			.join('\n');
	},
});

// ─── Flag table atoms (atom-per-layout convention) ─────────────────────────

/**
 * Computes the display width of a flag cell (the left-hand column).
 * Calculated from visible characters only — ANSI codes are not counted.
 */
const flagCellLength = (flag: Flag): number => {
	// "  -x, --long <ARG>" broken down:
	// 2 (indent) + short-part + long-part
	if (flag.long) {
		// Has long form (most common case)
		const shortPart = flag.short ? flag.short.length + 2 : 4; // "-x, " or "    "
		const longPart = flag.arg
			? flag.long.length + 1 + flag.arg.length + 2 // --long <ARG>  (+2 for < >)
			: flag.long.length;
		return 2 + shortPart + longPart;
	}
	// Short-only flag (e.g. -h with no --help counterpart)
	const shortLength = flag.short ? flag.short.length + 1 : 0; // "-x"
	const argumentPart = flag.arg ? 1 + flag.arg.length + 2 : 0; // " <ARG>"
	return 2 + shortLength + argumentPart;
};

/** Renders the flag name cell (without leading indent). */
const renderFlagCell = (flag: Flag): string => {
	if (flag.long) {
		const longOpt = flag.arg
			? `${bold(cyan(flag.long))} ${cyan(`<${flag.arg}>`)}`
			: bold(cyan(flag.long));
		return flag.short
			? `${bold(cyan(`-${flag.short}`))}, ${longOpt}`
			: `    ${longOpt}`;
	}
	// Short-only flag: render as "  -x" (no long form, no indent prefix)
	const shortOpt = flag.short ? bold(cyan(`-${flag.short}`)) : '';
	const argumentSuffix = flag.arg ? ` ${cyan(`<${flag.arg}>`)}` : '';
	return `${shortOpt}${argumentSuffix}`;
};

/**
 * Atomic: inline layout — flag and description on the same line.
 * The flag-cell column is sized by the longest flag in the list.
 */
export const flagsInline = (flagList: Flag[]): Node => ({
	kind: 'flags-inline',
	flags: flagList,
	render: () => {
		const width = getWidth();
		const flagWidth = Math.max(...flagList.map(flagCellLength)) + 2;
		const contIndent = ' '.repeat(flagWidth);
		return flagList
			.map((flag) => {
				const gap = ' '.repeat(Math.max(flagWidth - flagCellLength(flag), 2));
				const desc = flag.description ?? '';
				return `  ${renderFlagCell(flag)}${gap}${wrap(desc, width - flagWidth, contIndent)}`;
			})
			.join('\n');
	},
});

/**
 * Atomic: hanging layout — flag on its own line, description indented
 * on the next line.
 */
export const flagsHanging = (flagList: Flag[]): Node => ({
	kind: 'flags-hanging',
	flags: flagList,
	render: () => {
		const width = getWidth();
		const hangIndent = '          ';
		return flagList
			.map((flag) => {
				const desc = flag.description ?? '';
				return `  ${renderFlagCell(flag)}\n${hangIndent}${wrap(desc, width - hangIndent.length, hangIndent)}`;
			})
			.join('\n');
	},
});

/**
 * Width threshold below which `flags` degrades from inline to hanging layout.
 */
const INLINE_THRESHOLD = 60;

/**
 * Smart wrapper that dispatches to `flagsHanging` when terminal width < INLINE_THRESHOLD (60),
 * otherwise delegates to `flagsInline`.
 *
 * Renderers own layout decisions. To force a specific layout, import
 * `flagsInline` or `flagsHanging` directly.
 */
export const flags = (flagList: Flag[]): Node => ({
	kind: 'flags',
	flags: flagList,
	render: () => {
		const narrow = getWidth() < INLINE_THRESHOLD;
		return (narrow ? flagsHanging(flagList) : flagsInline(flagList)).render();
	},
});
