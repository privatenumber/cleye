import { describe, test, expect } from 'manten';
import { findClosest, getDistance } from '../../src/utils/find-closest.ts';

describe('getDistance', () => {
	describe('exact-match short-circuit', () => {
		test('identical strings return 0', () => {
			expect(getDistance('hello', 'hello', 2)).toBe(0);
		});

		test('two empty strings return 0', () => {
			expect(getDistance('', '', 2)).toBe(0);
		});

		test('reference equality short-circuits before any allocation', () => {
			const s = 'verbose';
			expect(getDistance(s, s, 0)).toBe(0);
		});
	});

	describe('length-delta early bailout', () => {
		test('returns Infinity when |a.length - b.length| > maxDistance', () => {
			expect(getDistance('a', 'abcd', 2)).toBe(Infinity);
			expect(getDistance('abcd', 'a', 2)).toBe(Infinity);
		});

		test('|a.length - b.length| === maxDistance does NOT bail', () => {
			// Distance from 'ab' to 'abcd' is 2 (insert 'c', 'd'); maxDistance=2 allows it
			expect(getDistance('ab', 'abcd', 2)).toBe(2);
		});

		test('maxDistance=0 forces equal-length comparison', () => {
			expect(getDistance('abc', 'abd', 0)).toBe(Infinity);
			expect(getDistance('abc', 'abc', 0)).toBe(0);
		});
	});

	describe('one-string-empty handling via matrix init', () => {
		test('returns Infinity when one is empty and other exceeds maxDistance', () => {
			// length delta 5 > 2 → Infinity from length-delta bailout
			expect(getDistance('', 'verbose', 2)).toBe(Infinity);
			expect(getDistance('verbose', '', 2)).toBe(Infinity);
		});

		test('returns the non-empty length when within maxDistance', () => {
			expect(getDistance('', 'ab', 2)).toBe(2);
			expect(getDistance('ab', '', 2)).toBe(2);
		});
	});

	describe('basic edit operations', () => {
		test('single substitution', () => {
			expect(getDistance('cat', 'bat', 2)).toBe(1);
		});

		test('single insertion', () => {
			expect(getDistance('cat', 'cart', 2)).toBe(1);
		});

		test('single deletion', () => {
			expect(getDistance('cart', 'cat', 2)).toBe(1);
		});

		test('two edits', () => {
			expect(getDistance('kitten', 'sittin', 2)).toBe(2);
		});

		test('three edits exceeds maxDistance=2', () => {
			// kitten → sitting is 3 edits; row-min bailout returns Infinity
			expect(getDistance('kitten', 'sitting', 2)).toBe(Infinity);
		});
	});

	describe('row-min bailout', () => {
		test('completely different strings of equal length bail early', () => {
			expect(getDistance('verbose', 'silent ', 2)).toBe(Infinity);
		});

		test('strings that diverge mid-row still bail', () => {
			expect(getDistance('abcdef', 'abxyzw', 2)).toBe(Infinity);
		});
	});

	describe('higher maxDistance computes the full distance', () => {
		test('classic kitten/sitting at maxDistance=10', () => {
			expect(getDistance('kitten', 'sitting', 10)).toBe(3);
		});

		test('completely disjoint strings of equal length', () => {
			expect(getDistance('abcdef', 'ghijkl', 10)).toBe(6);
		});
	});

	describe('special characters and unicode', () => {
		test('handles whitespace as a regular character', () => {
			expect(getDistance('a b', 'ab', 2)).toBe(1);
		});

		test('handles surrogate-pair emoji as two code units (JS string indexing)', () => {
			// 😀 is one code point but two UTF-16 code units. JS string indexing
			// treats it as length-2; getDistance compares per code unit.
			expect(getDistance('😀', '😀', 2)).toBe(0);
		});

		test('handles BMP unicode (single code unit) correctly', () => {
			expect(getDistance('café', 'cafe', 2)).toBe(1);
		});
	});

	describe('stress', () => {
		test('long identical strings short-circuit at line 1', () => {
			const long = 'a'.repeat(1000);
			expect(getDistance(long, long, 2)).toBe(0);
		});

		test('long unrelated strings bail via row-min', () => {
			const a = 'a'.repeat(100);
			const b = 'z'.repeat(100);
			expect(getDistance(a, b, 2)).toBe(Infinity);
		});

		test('long strings differing by 2 chars compute correctly', () => {
			const a = `${'a'.repeat(50)}xx`;
			const b = `${'a'.repeat(50)}yy`;
			expect(getDistance(a, b, 2)).toBe(2);
		});
	});
});

describe('findClosest', () => {
	test('returns undefined when query is shorter than 3 chars', () => {
		expect(findClosest('ab', ['abcd', 'abef'], new Map())).toBeUndefined();
	});

	test('returns the only match within distance 2', () => {
		const result = findClosest('verbos', ['verbose', 'silent'], new Map());
		expect(result?.name).toBe('verbose');
	});

	test('returns undefined when no candidate is within distance 2', () => {
		expect(findClosest('verbose', ['xyz', 'abc'], new Map())).toBeUndefined();
	});

	test('prefers canonical name on a distance tie', () => {
		// Both 'verbose' (canonical) and 'v' would match... actually 'v' is too short.
		// Use a more realistic tie: 'verbos' compared to canonical 'verbose' (d=1)
		// vs alias 'verbose-alt' (mapped to canonical 'verbose').
		const aliases = new Map<string, string>([['verbosx', 'verbose']]);
		const result = findClosest('verbosy', ['verbose', 'verbosx'], aliases);
		// distance('verbosy', 'verbose') = 1; distance('verbosy', 'verbosx') = 1
		// 'verbose' is canonical → preferred
		expect(result?.name).toBe('verbose');
		expect(result?.aliasFor).toBeUndefined();
	});

	test('surfaces aliasFor when the winner is an alias', () => {
		const aliases = new Map<string, string>([['v', 'verbose']]);
		const result = findClosest('avx', ['verbose', 'v'], aliases);
		// distance('avx', 'verbose')=6 (skipped); distance('avx', 'v')=2 → match
		expect(result?.name).toBe('v');
		expect(result?.aliasFor).toBe('verbose');
	});

	test('returns the closest match when multiple are within distance 2', () => {
		const result = findClosest('verbose', ['verbos', 'verboss', 'silent'], new Map());
		// distance 1 vs distance 1 — first encountered wins (verbos)
		expect(result?.name).toBe('verbos');
	});

	test('exact match returns distance-0 candidate', () => {
		const result = findClosest('verbose', ['verbose'], new Map());
		expect(result?.name).toBe('verbose');
	});

	test('large length difference is rejected by the early bailout', () => {
		// 'verbose' (7) vs 'an-extremely-long-flag-name' (>>27) — length delta > 2
		const result = findClosest(
			'verbose',
			['an-extremely-long-flag-name'],
			new Map(),
		);
		expect(result).toBeUndefined();
	});

	test('empty candidate name is handled', () => {
		expect(findClosest('verbose', [''], new Map())).toBeUndefined();
	});

	test('row-min bailout discards distant candidates without finishing the matrix', () => {
		// 'verbose' (7) vs 'silent' (6) — distance 5, far above threshold; should not match
		const result = findClosest('verbose', ['silent'], new Map());
		expect(result).toBeUndefined();
	});
});
