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

const getWidth = (): number => process.stdout.columns ?? 80;

/**
 * Width threshold below which `flags` degrades from inline to hanging layout.
 */
const INLINE_THRESHOLD = 60;

export type CreateComponentsOptions = {

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
 * Build a component set parameterized by a string-measure function.
 */
export const createComponents = ({ measureString }: CreateComponentsOptions) => {
	const wrap = (text: string, width: number, contIndent: string): string => {
		// Honor author-intended hard breaks: split on '\n' first, then
		// space-wrap each line independently. Without this, an embedded '\n'
		// rides inside a "word" and the running length accumulates across it,
		// forcing spurious mid-line breaks (and never resetting at the author's
		// break). Blank lines survive as empty segments. The first token seeds
		// `current` even when empty, so leading indentation is preserved rather
		// than swallowed.
		const lines: string[] = [];
		for (const hardLine of text.split('\n')) {
			let current = '';
			let isFirst = true;
			for (const word of hardLine.split(' ')) {
				if (isFirst) {
					current = word;
					isFirst = false;
				} else if (measureString(current) + 1 + measureString(word) <= width) {
					current += ` ${word}`;
				} else {
					lines.push(current);
					current = word;
				}
			}
			lines.push(current);
		}
		// Indent continuation lines, but leave blank lines empty so a non-empty
		// contIndent doesn't introduce trailing whitespace.
		return lines.map((line, i) => (i === 0 || line === '' ? line : contIndent + line)).join('\n');
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
			if (commands.length === 0) {
				return '';
			}

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
			if (flagList.length === 0) {
				return '';
			}

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
			const descriptionIndent = ' '.repeat(Math.max(0, Math.min(hangIndent.length, width - 1)));
			const descriptionWidth = Math.max(width - descriptionIndent.length, 1);
			return flagList
				.map((flag) => {
					const flagLine = `  ${renderFlagCell(flag)}`;
					return flag.description
						? `${flagLine}\n${descriptionIndent}${wrap(flag.description, descriptionWidth, descriptionIndent)}`
						: flagLine;
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

export type Components = ReturnType<typeof createComponents>;

const defaultComponents = createComponents({ measureString: text => text.length });

export const {
	p, usage, footer, section, cmds, flagsInline, flagsHanging, flags,
} = defaultComponents;
