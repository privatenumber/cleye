import { stripVTControlCharacters } from 'node:util';
import { describe, test, expect } from 'manten';
import stringWidth from 'string-width';
import { cli } from '#cleye';
import {
	p,
	defaultHelp,
	render,
	cmds,
	flagsColumns,
	flagsStacked,
	flags,
	type Flag,
} from '../../../src/help/responsive.ts';
import { mockEnvFunctions } from '../../utils/mock-env-functions.ts';
import { withColumns } from '../../utils/with-columns.ts';

process.stdout.columns = 80;

describe('cleye/help/responsive', () => {
	test('cmds aligns description column for CJK names', () => {
		// '部署' display width 4 vs 'run' width 3.
		const commands = [
			{
				name: '部署',
				description: 'deploy the app',
			},
			{
				name: 'run',
				description: 'start dev server',
			},
		];
		const result = cmds(commands).render();
		const lines = result.split('\n').map(line => stripVTControlCharacters(line));
		const col0 = stringWidth(lines[0].slice(0, lines[0].indexOf('deploy the app')));
		const col1 = stringWidth(lines[1].slice(0, lines[1].indexOf('start dev server')));
		expect(col0).toBe(col1);
		expect(col0).toBe(2 + 4 + 2);
	});

	test('flagsColumns aligns description column for CJK arg labels', () => {
		const testFlags: Flag[] = [
			{
				short: 'l',
				long: '--label',
				arg: '名前',
				description: 'attach a label',
			},
			{
				long: '--quiet',
				description: 'silent mode',
			},
		];
		const result = flagsColumns(testFlags).render();
		const lines = result.split('\n').map(line => stripVTControlCharacters(line));
		const col0 = stringWidth(lines[0].slice(0, lines[0].indexOf('attach a label')));
		const col1 = stringWidth(lines[1].slice(0, lines[1].indexOf('silent mode')));
		expect(col0).toBe(col1);
	});

	test('defaultHelp can be plugged into cli() via help.render', () => {
		const mocked = mockEnvFunctions();
		cli({
			name: 'tool',
			flags: { verbose: Boolean },
			help: { render: defaultHelp },
		}, undefined, ['--help']);
		mocked.restore();

		expect(mocked.consoleLog.calls.length).toBe(1);
		expect(mocked.consoleLog.calls[0][0]).toContain('tool');
		expect(mocked.consoleLog.calls[0][0]).toContain('--verbose');
	});

	test('examples render verbatim, preserving line breaks (shared with cleye/help)', () => {
		const restore = withColumns(20);
		try {
			const output = stripVTControlCharacters(render(...defaultHelp({
				name: 'tool',
				help: {
					examples: [
						'tool 検索 alpha',
						'tool 取得 bravo',
					],
				},
			})));
			// Block exceeds 20 columns, but each example stays intact — the
			// responsive variant shares the same verbatim examples rendering.
			expect(output).toContain('tool 検索 alpha');
			expect(output).toContain('tool 取得 bravo');
		} finally {
			restore();
		}
	});

	test('p wraps text to the terminal width', () => {
		const restore = withColumns(20);
		try {
			const lines = p('one two three four five six seven eight').render().split('\n');
			expect(lines.length).toBeGreaterThan(1);
			for (const line of lines) {
				expect(line.length).toBeLessThanOrEqual(20);
			}
		} finally {
			restore();
		}
	});

	test('p wraps within a single author line that exceeds the width', () => {
		const restore = withColumns(12);
		try {
			// First authored line (14) exceeds 12 so it wraps; the second line
			// (11) fits and stays whole.
			expect(p('aaaa bbbb cccc\nddd eee fff').render())
				.toBe('aaaa bbbb\ncccc\nddd eee fff');
		} finally {
			restore();
		}
	});

	test('flags uses columns layout at a wide width', () => {
		const restore = withColumns(80);
		try {
			const testFlags: Flag[] = [
				{
					short: 'h',
					long: '--help',
					description: 'show help',
				},
				{
					long: '--output',
					arg: 'FILE',
					description: 'output file',
				},
			];
			expect(flags(testFlags).render()).toBe(flagsColumns(testFlags).render());
		} finally {
			restore();
		}
	});

	test('flags degrades to stacked layout at a narrow width', () => {
		const restore = withColumns(40);
		try {
			const testFlags: Flag[] = [
				{
					short: 'h',
					long: '--help',
					description: 'show help',
				},
				{
					long: '--output',
					arg: 'FILE',
					description: 'output file',
				},
			];
			expect(flags(testFlags).render()).toBe(flagsStacked(testFlags).render());
		} finally {
			restore();
		}
	});

	test('flagsStacked keeps descriptions visible at very narrow widths', () => {
		const restore = withColumns(8);
		try {
			const result = flagsStacked([{
				short: 'v',
				long: '--version',
				description: 'show version',
			}]).render();
			const lines = result.split('\n').map(line => stripVTControlCharacters(line));
			expect(lines[0]).toContain('-v, --version');
			expect(lines[1]).toBe('       show');
			expect(lines[2]).toBe('       version');
		} finally {
			restore();
		}
	});

	test('cmds renders empty output for no commands', () => {
		expect(cmds([]).render()).toBe('');
	});

	test('cmds omits the description column for a command without a description', () => {
		const result = stripVTControlCharacters(
			cmds([{ name: 'build' }, {
				name: 'test',
				description: 'run tests',
			}]).render(),
		);
		expect(result.split('\n')[0]).toBe('  build');
	});

	test('flagsColumns renders empty output for no flags', () => {
		expect(flagsColumns([]).render()).toBe('');
	});
}, { parallel: false });
