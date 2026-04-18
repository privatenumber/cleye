import stringWidth from 'string-width';
import type { Options as TerminalColumnsOptions } from 'terminal-columns';

type ColumnConfig = {
	paddingLeft?: number;
	paddingRight?: number;
};

const columnsFromConfig = (config: unknown): ColumnConfig[] | undefined => {
	if (Array.isArray(config)) {
		return config as ColumnConfig[];
	}
	if (
		config
		&& typeof config === 'object'
		&& 'columns' in config
		&& Array.isArray((config as { columns: unknown }).columns)
	) {
		return (config as { columns: ColumnConfig[] }).columns;
	}
	return undefined;
};

const extractColumnConfigs = (
	tableOptions: unknown,
	tableBreakpoints: unknown,
): ColumnConfig[] => {
	const fromOptions = columnsFromConfig(tableOptions);
	if (fromOptions) {
		return fromOptions;
	}
	if (tableBreakpoints && typeof tableBreakpoints === 'object') {
		// Responsive breakpoints are sorted widest-first by convention (e.g.
		// `'> 80'`, `'> 40'`, `'> 0'`). The widest entry is the closest match
		// to "no wrapping", which is what the default renderer targets.
		const firstEntry = Object.values(tableBreakpoints as Record<string, unknown>)[0];
		const fromBreakpoint = columnsFromConfig(firstEntry);
		if (fromBreakpoint) {
			return fromBreakpoint;
		}
	}
	return [];
};

type RenderPaddedTableArgs = {
	tableData: string[][];
	// Types come from `terminal-columns` (type-only import — not bundled).
	// The default renderer consumes only the padding fields; other fields
	// (width, stdoutColumns, etc.) are honored by the responsive renderer
	// (`cleye/renderers/responsive`) which actually calls `terminalColumns`.
	tableOptions?: TerminalColumnsOptions;
	tableBreakpoints?: Record<string, TerminalColumnsOptions>;
};

export const renderPaddedTable = (
	{ tableData, tableOptions, tableBreakpoints }: RenderPaddedTableArgs,
	renderCell: (cell: string) => string,
): string => {
	// Default renders plain padded columns — no wrapping, no terminal-width
	// awareness. For responsive/wrap-aware output, use `cleye/renderers/responsive`.
	// Widths are measured after stripping ANSI escape sequences so colored
	// cells align correctly.
	const renderedRows = tableData.map(
		row => row.map(cell => renderCell(cell)),
	);
	if (renderedRows.length === 0) {
		return '';
	}

	const columnConfigs = extractColumnConfigs(tableOptions, tableBreakpoints);
	const columnCount = renderedRows[0].length;
	const lastColumnIndex = columnCount - 1;
	const columnWidths = Array.from({ length: columnCount }, (_, columnIndex) => (
		Math.max(
			...renderedRows.map(row => stringWidth(row[columnIndex] ?? '')),
		)
	));

	return renderedRows
		.map(row => row
			.map((cell, columnIndex) => {
				const config = columnConfigs[columnIndex] ?? {};
				const paddingLeft = ' '.repeat(config.paddingLeft ?? 0);
				// Last column is variable-width: no content padding, no
				// paddingRight. Matches terminal-columns's behavior when
				// the trailing column is `width: 'auto'` on a wide
				// terminal, and avoids spurious trailing whitespace.
				if (columnIndex === lastColumnIndex) {
					return paddingLeft + cell;
				}
				const paddingRight = ' '.repeat(config.paddingRight ?? 0);
				const visibleWidth = stringWidth(cell);
				const contentPadding = ' '.repeat(
					Math.max(0, columnWidths[columnIndex] - visibleWidth),
				);
				return paddingLeft + cell + contentPadding + paddingRight;
			})
			.join(''))
		.join('\n');
};
