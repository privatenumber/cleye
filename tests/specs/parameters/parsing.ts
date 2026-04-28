import { describe, test, expect } from 'manten';
import { spy } from 'nanospy';
import { cli } from '#cleye';
import { camelCase } from '../../../src/utils/convert-case.ts';

describe('parameter parsing', () => {
	test('all parameter slots populate (camelCase keys)', async () => {
		const callback = spy();
		const parsed = await cli(
			{
				parameters: ['<value-a>', '[value-B]', '[value c]', '[value_d]', '[value=e]', '[value/f]'],
			},
			(callbackParsed) => {
				expect<string>(callbackParsed._.valueA).toBe('valueA');
				expect<string | undefined>(callbackParsed._.valueB).toBe('valueB');
				expect<string | undefined>(callbackParsed._.valueC).toBe('valueC');
				expect<string | undefined>(callbackParsed._.valueD).toBe('valueD');
				expect<string | undefined>(callbackParsed._.valueE).toBe('valueE');
				expect<string | undefined>(callbackParsed._.valueF).toBe('valueF');
				callback();
				return callbackParsed;
			},
			['valueA', 'valueB', 'valueC', 'valueD', 'valueE', 'valueF'],
		);

		expect<string>(parsed._.valueA).toBe('valueA');
		expect<string | undefined>(parsed._.valueB).toBe('valueB');
		expect<string | undefined>(parsed._.valueC).toBe('valueC');
		expect(callback.called).toBe(true);
	});

	test('spread parameter collects all positionals', async () => {
		const callback = spy();
		const parsed = await cli(
			{
				parameters: ['<value-a...>'],
			},
			(callbackParsed) => {
				expect<string[]>(callbackParsed._.valueA).toStrictEqual(['valueA', 'valueB']);
				callback();
				return callbackParsed;
			},
			['valueA', 'valueB'],
		);

		expect<string[]>(parsed._.valueA).toStrictEqual(['valueA', 'valueB']);
		expect(callback.called).toBe(true);
	});

	test('inner cli inside a command handler routes its own argv', async () => {
		const callback = spy();

		const parsed = cli({
			commands: {
				test: async () => {
					await cli(
						{
							parameters: ['<arg-a...>'],
						},
						(callbackParsed) => {
							expect<string[]>(callbackParsed._.argA).toStrictEqual(['valueA', 'valueB']);
							callback();
						},
						['valueA', 'valueB'],
					);
				},
			},
		}, undefined, ['test', 'valueA', 'valueB']);

		await parsed.runCommand();
		expect(parsed.command).toBe('test');
		expect(callback.called).toBe(true);
	});

	describe('camelCase conversion', () => {
		test('already camelCase input', () => {
			const parsed = cli({
				parameters: ['<myValue>'],
			}, undefined, ['test']);

			expect<string>(parsed._.myValue).toBe('test');
		});

		test('multiple consecutive separators', () => {
			const parsed = cli({
				parameters: ['<value--name>'],
			}, undefined, ['test']);

			expect<string>(parsed._.valueName).toBe('test');
		});

		test('mixed separators', () => {
			const parsed = cli({
				parameters: ['<value_name-here>'],
			}, undefined, ['test']);

			expect<string>(parsed._.valueNameHere).toBe('test');
		});

		test('leading separator capitalizes first letter', () => {
			const parsed = cli({
				parameters: ['<-value>'],
			}, undefined, ['test']);

			expect<string>(parsed._.Value).toBe('test');
		});

		test('trailing separator', () => {
			const parsed = cli({
				parameters: ['<value_>'],
			}, undefined, ['test']);

			expect<string>(parsed._.value).toBe('test');
		});

		test('numbers in parameter name', () => {
			const parsed = cli({
				parameters: ['<value1>'],
			}, undefined, ['test']);

			expect<string>(parsed._.value1).toBe('test');
		});

		test('leading number in parameter name', () => {
			const parsed = cli({
				parameters: ['<1value>'],
			}, undefined, ['test']);

			expect<string>(parsed._['1value']).toBe('test');
		});

		test('camelCase utility directly', () => {
			expect(camelCase('hello world')).toBe('helloWorld');
			expect(camelCase('hello-world')).toBe('helloWorld');
			expect(camelCase('hello_world')).toBe('helloWorld');
			expect(camelCase('hello--world')).toBe('helloWorld');
			expect(camelCase('hello__world')).toBe('helloWorld');
			expect(camelCase('-hello')).toBe('Hello');
			expect(camelCase('hello-')).toBe('hello');
			expect(camelCase('myValue')).toBe('myValue');
			expect(camelCase('value1')).toBe('value1');
			expect(camelCase('1value')).toBe('1value');
		});
	}, { parallel: false });
}, { parallel: false });
