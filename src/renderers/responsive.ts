import {
	terminalColumns,
	breakpoints as makeBreakpoints,
	type Options as TerminalColumnsOptions,
} from 'terminal-columns';
import type { HelpDocumentNode } from '../types.ts';
import type { Renderers } from '../render-help/renderers.ts';

export type ResponsiveRendererOptions = {

	/**
	 * Override the default responsive breakpoints used by the flag and
	 * command tables. Keys are threshold expressions like `'> 80'`,
	 * `'> 40'`, `'> 0'` — values are column configs passed to
	 * [terminal-columns](https://github.com/privatenumber/terminal-columns).
	 *
	 * If omitted, the breakpoints defined on each table node (via
	 * `renderFlags()` and `getCommands()`) are used.
	 */
	breakpoints?: Record<string, TerminalColumnsOptions>;
};

type TableData = {
	tableData: string[][];
	tableOptions?: TerminalColumnsOptions;
	tableBreakpoints?: Record<string, TerminalColumnsOptions>;
};

type Renderer = (
	nodes: HelpDocumentNode[],
	renderers: Renderers,
) => string;

/**
 * Create a `help.render` function that uses
 * [terminal-columns](https://github.com/privatenumber/terminal-columns) to
 * render flag and command tables responsively — wrapping descriptions onto
 * the next line on narrow terminals.
 *
 * @example
 * ```ts
 * import { cli } from 'cleye'
 * import { createRenderer } from 'cleye/renderers/responsive'
 *
 * await cli({
 *   help: {
 *     render: createRenderer(),
 *   },
 * })
 * ```
 */
export const createRenderer = (
	options: ResponsiveRendererOptions = {},
): Renderer => (
	(nodes, renderers) => {
		// Prototype-chained copy so the user's shared Renderers instance is
		// not mutated. Overrides `table` with the terminal-columns-backed impl.
		const responsive = Object.create(renderers) as Renderers;
		responsive.table = function tableResponsive({
			tableData,
			tableOptions,
			tableBreakpoints,
		}: TableData) {
			const renderedRows = tableData.map(
				row => row.map(cell => this.render(cell)),
			);
			const effectiveBreakpoints = options.breakpoints ?? tableBreakpoints;

			return terminalColumns(
				renderedRows,
				effectiveBreakpoints
					? makeBreakpoints(effectiveBreakpoints)
					: tableOptions,
			);
		};
		return responsive.render(nodes);
	}
);
