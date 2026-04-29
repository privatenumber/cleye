import { describe, test, expect } from 'manten';
import { spy } from 'nanospy';
import { cli } from '#cleye';

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

	test('parameter names are camelCased on argv._', () => {
		// Smoke test that the camelCase utility (covered in tests/specs/utils)
		// is wired into parameter parsing. Specific normalization rules live there.
		const parsed = cli({
			parameters: ['<value-a>', '[hello world]', '[file_path]'],
		}, undefined, ['a', 'b', 'c']);

		expect<string>(parsed._.valueA).toBe('a');
		expect<string | undefined>(parsed._.helloWorld).toBe('b');
		expect<string | undefined>(parsed._.filePath).toBe('c');
	});
}, { parallel: false });
