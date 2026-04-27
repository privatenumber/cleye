import { describe, test, expect } from 'manten';
import { cli } from '#cleye';
import { camelCase } from '../../src/utils/convert-case.ts';

describe('edge cases', () => {
	describe('camelCase conversion', () => {
		test('already camelCase input', async () => {
			const parsed = cli({
				parameters: ['<myValue>'],
			}, undefined, ['test']);

			expect<string>(parsed._.myValue).toBe('test');
		});

		test('multiple consecutive separators', async () => {
			const parsed = cli({
				parameters: ['<value--name>'],
			}, undefined, ['test']);

			expect<string>(parsed._.valueName).toBe('test');
		});

		test('mixed separators', async () => {
			const parsed = cli({
				parameters: ['<value_name-here>'],
			}, undefined, ['test']);

			expect<string>(parsed._.valueNameHere).toBe('test');
		});

		test('leading separator', async () => {
			const parsed = cli({
				parameters: ['<-value>'],
			}, undefined, ['test']);

			// Leading separator causes first letter to be capitalized
			expect<string>(parsed._.Value).toBe('test');
		});

		test('trailing separator', async () => {
			const parsed = cli({
				parameters: ['<value_>'],
			}, undefined, ['test']);

			expect<string>(parsed._.value).toBe('test');
		});

		test('numbers in parameter name', async () => {
			const parsed = cli({
				parameters: ['<value1>'],
			}, undefined, ['test']);

			expect<string>(parsed._.value1).toBe('test');
		});

		test('leading number in parameter name', async () => {
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
			// Leading separator causes first letter to be capitalized
			expect(camelCase('-hello')).toBe('Hello');
			expect(camelCase('hello-')).toBe('hello');
			expect(camelCase('myValue')).toBe('myValue');
			expect(camelCase('value1')).toBe('value1');
			expect(camelCase('1value')).toBe('1value');
		});
	});

	describe('parameter validation edge cases', () => {
		test('parameter with special characters', async () => {
			const parsed = cli({
				parameters: ['<file-path>'],
			}, undefined, ['test.txt']);

			expect<string>(parsed._.filePath).toBe('test.txt');
		});

		test('very long parameter name', async () => {
			const longName = '<this-is-a-very-long-parameter-name-with-many-words>';
			const parsed = cli({
				parameters: [longName],
			}, undefined, ['value']);

			expect<string>(parsed._.thisIsAVeryLongParameterNameWithManyWords).toBe('value');
		});

		test('parameter with uppercase letters', async () => {
			const parsed = cli({
				parameters: ['<FileNAME>'],
			}, undefined, ['test.txt']);

			// camelCase doesn't change case without separators
			expect<string>(parsed._.FileNAME).toBe('test.txt');
		});

		test('whitespace-only parameter value', async () => {
			const parsed = cli({
				parameters: ['<value>'],
			}, undefined, ['   ']);

			expect<string>(parsed._.value).toBe('   ');
		});
	});

	describe('flag value edge cases', () => {
		test('flag with empty string value', async () => {
			const parsed = cli({
				flags: {
					value: String,
				},
			}, undefined, ['--value=']);

			expect<string | undefined>(parsed.flags.value).toBe('');
		});

		test('flag with whitespace value', async () => {
			const parsed = cli({
				flags: {
					value: String,
				},
			}, undefined, ['--value', '   ']);

			expect<string | undefined>(parsed.flags.value).toBe('   ');
		});

		test('number flag with zero', async () => {
			const parsed = cli({
				flags: {
					value: Number,
				},
			}, undefined, ['--value', '0']);

			expect<number | undefined>(parsed.flags.value).toBe(0);
		});

		test('number flag with negative', async () => {
			const parsed = cli({
				flags: {
					value: Number,
				},
			}, undefined, ['--value=-42']);

			expect<number | undefined>(parsed.flags.value).toBe(-42);
		});

		test('number flag with decimal', async () => {
			const parsed = cli({
				flags: {
					value: Number,
				},
			}, undefined, ['--value', '3.14']);

			expect<number | undefined>(parsed.flags.value).toBe(3.14);
		});
	});

	describe('command name edge cases', () => {
		test('command name with numbers', async () => {
			await expect(async () => {
				cli({
					commands: {
						cmd1: () => {},
					},
				}, undefined, ['cmd1']);
			}).not.toThrow();
		});

		test('command name with dash', async () => {
			await expect(async () => {
				cli({
					commands: {
						'my-command': () => {},
					},
				}, undefined, ['my-command']);
			}).not.toThrow();
		});

		test('command name with underscore', async () => {
			await expect(async () => {
				cli({
					commands: {
						my_command: () => {},
					},
				}, undefined, ['my_command']);
			}).not.toThrow();
		});
	});
});
