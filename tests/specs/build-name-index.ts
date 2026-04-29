import { describe, test, expect } from 'manten';
import { buildNameIndex } from '../../src/utils/build-name-index.ts';

describe('buildNameIndex', () => {
	test('canonical names without aliases', () => {
		const index = buildNameIndex({
			build: {},
			test: {},
		}, () => undefined);
		expect([...index.names]).toStrictEqual(['build', 'test']);
		expect(index.aliases.size).toBe(0);
	});

	test('string alias', () => {
		const index = buildNameIndex(
			{ verbose: { alias: 'v' } },
			entry => entry.alias,
		);
		expect(index.names.has('verbose')).toBe(true);
		expect(index.names.has('v')).toBe(true);
		expect(index.aliases.get('v')).toBe('verbose');
	});

	test('array of aliases', () => {
		const index = buildNameIndex(
			{ install: { alias: ['i', 'add'] } },
			entry => entry.alias,
		);
		expect(index.aliases.get('i')).toBe('install');
		expect(index.aliases.get('add')).toBe('install');
	});

	test('skips empty-string aliases', () => {
		const index = buildNameIndex(
			{ verbose: { alias: ['', 'v'] } },
			entry => entry.alias,
		);
		expect(index.aliases.has('')).toBe(false);
		expect(index.aliases.get('v')).toBe('verbose');
	});

	test('skips non-string aliases (defensive against contract violations)', () => {
		// TS prevents this via the `string | string[]` declaration, but JS
		// callers or `as any` casts could bypass — skip silently to keep
		// `names` / `aliases` well-typed for downstream consumers like findClosest.
		const index = buildNameIndex(
			{ verbose: { alias: [1, true, {}, 'v'] as unknown as string[] } },
			entry => entry.alias,
		);
		expect([...index.names]).toStrictEqual(['verbose', 'v']);
		expect(index.aliases.size).toBe(1);
		expect(index.aliases.get('v')).toBe('verbose');
	});

	test('invokes onDuplicateAlias when alias collides', () => {
		const calls: string[] = [];
		buildNameIndex(
			{
				install: { alias: 'i' },
				init: { alias: 'i' },
			},
			entry => entry.alias,
			alias => calls.push(alias),
		);
		expect(calls).toStrictEqual(['i']);
	});

	test('does not error on duplicate alias when callback is omitted', () => {
		expect(() => buildNameIndex(
			{
				install: { alias: 'i' },
				init: { alias: 'i' },
			},
			entry => entry.alias,
		)).not.toThrow();
	});
});
