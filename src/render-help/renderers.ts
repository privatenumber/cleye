import tty from 'tty';
import terminalColumns, {
	breakpoints,
	type Options as TerminalColumnsOptions,
} from 'terminal-columns';
import type { HelpDocumentNode } from '../types';
import type { FlagData } from './render-flags';

type TypeFunction = (value: any) => any;

/**
 * process.stdout.hasColors() may not be available if stdout is not a TTY,
 * but whether the viewer can render colors is an environment concern:
 * https://github.com/nodejs/node/blob/v18.0.0/lib/internal/tty.js#L106
 *
 * In the future, they may deprecate the prototype method in favor of a
 * standalone function:
 * https://github.com/nodejs/node/pull/40240
 */
const stdoutHasColors = tty.WriteStream.prototype.hasColors();

type HelpDocumentNodeOrString<Type extends PropertyKey> = string | HelpDocumentNode<Type>;
export class Renderers {
	// Useful for associating an id with data:
	// { id: 'title', type: 'string' }
	text(text: string) {
		return text;
	}

	bold(text: string) {
		return stdoutHasColors
			? `\u001B[1m${text}\u001B[22m`
			: text.toLocaleUpperCase();
	}

	indentText({ text, spaces }: { text: string;
		spaces: number; }) {
		return text.replaceAll(/^/gm, ' '.repeat(spaces));
	}

	heading(text: string) {
		return this.bold(text);
	}

	section({
		title,
		body,
		indentBody = 2,
	}: {
		title?: string;
		body?: string;
		indentBody?: number;
	}) {
		return (
			`${
				(
					title
						? `${this.heading(title)}\n`
						: ''
				)
				+ (
					body
						? this.indentText({
							text: this.render(body),
							spaces: indentBody,
						})
						: ''
				)
			}\n`
		);
	}

	table({
		tableData,
		tableOptions,
		tableBreakpoints,
	}: {
		tableData: string[][];
		tableOptions?: TerminalColumnsOptions;
		tableBreakpoints?: Record<string, TerminalColumnsOptions>;
	}) {
		return terminalColumns(
			tableData.map(row => row.map(cell => this.render(cell))),
			tableBreakpoints ? breakpoints(tableBreakpoints) : tableOptions,
		);
	}

	flagParameter(
		typeFunction: TypeFunction | readonly [TypeFunction],
	): string {
		if (typeFunction === Boolean) {
			return '';
		}

		if (typeFunction === String) {
			return '<string>';
		}

		if (typeFunction === Number) {
			return '<number>';
		}

		if (Array.isArray(typeFunction)) {
			return this.flagParameter(typeFunction[0]);
		}

		return '<value>';
	}

	flagOperator(_: FlagData) {
		return ' ';
	}

	flagName(flagData: FlagData) {
		const {
			flag,
			flagFormatted,
			aliasesEnabled,
			aliasFormatted,
		} = flagData;
		let flagText = '';

		if (aliasFormatted) {
			flagText += `${aliasFormatted}, `;
		} else if (aliasesEnabled) {
			flagText += '    ';
		}

		flagText += flagFormatted;

		if ('placeholder' in flag && typeof flag.placeholder === 'string') {
			flagText += `${this.flagOperator(flagData)}${flag.placeholder}`;
		} else {
			// Test: default flag for String type short-hand
			const flagPlaceholder = this.flagParameter('type' in flag ? flag.type : flag);
			if (flagPlaceholder) {
				flagText += `${this.flagOperator(flagData)}${flagPlaceholder}`;
			}
		}

		return flagText;
	}

	flagDefault(value: any) {
		return JSON.stringify(value);
	}

	flagDescription({ flag }: FlagData) {
		let descriptionText = 'description' in flag ? (flag.description ?? '') : '';

		if ('default' in flag) {
			let { default: flagDefault } = flag;

			if (typeof flagDefault === 'function') {
				flagDefault = flagDefault();
			}

			if (flagDefault) {
				descriptionText += ` (default: ${this.flagDefault(flagDefault)})`;
			}
		}

		return descriptionText;
	}

	render(
		nodes: (
			HelpDocumentNodeOrString<keyof this>
			| HelpDocumentNodeOrString<keyof this>[]
		),
	): string {
		if (typeof nodes === 'string') {
			return nodes;
		}

		if (Array.isArray(nodes)) {
			return nodes.map(node => this.render(node)).join('\n');
		}

		if ('type' in nodes && this[nodes.type]) {
			const renderer = this[nodes.type];
			if (typeof renderer === 'function') {
				return renderer.call(this, nodes.data);
			}
		}

		throw new Error(`Invalid node type: ${JSON.stringify(nodes)}`);
	}
}
