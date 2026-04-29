import { describe, test, expect } from 'manten';
import { findClosest } from '../../src/utils/find-closest.ts';

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
});
