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

/**
 * Width threshold below which `flags` degrades from inline to hanging layout.
 */
const INLINE_THRESHOLD = 60;

export type CreateAtomsOptions = {

	/**
	 * Function used to compute the visible width of a string.
	 *
	 * The default `cleye/help` exports use `text => text.length`, which is
	 * correct for ASCII. CLIs with CJK or emoji content can opt into accurate
	 * display-width alignment via `cleye/help/responsive`, which passes
	 * `stringWidth` from the `string-width` package.
	 */
	measureString: (text: string) => number;
};

/**
 * Build an atom set parameterized by a string-measure function.
 */
export const createAtoms = ({ measureString }: CreateAtomsOptions) => {
	const wrap = (text: string, width: number, contIndent: string): string => {
		const words = text.split(' ');
		const lines: string[] = [];
		let current = '';
		for (const word of words) {
			if (current.length === 0) {
				current = word;
			} else if (measureString(current) + 1 + measureString(word) <= width) {
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

	const p = (text: string): Node => ({
		kind: 'paragraph',
		text,
		render: () => wrap(text, getWidth(), ''),
	});

	const usage = (name: string, pattern: string): Node => ({
		kind: 'usage',
		name,
		pattern,
		render: () => `${bold(green('Usage:'))} ${bold(cyan(name))} ${
			pattern.split(' ').map(token => cyan(token)).join(' ')
		}`,
	});

	const footer = (text: string): Node => ({
		kind: 'footer',
		text,
		render: () => text,
	});

	const section = (title: string, ...body: Node[]): Node => ({
		kind: 'section',
		title,
		body,
		render: () => {
			const heading = bold(green(`${title}:`));
			const content = body.map(node => node.render()).join('\n');
			return `${heading}\n${content}`;
		},
	});

	const cmds = (commands: { name: string;
		description?: string; }[]): Node => ({
		kind: 'cmds',
		commands,
		render: () => {
			const width = getWidth();
			const nameWidth = Math.max(...commands.map(c => measureString(c.name)));
			const descStart = 2 + nameWidth + 2;
			return commands
				.map(({ name, description }) => {
					const padding = ' '.repeat(nameWidth - measureString(name) + 2);
					const nameCell = `  ${cyan(name)}${padding}`;
					if (!description) {
						return nameCell.trimEnd();
					}
					return `${nameCell}${wrap(description, width - descStart, ' '.repeat(descStart))}`;
				})
				.join('\n');
		},
	});

	const flagCellLength = (flag: Flag): number => {
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

	const renderFlagCell = (flag: Flag): string => {
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

	const flagsInline = (flagList: Flag[]): Node => ({
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

	const flagsHanging = (flagList: Flag[]): Node => ({
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

	const flags = (flagList: Flag[]): Node => ({
		kind: 'flags',
		flags: flagList,
		render: () => {
			const narrow = getWidth() < INLINE_THRESHOLD;
			return (narrow ? flagsHanging(flagList) : flagsInline(flagList)).render();
		},
	});

	return {
		p,
		usage,
		footer,
		section,
		cmds,
		flagsInline,
		flagsHanging,
		flags,
	};
};

export type Atoms = ReturnType<typeof createAtoms>;

const defaultAtoms = createAtoms({ measureString: text => text.length });

export const {
	p, usage, footer, section, cmds, flagsInline, flagsHanging, flags,
} = defaultAtoms;
