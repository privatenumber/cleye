import { cyan } from 'ansis';
import stringWidth from 'string-width';
import {
	type Node,
	type Flag,
	renderFlagCell,
	flagCellLength,
} from './components.ts';

// Width-independent components are reused as-is from the static set.
export { usage, footer, section } from './components.ts';

// Display-width measure (handles CJK, emoji, and other wide characters).
const measureString = (text: string): number => stringWidth(text);

const getWidth = (): number => process.stdout.columns ?? 80;

/**
 * Width breakpoint below which `flags` degrades from the columns layout to the stacked layout.
 */
const BREAKPOINT = 60;

const wrap = (text: string, width: number, contIndent: string): string => {
	// Honor author-intended hard breaks: split on '\n' first, then space-wrap
	// each line independently. Blank lines survive as empty segments. The first
	// token seeds `current` even when empty, so leading indentation is
	// preserved rather than swallowed.
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
	return lines.map((line, index) => (index === 0 || line === '' ? line : contIndent + line)).join('\n');
};

export const p = (text: string): Node => ({
	kind: 'paragraph',
	text,
	render: () => wrap(text, getWidth(), ''),
});

export const cmds = (commands: { name: string;
	description?: string; }[]): Node => ({
	kind: 'cmds',
	commands,
	render: () => {
		if (commands.length === 0) {
			return '';
		}

		const width = getWidth();
		const nameWidth = Math.max(...commands.map(command => measureString(command.name)));
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

export const flagsColumns = (flagList: Flag[]): Node => ({
	kind: 'flags-columns',
	flags: flagList,
	render: () => {
		if (flagList.length === 0) {
			return '';
		}

		const width = getWidth();
		const flagWidth = Math.max(...flagList.map(flag => flagCellLength(flag, measureString))) + 2;
		const contIndent = ' '.repeat(flagWidth);
		return flagList
			.map((flag) => {
				const gap = ' '.repeat(Math.max(flagWidth - flagCellLength(flag, measureString), 2));
				const desc = flag.description ?? '';
				return `  ${renderFlagCell(flag)}${gap}${wrap(desc, width - flagWidth, contIndent)}`;
			})
			.join('\n');
	},
});

export const flagsStacked = (flagList: Flag[]): Node => ({
	kind: 'flags-stacked',
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

export const flags = (flagList: Flag[]): Node => ({
	kind: 'flags',
	flags: flagList,
	render: () => {
		const narrow = getWidth() < BREAKPOINT;
		return (narrow ? flagsStacked(flagList) : flagsColumns(flagList)).render();
	},
});
