import { describe, test } from 'manten';
import { expectTypeOf } from 'expect-type';
import { cli } from '#cleye';

describe('parameters types', () => {
	test('required and optional parameters', async () => {
		const parsed = cli({
			parameters: ['<required>', '[optional]'],
		}, undefined, ['req']);

		expectTypeOf(parsed._.required).toBeString();
		expectTypeOf(parsed._.optional).toEqualTypeOf<string | undefined>();
	});

	test('spread parameters', async () => {
		const parsed = cli({
			parameters: ['<foo>', '[bar...]'],
		}, undefined, ['value1']);

		expectTypeOf(parsed._.foo).toBeString();
		expectTypeOf(parsed._.bar).toEqualTypeOf<string[]>();
	});

	test('parameters with flags', async () => {
		const parsed = cli({
			parameters: ['<foo>', '[bar...]'],
			flags: {
				booleanFlag: Boolean,
				booleanFlagDefault: {
					type: Boolean,
					default: false,
				},
				stringFlag: String,
				stringFlagDefault: {
					type: String,
					default: 'hello',
				},
				numberFlag: Number,
				numberFlagDefault: {
					type: Number,
					default: 1,
				},
				extraOptions: {
					type: Boolean,
					alias: 'e',
					default: false,
					description: 'Some description',
				},
			},
		}, undefined, ['value1']);

		expectTypeOf(parsed._.foo).toBeString();
		expectTypeOf(parsed._.bar).toEqualTypeOf<string[]>();
		expectTypeOf(parsed._['--']).toEqualTypeOf<string[]>();

		expectTypeOf(parsed.flags).toEqualTypeOf<{
			booleanFlag: boolean | undefined;
			booleanFlagDefault: boolean;
			stringFlag: string | undefined;
			stringFlagDefault: string;
			numberFlag: number | undefined;
			numberFlagDefault: number;
			extraOptions: boolean;
			help: boolean | undefined;
		}>();
	});

	test('double dash arguments', async () => {
		const parsed = cli({}, undefined, ['--', 'arg1', 'arg2']);

		expectTypeOf(parsed._['--']).toEqualTypeOf<string[]>();
	});
}, { parallel: false });
