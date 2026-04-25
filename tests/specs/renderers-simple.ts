import { stripVTControlCharacters } from 'node:util';
import { describe, test, expect } from 'manten';
import { mockEnvFunctions } from '../utils/mock-env-functions.ts';
import { renderPaddedTable } from '../../src/renderers/simple.ts';
import { cli } from '#cleye';

describe('renderers/simple', () => {
	describe('renderPaddedTable', () => {
		test('basic padding with array-form tableOptions', () => {
			const result = renderPaddedTable(
				{
					tableData: [['a', 'b'], ['cc', 'd']],
					tableOptions: [{
						paddingLeft: 2,
						paddingRight: 1,
					}, {}],
				},
				cell => cell,
			);
			// col0 width = max(1, 2) = 2
			// row 0: "  " + "a" + contentPad(1) + " " + "b" = "  a  b"
			// row 1: "  " + "cc" + contentPad(0) + " " + "d" = "  cc d"
			expect(result).toBe('  a  b\n  cc d');
		});

		test('aligns CJK characters by display width', () => {
			const result = renderPaddedTable(
				{
					tableData: [['日本', 'jp'], ['abc', 'en']],
					tableOptions: [{ paddingRight: 1 }, {}],
				},
				cell => cell,
			);
			// 日本 has display width 4, abc has display width 3 → column width is 4.
			// row 0: 日本 + 0 content-pad + 1 right-pad + jp
			// row 1: abc + 1 content-pad + 1 right-pad + en
			expect(result).toBe('日本 jp\nabc  en');
		});

		test('respects object-form tableOptions', () => {
			const result = renderPaddedTable(
				{
					tableData: [['a', 'b']],
					tableOptions: {
						columns: [
							{
								paddingLeft: 2,
								paddingRight: 3,
							},
							{},
						],
					},
				},
				cell => cell,
			);
			// col0: paddingLeft=2 + 'a' + 0 content-pad + paddingRight=3
			// col1 (last): no padding, just 'b'
			expect(result).toBe('  a   b');
		});

		test('empty tableData returns empty string', () => {
			expect(renderPaddedTable({ tableData: [] }, cell => cell)).toBe('');
		});

		test('last column has no right padding', () => {
			const result = renderPaddedTable(
				{
					tableData: [['a', 'b']],
					tableOptions: [{}, { paddingRight: 5 }],
				},
				cell => cell,
			);
			// Last column paddingRight is ignored — no trailing whitespace.
			expect(result).toBe('ab');
		});

		test('falls back to widest tableBreakpoints entry when tableOptions is absent', () => {
			const result = renderPaddedTable(
				{
					tableData: [['a', 'b']],
					tableBreakpoints: {
						'> 80': [{ paddingLeft: 3 }, {}],
						'> 0': { columns: [{ paddingLeft: 99 }, {}] },
					},
				},
				cell => cell,
			);
			// First entry ('> 80') wins → col0 gets paddingLeft=3, col1 is last (no pad).
			expect(result).toBe('   ab');
		});

		test('renderCell is applied to every cell', () => {
			expect(
				renderPaddedTable({ tableData: [['a', 'b']] }, cell => cell.toUpperCase()),
			).toBe('AB');
		});
	});

	describe('default Renderers.table() integration', () => {
		const testFlags = {
			flagA: {
				type: String,
				description: 'A long description for flag-a to test wrapping behavior.',
				alias: 'a',
			},
			flagB: {
				type: Number,
				description: 'A long description for flag-b to test wrapping behavior.',
				alias: 'b',
			},
		};

		test('output at any width contains flag names and descriptions', async () => {
			const mocked = mockEnvFunctions();
			await cli({
				name: 'test-cli',
				flags: testFlags,
			}, undefined, ['--help']);
			const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0]);
			mocked.restore();

			// Regardless of terminal width, flag names and descriptions are present.
			expect(output).toContain('-a, --flag-a');
			expect(output).toContain('A long description for flag-a');
			expect(output).toContain('-b, --flag-b');
			expect(output).toContain('A long description for flag-b');
		});

		test('flag descriptions stay on the same line as their flag', async () => {
			const mocked = mockEnvFunctions();
			await cli({ flags: testFlags }, undefined, ['--help']);
			mocked.restore();

			const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0]);
			const flagALine = output
				.split('\n')
				.find(line => line.includes('-a, --flag-a'));
			expect(flagALine).toContain('A long description for flag-a');
		});
	});
});
