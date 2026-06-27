import { bold, cyan, green } from 'ansis';

/**
 * A help-document node. Inspectable as data (debuggable via console.log)
 * AND callable for rendering (open-ended dispatch via .render method).
 *
 * `kind` is informational only — used for debugging and optional filtering.
 * Dispatch is via `.render()`, not a switch on `kind`, so users can add
 * their own components by returning any object matching this shape.
 */
export type Node = {
	readonly kind: string;
	render: () => string;
	readonly [key: string]: unknown;
};

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

/**
 * The help component set. `cleye/help` (and `cli()`) use a static
 * implementation: aligned columns, but no terminal-width awareness and no
 * wrapping — long content overflows. `cleye/help/responsive` provides a
 * width-adaptive implementation (wrapping + columns/stacked layout).
 */
export type Components = {
	p: (text: string) => Node;
	usage: (name: string, pattern: string) => Node;
	footer: (text: string) => Node;
	section: (title: string, ...body: Node[]) => Node;
	cmds: (commands: { name: string;
		description?: string; }[]) => Node;
	flagsColumns: (flags: Flag[]) => Node;
	flagsStacked: (flags: Flag[]) => Node;
	flags: (flags: Flag[]) => Node;
};

// Static measure: a column is one terminal cell per code unit. Correct for the
// ASCII baseline; wide characters are approximated. `cleye/help/responsive`
// measures display width accurately.
const length = (text: string): number => text.length;

// ── Width-agnostic building blocks (shared with the responsive variant) ───

export const usage = (name: string, pattern: string): Node => ({
	kind: 'usage',
	name,
	pattern,
	render: () => `${bold(green('Usage:'))} ${bold(cyan(name))} ${
		pattern.split(' ').map(token => cyan(token)).join(' ')
	}`,
});

export const footer = (text: string): Node => ({
	kind: 'footer',
	text,
	render: () => text,
});

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

export const renderFlagCell = (flag: Flag): string => {
	if (flag.long) {
		const longOpt = flag.arg
			? `${bold(cyan(flag.long))} ${cyan(`<${flag.arg}>`)}`
			: bold(cyan(flag.long));
		return flag.short
			? `${bold(cyan(`-${flag.short}`))}, ${longOpt}`
			: `    ${longOpt}`;
	}
	const shortOpt = flag.short ? bold(cyan(`-${flag.short}`)) : '';
	const argumentSuffix = flag.arg ? ` ${cyan(`<${flag.arg}>`)}` : '';
	return `${shortOpt}${argumentSuffix}`;
};

export const flagCellLength = (
	flag: Flag,
	measureString: (text: string) => number,
): number => {
	if (flag.long) {
		const shortPart = flag.short ? measureString(flag.short) + 3 : 4; // "-x, " or "    "
		const longPart = flag.arg
			? measureString(flag.long) + 1 + measureString(flag.arg) + 2 // --long <ARG>  (+2 for < >)
			: measureString(flag.long);
		return 2 + shortPart + longPart;
	}
	const shortLength = flag.short ? measureString(flag.short) + 1 : 0; // "-x"
	const argumentPart = flag.arg ? 1 + measureString(flag.arg) + 2 : 0; // " <ARG>"
	return 2 + shortLength + argumentPart;
};

/**
 * Indent continuation lines (after author-intended `\n` breaks) to a column,
 * leaving blank lines empty so a non-empty indent introduces no trailing
 * whitespace. Unlike the responsive `wrap`, this never breaks on width.
 */
export const indentContinuations = (text: string, indent: string): string => (
	text
		.split('\n')
		.map((line, index) => (index === 0 || line === '' ? line : indent + line))
		.join('\n')
);

/**
 * Align a list of cells into a padded column. Each `cell` already includes its
 * leading indent, and `width` is its full visible width (including that
 * indent). Returns each row's prefix (cell padded to the widest plus a 2-space
 * gap) and the column at which descriptions begin. Purely content-driven —
 * independent of terminal width.
 */
export const alignColumn = (
	rows: { cell: string;
		width: number; }[],
): { prefixes: string[];
	descriptionColumn: number; } => {
	const descriptionColumn = Math.max(...rows.map(row => row.width)) + 2;
	return {
		prefixes: rows.map(row => `${row.cell}${' '.repeat(descriptionColumn - row.width)}`),
		descriptionColumn,
	};
};

const renderColumnList = (
	rows: { cell: string;
		width: number;
		description?: string; }[],
): string => {
	if (rows.length === 0) {
		return '';
	}
	const { prefixes, descriptionColumn } = alignColumn(rows);
	const indent = ' '.repeat(descriptionColumn);
	return rows
		.map((row, index) => (
			row.description
				? `${prefixes[index]}${indentContinuations(row.description, indent)}`
				: prefixes[index].trimEnd()
		))
		.join('\n');
};

// ── Static components (used by `cleye/help` and `cli()`) ──────────────────

export const p = (text: string): Node => ({
	kind: 'paragraph',
	text,
	render: () => text,
});

export const cmds = (commands: { name: string;
	description?: string; }[]): Node => ({
	kind: 'cmds',
	commands,
	render: () => renderColumnList(
		commands.map(command => ({
			cell: `  ${cyan(command.name)}`,
			width: 2 + length(command.name),
			description: command.description,
		})),
	),
});

export const flagsColumns = (flagList: Flag[]): Node => ({
	kind: 'flags-columns',
	flags: flagList,
	render: () => renderColumnList(
		flagList.map(flag => ({
			// `flagCellLength` already accounts for the leading 2-space indent,
			// so the cell includes it and `width` matches.
			cell: `  ${renderFlagCell(flag)}`,
			width: flagCellLength(flag, length),
			description: flag.description,
		})),
	),
});

export const flagsStacked = (flagList: Flag[]): Node => ({
	kind: 'flags-stacked',
	flags: flagList,
	render: () => {
		const indent = '          ';
		return flagList
			.map((flag) => {
				const flagLine = `  ${renderFlagCell(flag)}`;
				return flag.description
					? `${flagLine}\n${indent}${indentContinuations(flag.description, indent)}`
					: flagLine;
			})
			.join('\n');
	},
});

// The static default never inspects terminal width, so flags always use the columns layout.
export const flags = (flagList: Flag[]): Node => ({
	kind: 'flags',
	flags: flagList,
	render: () => flagsColumns(flagList).render(),
});
