import { describe, test, expect } from 'manten';
import { spy } from 'nanospy';
import { cli } from '#cleye';

describe('parameters: end-of-flags (`--`)', () => {
	test('parses parameters across `--`', async () => {
		const callback = spy();
		const parsed = await cli(
			{
				parameters: ['<value-a>', '[value-b]', '[value c]', '--', '<value-d>', '[value-e]', '[value f]'],
			},
			(callbackParsed) => {
				expect<string>(callbackParsed._.valueA).toBe('valueA');
				expect<string | undefined>(callbackParsed._.valueB).toBe('valueB');
				expect<string | undefined>(callbackParsed._.valueD).toBe('valueD');
				callback();
				return callbackParsed;
			},
			['valueA', 'valueB', '--', 'valueD'],
		);

		expect<string>(parsed._.valueA).toBe('valueA');
		expect<string | undefined>(parsed._.valueB).toBe('valueB');
		expect<string | undefined>(parsed._.valueD).toBe('valueD');
		expect(callback.called).toBe(true);
	});

	test('parses with empty `--` segment', async () => {
		const callback = spy();
		const parsed = await cli(
			{
				parameters: ['<value-a>', '[value-b]', '[value c]', '--', '[value-d]'],
			},
			(callbackParsed) => {
				expect<string>(callbackParsed._.valueA).toBe('valueA');
				expect<string | undefined>(callbackParsed._.valueB).toBe('valueB');
				callback();
				return callbackParsed;
			},
			['valueA', 'valueB'],
		);

		expect<string>(parsed._.valueA).toBe('valueA');
		expect<string | undefined>(parsed._.valueB).toBe('valueB');
		expect(callback.called).toBe(true);
	});

	test('spread on both sides of `--`', async () => {
		const callback = spy();
		const parsed = await cli(
			{
				parameters: ['<value-a...>', '--', '<value-b...>'],
			},
			(callbackParsed) => {
				expect<string[]>(callbackParsed._.valueA).toStrictEqual(['valueA', 'valueB']);
				expect<string[]>(callbackParsed._.valueB).toStrictEqual(['valueC', 'valueD']);
				callback();
				return callbackParsed;
			},
			['valueA', 'valueB', '--', 'valueC', 'valueD'],
		);

		expect<string[]>(parsed._.valueA).toStrictEqual(['valueA', 'valueB']);
		expect<string[]>(parsed._.valueB).toStrictEqual(['valueC', 'valueD']);
		expect(callback.called).toBe(true);
	});

	describe('edge cases', () => {
		test('`--` at the beginning of parameters', () => {
			const parsed = cli({
				parameters: ['--', '<value>'],
			}, undefined, ['--', 'test']);

			expect<string>(parsed._.value).toBe('test');
		});

		test('empty EOF section keeps the property defined as undefined', () => {
			const parsed = cli({
				parameters: ['<arg>', '--', '[optional]'],
			}, undefined, ['value', '--']);

			expect<string>(parsed._.arg).toBe('value');
			expect<string | undefined>(parsed._.optional).toBeUndefined();
		});

		test('EOF parameters always show up as own properties', () => {
			const parsed = cli({
				parameters: ['<arg>', '--', '[optional]'],
			}, undefined, ['value', '--']);

			expect('optional' in parsed._).toBe(true);
			expect(Object.keys(parsed._)).toContain('optional');
		});
	}, { parallel: false });
}, { parallel: false });
