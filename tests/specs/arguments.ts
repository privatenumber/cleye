import { describe, test, expect } from 'manten';
import { spy } from 'nanospy';
import { mockEnvFunctions } from '../utils/mock-env-functions.ts';
import { cli } from '#cleye';

describe('arguments', () => {
	describe('error handling', () => {
		describe('parameters', () => {
			test('invalid parameter format', async () => {
				await expect(
					cli({
						parameters: ['value-a'],
					}),
				).rejects.toThrow('Invalid parameter: "value-a". Must be wrapped in <> (required parameter) or [] (optional parameter)');
			});

			test('invalid parameter character', async () => {
				await expect(
					cli({
						parameters: ['[value.a]'],
					}),
				).rejects.toThrow('Invalid parameter: "[value.a]". Invalid character found "."');
			});

			test('invalid parameter - all special characters', async () => {
				// Pattern from cli.ts: /[|\\{}()[\]^$+*?.]/
				const specialChars = [
					'|',
					'\\',
					'{',
					'}',
					'(',
					')',
					// '[' and ']' are bracket chars used for optional params
					// so we test them inside the name portion
					'^',
					'$',
					'+',
					'*',
					'?',
					'.',
				];

				for (const char of specialChars) {
					await expect(
						cli({
							parameters: [`<value${char}a>`],
						}),
					).rejects.toThrow('Invalid character found');
				}
			});

			test('duplicate parameters', async () => {
				await expect(
					cli({
						parameters: ['[value-a]', '[value-a]', '[value-a]'],
					}),
				).rejects.toThrow('Invalid parameter: "value-a" is used more than once');
			});

			test('duplicate parameters across --', async () => {
				await expect(
					cli({
						parameters: ['[value-a]', '--', '[value-a]'],
					}),
				).rejects.toThrow('Invalid parameter: "value-a" is used more than once');
			});

			test('multiple --', async () => {
				await expect(
					cli({
						parameters: ['[value-a]', '--', '[value-b]', '--', '[value-c]'],
					}),
				).rejects.toThrow('Invalid parameter: "--". Must be wrapped in <> (required parameter) or [] (optional parameter)');
			});

			test('optional parameter before required parameter', async () => {
				await expect(
					cli({
						parameters: ['[value-a]', '<value-b>'],
					}),
				).rejects.toThrow('Invalid parameter: Required parameter "<value-b>" cannot come after optional parameter "[value-a]"');
			});

			test('multiple spread not last', async () => {
				await expect(
					cli({
						parameters: ['[value-a...]', '<value-b>'],
					}),
				).rejects.toThrow('Invalid parameter: Spread parameter "[value-a...]" must be last');
			});

			test('multiple spread parameters', async () => {
				await expect(
					cli({
						parameters: ['[value-a...]', '<value-b...>'],
					}),
				).rejects.toThrow('Invalid parameter: Spread parameter "[value-a...]" must be last');
			});
		}, { parallel: false });

		describe('missing arguments', () => {
			test('missing required parameters', async () => {
				// Test all missing parameter variants sequentially
				for (const parameters of [
					['<value-a>'],
					['<value-a...>'],
					['--', '<value-a>'],
				]) {
					const mocked = mockEnvFunctions();
					await cli(
						{ parameters },
						undefined,
						[],
					);
					mocked.restore();

					expect(mocked.consoleError.calls[0]).toStrictEqual(['Error: Missing required parameter "value-a"\n']);
					expect(mocked.processExit.calls[0]).toStrictEqual([1]);
				}
			});
		}, { parallel: false });
	}, { parallel: false });

	describe('parses arguments', () => {
		test('simple parsing', async () => {
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
				},
				['valueA', 'valueB', 'valueC', 'valueD', 'valueE', 'valueF'],
			);

			expect<string>(parsed._.valueA).toBe('valueA');
			expect<string | undefined>(parsed._.valueB).toBe('valueB');
			expect<string | undefined>(parsed._.valueC).toBe('valueC');
			expect(callback.called).toBe(true);
		});

		test('simple parsing across --', async () => {
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
				},
				['valueA', 'valueB', '--', 'valueD'],
			);

			expect<string>(parsed._.valueA).toBe('valueA');
			expect<string | undefined>(parsed._.valueB).toBe('valueB');
			expect<string | undefined>(parsed._.valueD).toBe('valueD');
			expect(callback.called).toBe(true);
		});

		test('simple parsing with empty --', async () => {
			const callback = spy();
			const parsed = await cli(
				{
					parameters: ['<value-a>', '[value-b]', '[value c]', '--', '[value-d]'],
				},
				(callbackParsed) => {
					expect<string>(callbackParsed._.valueA).toBe('valueA');
					expect<string | undefined>(callbackParsed._.valueB).toBe('valueB');
					callback();
				},
				['valueA', 'valueB'],
			);

			expect<string>(parsed._.valueA).toBe('valueA');
			expect<string | undefined>(parsed._.valueB).toBe('valueB');
			expect(callback.called).toBe(true);
		});

		test('spread', async () => {
			const callback = spy();
			const parsed = await cli(
				{
					parameters: ['<value-a...>'],
				},
				(callbackParsed) => {
					expect<string[]>(callbackParsed._.valueA).toStrictEqual(['valueA', 'valueB']);
					callback();
				},
				['valueA', 'valueB'],
			);

			expect<string[]>(parsed._.valueA).toStrictEqual(['valueA', 'valueB']);
			expect(callback.called).toBe(true);
		});

		test('spread with --', async () => {
			const callback = spy();
			const parsed = await cli(
				{
					parameters: ['<value-a...>', '--', '<value-b...>'],
				},
				(callbackParsed) => {
					expect<string[]>(callbackParsed._.valueA).toStrictEqual(['valueA', 'valueB']);
					expect<string[]>(callbackParsed._.valueB).toStrictEqual(['valueC', 'valueD']);
					callback();
				},
				['valueA', 'valueB', '--', 'valueC', 'valueD'],
			);

			expect<string[]>(parsed._.valueA).toStrictEqual(['valueA', 'valueB']);
			expect<string[]>(parsed._.valueB).toStrictEqual(['valueC', 'valueD']);
			expect(callback.called).toBe(true);
		});

		test('command', async () => {
			const callback = spy();

			const parsed = await cli(
				{
					parameters: ['<value-a...>'],

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
				},
				async (_parsed, runCommand) => {
					await runCommand!();
				},
				['test', 'valueA', 'valueB'],
			);

			expect(parsed.command).toBe('test');
			expect(callback.called).toBe(true);
		});
	}, { parallel: false });

	describe('EOF edge cases', () => {
		test('EOF at beginning of parameters', async () => {
			const parsed = await cli(
				{
					parameters: ['--', '<value>'],
				},
				undefined,
				['--', 'test'],
			);

			expect<string>(parsed._.value).toBe('test');
		});

		test('empty EOF section', async () => {
			const parsed = await cli(
				{
					parameters: ['<arg>', '--', '[optional]'],
				},
				undefined,
				['value', '--'],
			);

			expect<string>(parsed._.arg).toBe('value');
			expect<string | undefined>(parsed._.optional).toBeUndefined();
		});

		test('EOF parameters are always set as properties', async () => {
			const parsed = await cli(
				{
					parameters: ['<arg>', '--', '[optional]'],
				},
				undefined,
				['value', '--'],
			);

			// EOF parameters should always be set on the object,
			// even when no EOF arguments are provided
			expect('optional' in parsed._).toBe(true);
			expect(Object.keys(parsed._)).toContain('optional');
		});
	}, { parallel: false });
}, { parallel: false });
