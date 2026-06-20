import { describe, test, expect } from 'manten';
import { expectTypeOf } from 'expect-type';
import { cli, group } from '#cleye';

describe('group()', () => {
	test('preserves flag inference through the spread', () => {
		const parsed = cli({
			flags: {
				...group('Filters', {
					region: String,
					limit: {
						type: Number,
						default: 5,
					},
				}),
				...group('Output', { json: Boolean }),
			},
		}, undefined, []);

		expectTypeOf(parsed.flags.region).toEqualTypeOf<string | undefined>();
		expectTypeOf(parsed.flags.limit).toBeNumber(); // default → non-undefined
		expectTypeOf(parsed.flags.json).toEqualTypeOf<boolean | undefined>();
	});

	test('a stored group variable spreads into multiple commands (shared flags)', () => {
		// The common shared-flags pattern: define a group once in a module, then
		// spread the stored variable into each command. The variable keeps its
		// literal type (no `: Flags` annotation to widen it), so inference still
		// flows through the spread.
		const shared = group('Filters', {
			region: String,
			limit: {
				type: Number,
				default: 5,
			},
		});

		const search = cli({
			flags: {
				...shared,
				sort: Boolean,
			},
		}, undefined, ['--region', 'us']);

		const list = cli({
			flags: {
				...shared,
				page: Number,
			},
		}, undefined, []);

		expectTypeOf(search.flags.region).toEqualTypeOf<string | undefined>();
		expectTypeOf(search.flags.limit).toBeNumber();
		expectTypeOf(search.flags.sort).toEqualTypeOf<boolean | undefined>();
		expectTypeOf(list.flags.page).toEqualTypeOf<number | undefined>();

		expect(search.flags.region).toBe('us');
		expect(search.flags.limit).toBe(5);
	});

	test('grouped shorthand boolean parses and negates', () => {
		const enabled = cli({
			flags: { ...group('Group', { verbose: Boolean }) },
		}, undefined, ['--verbose']);
		expect(enabled.flags.verbose).toBe(true);

		const negated = cli({
			flags: { ...group('Group', { verbose: Boolean }) },
			booleanFlagNegation: true,
		}, undefined, ['--no-verbose']);
		expect(negated.flags.verbose).toBe(false);
	});

	test('grouped object-form flag keeps its type and default', () => {
		const fallback = cli({
			flags: {
				...group('Group', {
					port: {
						type: Number,
						default: 3000,
					},
				}),
			},
		}, undefined, []);
		expect(fallback.flags.port).toBe(3000);

		const provided = cli({
			flags: {
				...group('Group', {
					port: {
						type: Number,
						default: 3000,
					},
				}),
			},
		}, undefined, ['--port', '8080']);
		expect(provided.flags.port).toBe(8080);
	});
}, { parallel: false });
