import { describe, test, expect } from 'manten';
import { expectTypeOf } from 'expect-type';
import {
	oneOf,
	commaList,
	integer,
	float,
	range,
	url,
} from '../../src/formats.ts';
import { cli } from '#cleye';

describe('formats', () => {
	describe('oneOf', () => {
		test('returns valid value', () => {
			const parser = oneOf('json', 'yaml', 'csv');
			expect(parser('json')).toBe('json');
			expect(parser('yaml')).toBe('yaml');
		});

		test('throws on invalid value', () => {
			const parser = oneOf('json', 'yaml', 'csv');
			expect(() => parser('xml')).toThrow('Expected one of: json, yaml, csv');
		});

		test('infers union type', () => {
			const parser = oneOf('json', 'yaml', 'csv');
			expectTypeOf(parser('json')).toEqualTypeOf<'json' | 'yaml' | 'csv'>();
		});
	});

	describe('commaList', () => {
		test('splits on comma', () => {
			const parser = commaList(String);
			expect(parser('a,b,c')).toStrictEqual(['a', 'b', 'c']);
		});

		test('empty string returns empty array', () => {
			const parser = commaList(String);
			expect(parser('')).toStrictEqual([]);
		});

		test('trims whitespace around items', () => {
			const parser = commaList(String);
			expect(parser('a, b, c')).toStrictEqual(['a', 'b', 'c']);
		});

		test('trailing comma is ignored', () => {
			const parser = commaList(String);
			expect(parser('a,b,')).toStrictEqual(['a', 'b']);
		});

		test('composes with integer()', () => {
			const parser = commaList(integer());
			expect(parser('1,2,3')).toStrictEqual([1, 2, 3]);
			expectTypeOf(parser('1,2')).toEqualTypeOf<number[]>();
		});
	});

	describe('integer', () => {
		test('parses integer', () => {
			expect(integer()('42')).toBe(42);
			expect(integer()('-5')).toBe(-5);
			expect(integer()('0')).toBe(0);
		});

		test('throws on float', () => {
			expect(() => integer()('3.14')).toThrow('Expected an integer');
		});

		test('throws on non-numeric', () => {
			expect(() => integer()('abc')).toThrow('Expected an integer');
		});

		test('infers number type', () => {
			expectTypeOf(integer()('1')).toEqualTypeOf<number>();
		});
	});

	describe('float', () => {
		test('parses float', () => {
			expect(float()('3.14')).toBe(3.14);
			expect(float()('42')).toBe(42);
			expect(float()('-1.5')).toBe(-1.5);
		});

		test('throws on non-numeric', () => {
			expect(() => float()('abc')).toThrow('Expected a finite number');
		});

		test('throws on Infinity', () => {
			expect(() => float()('Infinity')).toThrow('Expected a finite number');
		});

		test('infers number type', () => {
			expectTypeOf(float()('1.5')).toEqualTypeOf<number>();
		});
	});

	describe('range', () => {
		test('returns value within range', () => {
			expect(range(1, 10)('5')).toBe(5);
			expect(range(1, 10)('1')).toBe(1);
			expect(range(1, 10)('10')).toBe(10);
		});

		test('throws below min', () => {
			expect(() => range(1, 10)('0')).toThrow('Expected a number between 1 and 10');
		});

		test('throws above max', () => {
			expect(() => range(1, 10)('11')).toThrow('Expected a number between 1 and 10');
		});

		test('infers number type', () => {
			expectTypeOf(range(0, 100)('50')).toEqualTypeOf<number>();
		});
	});

	describe('url', () => {
		test('returns URL object for valid URL', () => {
			const result = url()('https://example.com');
			expect(result).toBeInstanceOf(URL);
			expect(result.host).toBe('example.com');
		});

		test('throws on invalid URL', () => {
			expect(() => url()('not-a-url')).toThrow('Expected a valid URL');
		});

		test('infers URL type', () => {
			expectTypeOf(url()('https://example.com')).toEqualTypeOf<URL>();
		});
	});

	test('cli() integrates with cleye/formats helpers', () => {
		const parsed = cli(
			{
				flags: {
					format: { type: oneOf('json', 'yaml') },
					tags: { type: commaList(String) },
				},
			},
			undefined,
			['--format=json', '--tags=a,b,c'],
		);
		if (parsed.command === undefined) {
			expect(parsed.flags.format).toBe('json');
			expect(parsed.flags.tags).toStrictEqual(['a', 'b', 'c']);
			expectTypeOf(parsed.flags.format).toEqualTypeOf<'json' | 'yaml' | undefined>();
			expectTypeOf(parsed.flags.tags).toEqualTypeOf<string[] | undefined>();
		}
	});
});
