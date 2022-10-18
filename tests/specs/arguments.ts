import { testSuite, expect } from 'manten';
import { spy } from 'nanospy';
import { cli, command } from '../../dist/index.js';
import { mockEnvFunctions } from '../utils/mock-env-functions';

export default testSuite(({ describe }) => {
	describe('arguments', ({ describe }) => {
		describe('error handling', ({ describe }) => {
			describe('parameters', ({ test }) => {
				test('invalid parameter format', () => {
					expect(() => {
						cli({
							parameters: ['value-a'],
						});
					}).toThrow('Invalid parameter: "value-a". Must be wrapped in <> (required parameter) or [] (optional parameter)');
				});

				test('invalid parameter character', () => {
					expect(() => {
						cli({
							parameters: ['[value.a]'],
						});
					}).toThrow('Invalid parameter: "[value.a]". Invalid character found "."');
				});

				test('duplicate parameters', () => {
					expect(() => {
						cli({
							parameters: ['[value-a]', '[value-a]', '[value-a]'],
						});
					}).toThrow('Invalid parameter: "value-a" is used more than once');
				});

				test('duplicate parameters across --', () => {
					expect(() => {
						cli({
							parameters: ['[value-a]', '--', '[value-a]'],
						});
					}).toThrow('Invalid parameter: "value-a" is used more than once');
				});

				test('multiple --', () => {
					expect(() => {
						cli({
							parameters: ['[value-a]', '--', '[value-b]', '--', '[value-c]'],
						});
					}).toThrow('Invalid parameter: "--". Must be wrapped in <> (required parameter) or [] (optional parameter)');
				});

				test('optional parameter before required parameter', () => {
					expect(() => {
						cli({
							parameters: ['[value-a]', '<value-b>'],
						});
					}).toThrow('Invalid parameter: Required parameter "<value-b>" cannot come after optional parameter "[value-a]"');
				});

				test('multiple spread not last', () => {
					expect(() => {
						cli({
							parameters: ['[value-a...]', '<value-b>'],
						});
					}).toThrow('Invalid parameter: Spread parameter "[value-a...]" must be last');
				});

				test('multiple spread parameters', () => {
					expect(() => {
						cli({
							parameters: ['[value-a...]', '<value-b...>'],
						});
					}).toThrow('Invalid parameter: Spread parameter "[value-a...]" must be last');
				});
			});

			describe('arguments', ({ test }) => {
				test('missing parameter', () => {
					const mocked = mockEnvFunctions();
					cli(
						{
							parameters: ['<value-a>'],
						},
						undefined,
						[],
					);
					mocked.restore();

					expect(mocked.consoleLog.called).toBe(true);
					expect(mocked.consoleError.calls).toStrictEqual([['Error: Missing required parameter "value-a"\n']]);
					expect(mocked.processExit.calls).toStrictEqual([[1]]);
				});

				test('missing spread parameter', () => {
					const mocked = mockEnvFunctions();
					cli(
						{
							parameters: ['<value-a...>'],
						},
						undefined,
						[],
					);
					mocked.restore();

					expect(mocked.consoleLog.called).toBe(true);
					expect(mocked.consoleError.calls).toStrictEqual([['Error: Missing required parameter "value-a"\n']]);
					expect(mocked.processExit.calls).toStrictEqual([[1]]);
				});

				test('missing -- parameter', () => {
					const mocked = mockEnvFunctions();
					cli(
						{
							parameters: ['--', '<value-a>'],
						},
						undefined,
						[],
					);
					mocked.restore();

					expect(mocked.consoleLog.called).toBe(true);
					expect(mocked.consoleError.calls).toStrictEqual([['Error: Missing required parameter "value-a"\n']]);
					expect(mocked.processExit.calls).toStrictEqual([[1]]);
				});
			});
		});

		describe('parses arguments', ({ test }) => {
			test('simple parsing', () => {
				const callback = spy();
				const parsed = cli(
					{
						parameters: ['<value-a>', '[value-B]', '[value c]'],
					},
					(callbackParsed) => {
						expect<string>(callbackParsed._.valueA).toBe('valueA');
						expect<string | undefined>(callbackParsed._.valueB).toBe('valueB');
						expect<string | undefined>(callbackParsed._.valueC).toBe('valueC');
						callback();
					},
					['valueA', 'valueB', 'valueC'],
				);

				expect<string>(parsed._.valueA).toBe('valueA');
				expect<string | undefined>(parsed._.valueB).toBe('valueB');
				expect<string | undefined>(parsed._.valueC).toBe('valueC');
				expect(callback.called).toBe(true);
			});

			test('simple parsing across --', () => {
				const callback = spy();
				const parsed = cli(
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

			test('simple parsing with empty --', () => {
				const callback = spy();
				const parsed = cli(
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

			test('spread', () => {
				const callback = spy();
				const parsed = cli(
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

			test('spread with --', () => {
				const callback = spy();
				const parsed = cli(
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

			test('command', () => {
				const callback = spy();

				const testCommand = command({
					name: 'test',
					parameters: ['<arg-a...>'],
				}, (callbackParsed) => {
					expect<string[]>(callbackParsed._.argA).toStrictEqual(['valueA', 'valueB']);
					callback();
				});

				const parsed = cli(
					{
						parameters: ['<value-a...>'],

						commands: [
							testCommand,
						],
					},
					undefined,
					['test', 'valueA', 'valueB'],
				);

				if (parsed.command === 'test') {
					expect<string[]>(parsed._.argA).toStrictEqual(['valueA', 'valueB']);
				}
				expect(callback.called).toBe(true);
			});
		});
	});
});
