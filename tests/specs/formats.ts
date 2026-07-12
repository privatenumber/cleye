import { describe, test, expect } from 'manten';
import { expectTypeOf } from 'expect-type';
import { cli } from '#cleye';
import {
	OneOf,
	CommaList,
	Integer,
	Float,
	Range,
	Url,
} from '../../src/formats.ts';

describe('formats', () => {
	describe('OneOf', () => {
		test('returns valid value', () => {
			const parser = OneOf(['json', 'yaml', 'csv']);
			expect(parser('json')).toBe('json');
			expect(parser('yaml')).toBe('yaml');
		});

		test('throws on invalid value', () => {
			const parser = OneOf(['json', 'yaml', 'csv']);
			expect(() => parser('xml')).toThrow('Expected one of: json, yaml, csv');
		});

		test('infers union type', () => {
			const parser = OneOf(['json', 'yaml', 'csv']);
			expectTypeOf(parser('json')).toEqualTypeOf<'json' | 'yaml' | 'csv'>();
		});

		test('advertises accepted values as the help placeholder', () => {
			const parser = OneOf(['json', 'yaml', 'csv']);
			expect(parser.placeholder).toBe('json|yaml|csv');
		});
	});

	describe('CommaList', () => {
		test('splits on comma', () => {
			const parser = CommaList(String);
			expect(parser('a,b,c')).toStrictEqual(['a', 'b', 'c']);
		});

		test('empty string returns empty array', () => {
			const parser = CommaList(String);
			expect(parser('')).toStrictEqual([]);
		});

		test('trims whitespace around items', () => {
			const parser = CommaList(String);
			expect(parser('a, b, c')).toStrictEqual(['a', 'b', 'c']);
		});

		test('trailing comma is ignored', () => {
			const parser = CommaList(String);
			expect(parser('a,b,')).toStrictEqual(['a', 'b']);
		});

		test('composes with Integer', () => {
			const parser = CommaList(Integer);
			expect(parser('1,2,3')).toStrictEqual([1, 2, 3]);
			expectTypeOf(parser('1,2')).toEqualTypeOf<number[]>();
		});
	});

	describe('Integer', () => {
		test('parses integer', () => {
			expect(Integer('42')).toBe(42);
			expect(Integer('-5')).toBe(-5);
			expect(Integer('0')).toBe(0);
		});

		test('throws on float', () => {
			expect(() => Integer('3.14')).toThrow('Expected an integer');
		});

		test('throws on non-numeric', () => {
			expect(() => Integer('abc')).toThrow('Expected an integer');
		});

		test('throws on empty input', () => {
			expect(() => Integer('')).toThrow('Expected an integer');
			expect(() => Integer('  ')).toThrow('Expected an integer');
		});

		test('infers number type', () => {
			expectTypeOf(Integer('1')).toEqualTypeOf<number>();
		});
	});

	describe('Float', () => {
		test('parses float', () => {
			expect(Float('3.14')).toBe(3.14);
			expect(Float('42')).toBe(42);
			expect(Float('-1.5')).toBe(-1.5);
		});

		test('throws on non-numeric', () => {
			expect(() => Float('abc')).toThrow('Expected a finite number');
		});

		test('throws on Infinity', () => {
			expect(() => Float('Infinity')).toThrow('Expected a finite number');
		});

		test('throws on empty input', () => {
			expect(() => Float('')).toThrow('Expected a finite number');
			expect(() => Float('  ')).toThrow('Expected a finite number');
		});

		test('infers number type', () => {
			expectTypeOf(Float('1.5')).toEqualTypeOf<number>();
		});
	});

	describe('Range', () => {
		test('returns value within range', () => {
			expect(Range(1, 10)('5')).toBe(5);
			expect(Range(1, 10)('1')).toBe(1);
			expect(Range(1, 10)('10')).toBe(10);
		});

		test('throws below min', () => {
			expect(() => Range(1, 10)('0')).toThrow('Expected a number between 1 and 10');
		});

		test('throws above max', () => {
			expect(() => Range(1, 10)('11')).toThrow('Expected a number between 1 and 10');
		});

		test('throws on non-numeric input', () => {
			expect(() => Range(1, 10)('abc')).toThrow('Expected a number');
		});

		test('throws on empty input', () => {
			expect(() => Range(0, 10)('')).toThrow('Expected a number');
			expect(() => Range(0, 10)('  ')).toThrow('Expected a number');
		});

		test('infers number type', () => {
			expectTypeOf(Range(0, 100)('50')).toEqualTypeOf<number>();
		});
	});

	describe('Url', () => {
		test('returns URL object for valid URL', () => {
			const result = Url('https://example.com');
			expect(result).toBeInstanceOf(URL);
			expect(result.host).toBe('example.com');
		});

		test('throws on invalid URL', () => {
			expect(() => Url('not-a-url')).toThrow('Expected a valid URL');
		});

		test('preserves the original error as cause', () => {
			let caught: unknown;
			try {
				Url('not-a-url');
			} catch (error) {
				caught = error;
			}
			expect(caught).toBeInstanceOf(Error);
			expect((caught as Error).cause).toBeInstanceOf(Error);
		});

		test('infers URL type', () => {
			expectTypeOf(Url('https://example.com')).toEqualTypeOf<URL>();
		});
	});

	test('cli() integrates with cleye/formats helpers', async () => {
		const parsed = cli({
			flags: {
				format: { type: OneOf(['json', 'yaml']) },
				tags: { type: CommaList(String) },
				count: { type: Integer },
				apiUrl: { type: Url },
			},
		}, undefined, [
			'--format=json',
			'--tags=a,b,c',
			'--count=3',
			'--api-url=https://example.com/docs',
		]);
		expect(parsed.flags.format).toBe('json');
		expect(parsed.flags.tags).toStrictEqual(['a', 'b', 'c']);
		expect(parsed.flags.count).toBe(3);
		expect(parsed.flags.apiUrl).toBeInstanceOf(URL);
		expect(parsed.flags.apiUrl?.pathname).toBe('/docs');
		expectTypeOf(parsed.flags.format).toEqualTypeOf<'json' | 'yaml' | undefined>();
		expectTypeOf(parsed.flags.tags).toEqualTypeOf<string[] | undefined>();
		expectTypeOf(parsed.flags.count).toEqualTypeOf<number | undefined>();
		expectTypeOf(parsed.flags.apiUrl).toEqualTypeOf<URL | undefined>();
	});
});
