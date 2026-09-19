import ansis, { bold } from 'ansis';
import {
	terminalColumns,
	breakpoints,
	type Options as TerminalColumnsOptions,
} from 'terminal-columns';
import { isStandardSchema } from 'type-flag';
import type { HelpDocumentNode } from '../types.ts';
import type { FlagData } from './render-flags.ts';

type HelpDocumentNodeOrString<Type extends PropertyKey> = string | HelpDocumentNode<Type>;
export class Renderers {
	// Useful for associating an id with data:
	// { id: 'title', type: 'string' }
	text(text: string) {
		return text;
	}

	bold(text: string) {
		return ansis.level > 0 ? bold(text) : text.toLocaleUpperCase();
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
		typeFunction: unknown,
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

		// A Standard Schema is the flag type itself, not a flag options object
		const isSchema = isStandardSchema(flag);

		if (!isSchema && 'placeholder' in flag && typeof flag.placeholder === 'string') {
			flagText += `${this.flagOperator(flagData)}${flag.placeholder}`;
		} else {
			const flagPlaceholder = this.flagParameter(!isSchema && 'type' in flag ? flag.type : flag);
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
		// A Standard Schema is the flag type itself, not a flag options object
		if (isStandardSchema(flag)) {
			return '';
		}

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
