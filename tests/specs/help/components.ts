import { stripVTControlCharacters } from 'node:util';
import { describe, test, expect } from 'manten';
import { bold, cyan, green } from 'ansis';
import stringWidth from 'string-width';
import {
	p,
	usage,
	footer,
	section,
	cmds,
	flags,
	flagsInline,
	flagsHanging,
	type Flag,
} from '../../../src/render/components.ts';
import { cmds as responsiveCmds } from '../../../src/help/responsive.ts';
import { withColumns } from '../../utils/with-columns.ts';

process.stdout.columns = 80;

describe('components', () => {
	describe('p', () => {
		test('short text returns as-is', () => {
			const node = p('short');
			expect(node.kind).toBe('paragraph');
			expect(node.render()).toBe('short');
		});

		test('text longer than width wraps', () => {
			const restore = withColumns(20);
			try {
				const text = 'one two three four five six seven eight';
				const result = p(text).render();
				const lines = result.split('\n');
				expect(lines.length).toBeGreaterThan(1);
				for (const line of lines) {
					expect(line.length).toBeLessThanOrEqual(20);
				}
			} finally {
				restore();
			}
		});

		test('stores text as own property', () => {
			const node = p('hello');
			expect((node as unknown as { text: string }).text).toBe('hello');
		});
	});

	describe('usage', () => {
		test('renders styled usage line', () => {
			const node = usage('mycli', '[FLAGS] <arg>');
			expect(node.kind).toBe('usage');
			const result = node.render();
			expect(result).toContain(bold(green('Usage:')));
			expect(result).toContain(bold(cyan('mycli')));
			expect(result).toContain(cyan('[FLAGS]'));
			expect(result).toContain(cyan('<arg>'));
		});

		test('stores name and pattern as own properties', () => {
			const node = usage('cli', 'pattern');
			expect((node as unknown as { name: string;
				pattern: string; }).name).toBe('cli');
			expect((node as unknown as { name: string;
				pattern: string; }).pattern).toBe('pattern');
		});
	});

	describe('footer', () => {
		test('returns literal text unchanged', () => {
			const node = footer('see docs');
			expect(node.kind).toBe('footer');
			expect(node.render()).toBe('see docs');
		});
	});

	describe('section', () => {
		test('renders heading then body', () => {
			const body = p('body');
			const node = section('Options', body);
			expect(node.kind).toBe('section');
			const result = node.render();
			expect(result).toBe(`${bold(green('Options:'))}\nbody`);
		});

		test('stores title and body as own properties', () => {
			const child = p('x');
			const node = section('Title', child);
			expect((node as unknown as { title: string }).title).toBe('Title');
			expect((node as unknown as { body: unknown[] }).body).toContain(child);
		});

		test('multiple body nodes joined with newline', () => {
			const node = section('S', p('a'), p('b'));
			const result = node.render();
			expect(result).toBe(`${bold(green('S:'))}\na\nb`);
		});
	});

	describe('cmds', () => {
		test('aligns two commands in two columns', () => {
			const commands = [
				{ name: 'build' },
				{
					name: 'test',
					description: 'run tests',
				},
			];
			const node = cmds(commands);
			expect(node.kind).toBe('cmds');
			const result = node.render();
			const lines = result.split('\n');
			expect(lines).toHaveLength(2);
			// Both lines start with 2-space indent + styled name
			expect(lines[0]).toContain(cyan('build'));
			expect(lines[1]).toContain(cyan('test'));
			// Description appears in second line
			expect(lines[1]).toContain('run tests');
			// The description column starts at the same position in both lines
			const descCol = lines[1].indexOf('run tests');
			expect(descCol).toBeGreaterThan(lines[1].indexOf('test'));
		});

		test('no description renders just the name', () => {
			const result = cmds([{ name: 'run' }]).render();
			expect(result.trim()).not.toBe('');
			expect(result).toContain(cyan('run'));
		});

		test('CJK command names align description column (cleye/help/responsive)', () => {
			// '部署' has display width 4 (two 2-cell wide CJK chars); 'run' has width 3.
			// Default cmds uses .length, so this only holds for the responsive variant.
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
			const result = responsiveCmds(commands).render();
			const lines = result.split('\n').map(line => stripVTControlCharacters(line));
			const visualCol0 = stringWidth(lines[0].slice(0, lines[0].indexOf('deploy the app')));
			const visualCol1 = stringWidth(lines[1].slice(0, lines[1].indexOf('start dev server')));
			expect(visualCol0).toBe(visualCol1);
			const nameWidth = Math.max(...commands.map(c => stringWidth(c.name)));
			expect(visualCol0).toBe(2 + nameWidth + 2);
		});

		test('emoji command names align description column (cleye/help/responsive)', () => {
			// 'launch 🚀' has display width 9 (6 + space + rocket emoji(2)); 'short' has width 5.
			const commands = [
				{
					name: 'launch 🚀',
					description: 'deploy',
				},
				{
					name: 'short',
					description: 'do something',
				},
			];
			const result = responsiveCmds(commands).render();
			const lines = result.split('\n').map(line => stripVTControlCharacters(line));
			const visualCol0 = stringWidth(lines[0].slice(0, lines[0].indexOf('deploy')));
			const visualCol1 = stringWidth(lines[1].slice(0, lines[1].indexOf('do something')));
			expect(visualCol0).toBe(visualCol1);
			const nameWidth = Math.max(...commands.map(c => stringWidth(c.name)));
			expect(visualCol0).toBe(2 + nameWidth + 2);
		});
	});

	describe('flagsInline', () => {
		const testFlags: Flag[] = [
			{
				short: 'h',
				long: '--help',
				description: 'show help',
			},
			{
				long: '--verbose',
				description: 'enable verbose output',
			},
		];

		test('renders flag and description on the same line', () => {
			const node = flagsInline(testFlags);
			expect(node.kind).toBe('flags-inline');
			const result = node.render();
			const lines = result.split('\n');
			expect(lines).toHaveLength(2);
			// First line: -h, --help ... show help (all on one line)
			expect(lines[0]).toContain('show help');
			expect(lines[1]).toContain('enable verbose output');
		});

		test('description columns align across short+long and long-only', () => {
			const result = flagsInline(testFlags).render();
			const lines = result.split('\n');
			const descriptionColumn = (line: string, description: string) => {
				const stripped = stripVTControlCharacters(line);
				return stringWidth(stripped.slice(0, stripped.indexOf(description)));
			};
			expect(descriptionColumn(lines[0], 'show help'))
				.toBe(descriptionColumn(lines[1], 'enable verbose output'));
		});
	});

	describe('flagsHanging', () => {
		const testFlags: Flag[] = [
			{
				short: 'v',
				long: '--version',
				description: 'show version',
			},
		];

		test('renders flag on its own line, description indented below', () => {
			const node = flagsHanging(testFlags);
			expect(node.kind).toBe('flags-hanging');
			const result = node.render();
			const lines = result.split('\n');
			// At minimum 2 lines: flag line + description line
			expect(lines.length).toBeGreaterThanOrEqual(2);
			expect(lines[0]).toContain(bold(cyan('--version')));
			expect(lines[1]).toContain('show version');
			// Description line is indented
			expect(lines[1]).toMatch(/^\s+/);
		});
	});

	describe('flags smart wrapper', () => {
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

		test('width 80 uses inline layout', () => {
			const restore = withColumns(80);
			try {
				const inlineResult = flagsInline(testFlags).render();
				const smartResult = flags(testFlags).render();
				expect(smartResult).toBe(inlineResult);
			} finally {
				restore();
			}
		});

		test('width 40 uses hanging layout', () => {
			const restore = withColumns(40);
			try {
				const hangingResult = flagsHanging(testFlags).render();
				const smartResult = flags(testFlags).render();
				expect(smartResult).toBe(hangingResult);
			} finally {
				restore();
			}
		});

		test('stores kind and flags as own properties', () => {
			const node = flags(testFlags);
			expect(node.kind).toBe('flags');
			expect((node as unknown as { flags: Flag[] }).flags).toBe(testFlags);
		});
	});

	describe('debuggability', () => {
		test('tree is JSON-serializable with kind and data fields visible', () => {
			const tree = [
				p('description'),
				section('Options', flagsInline([{
					long: '--help',
					description: 'help',
				}])),
				footer('see docs'),
			];

			const replacer = (_key: string, value: unknown) => (typeof value === 'function' ? '[fn]' : value);

			const serialized = JSON.parse(JSON.stringify(tree, replacer)) as unknown[];

			// Top-level array has 3 nodes
			expect(serialized).toHaveLength(3);

			const [pNode, sectionNode, footerNode] = serialized as [
				{ kind: string;
					text: string;
					render: string; },
				{ kind: string;
					title: string;
					body: unknown[];
					render: string; },
				{ kind: string;
					text: string;
					render: string; },
			];

			expect(pNode.kind).toBe('paragraph');
			expect(pNode.text).toBe('description');
			expect(pNode.render).toBe('[fn]');

			expect(sectionNode.kind).toBe('section');
			expect(sectionNode.title).toBe('Options');
			expect(sectionNode.body).toHaveLength(1);

			expect(footerNode.kind).toBe('footer');
			expect(footerNode.text).toBe('see docs');
		});
	});
}, { parallel: false });
