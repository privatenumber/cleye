import { stripVTControlCharacters } from 'node:util';
import { describe, test, expect } from 'manten';
import stringWidth from 'string-width';
import {
	defaultHelp,
	cmds,
	flagsInline,
	type Flag,
} from '../../src/help/responsive.ts';
import { cli } from '#cleye';

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

	test('flagsInline aligns description column for CJK arg labels', () => {
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
		const result = flagsInline(testFlags).render();
		const lines = result.split('\n').map(line => stripVTControlCharacters(line));
		const col0 = stringWidth(lines[0].slice(0, lines[0].indexOf('attach a label')));
		const col1 = stringWidth(lines[1].slice(0, lines[1].indexOf('silent mode')));
		expect(col0).toBe(col1);
	});

	test('defaultHelp can be plugged into cli() via help.render', async () => {
		const logged: string[] = [];
		const originalLog = console.log;
		console.log = (text: string) => {
			logged.push(text);
		};
		const originalExit = process.exit;
		// @ts-expect-error noop exit during help
		process.exit = () => {};
		try {
			cli({
				name: 'tool',
				flags: { verbose: Boolean },
				help: { render: defaultHelp },
			}, undefined, ['--help']);
		} finally {
			console.log = originalLog;
			process.exit = originalExit;
		}
		expect(logged.length).toBe(1);
		expect(logged[0]).toContain('tool');
		expect(logged[0]).toContain('--verbose');
	});
});
