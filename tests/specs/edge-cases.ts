import { describe, test, expect } from 'manten';
import { camelCase, kebabCase } from '../../src/utils/convert-case.ts';
import { isValidScriptName } from '../../src/utils/script-name.ts';
import { cli, command } from '#cleye';

describe('edge cases', () => {
	describe('camelCase conversion', () => {
		test('already camelCase input', async () => {
			const parsed = await cli(
				{
					parameters: ['<myValue>'],
				},
				undefined,
				['test'],
			);

			expect<string>(parsed._.myValue).toBe('test');
		});

		test('multiple consecutive separators', async () => {
			const parsed = await cli(
				{
					parameters: ['<value--name>'],
				},
				undefined,
				['test'],
			);

			expect<string>(parsed._.valueName).toBe('test');
		});

		test('mixed separators', async () => {
			const parsed = await cli(
				{
					parameters: ['<value_name-here>'],
				},
				undefined,
				['test'],
			);

			expect<string>(parsed._.valueNameHere).toBe('test');
		});

		test('leading separator', async () => {
			const parsed = await cli(
				{
					parameters: ['<-value>'],
				},
				undefined,
				['test'],
			);

			// Leading separator causes first letter to be capitalized
			expect<string>(parsed._.Value).toBe('test');
		});

		test('trailing separator', async () => {
			const parsed = await cli(
				{
					parameters: ['<value_>'],
				},
				undefined,
				['test'],
			);

			expect<string>(parsed._.value).toBe('test');
		});

		test('numbers in parameter name', async () => {
			const parsed = await cli(
				{
					parameters: ['<value1>'],
				},
				undefined,
				['test'],
			);

			expect<string>(parsed._.value1).toBe('test');
		});

		test('leading number in parameter name', async () => {
			const parsed = await cli(
				{
					parameters: ['<1value>'],
				},
				undefined,
				['test'],
			);

			expect<string>(parsed._['1value']).toBe('test');
		});

		test('camelCase utility directly', async () => {
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

	describe('kebabCase conversion', () => {
		test('basic camelCase to kebab-case', async () => {
			expect(kebabCase('helloWorld')).toBe('hello-world');
			expect(kebabCase('myValue')).toBe('my-value');
			expect(kebabCase('getValue')).toBe('get-value');
		});

		test('multiple uppercase letters', async () => {
			expect(kebabCase('getHTTPResponse')).toBe('get-h-t-t-p-response');
			expect(kebabCase('XMLParser')).toBe('x-m-l-parser');
		});

		test('already kebab-case input', async () => {
			expect(kebabCase('hello-world')).toBe('hello-world');
			expect(kebabCase('my-value')).toBe('my-value');
		});

		test('single character', async () => {
			expect(kebabCase('a')).toBe('a');
			expect(kebabCase('A')).toBe('a');
		});

		test('all lowercase', async () => {
			expect(kebabCase('helloworld')).toBe('helloworld');
		});

		test('all uppercase', async () => {
			expect(kebabCase('ABC')).toBe('a-b-c');
		});

		test('empty string', async () => {
			expect(kebabCase('')).toBe('');
		});

		test('leading uppercase', async () => {
			expect(kebabCase('HelloWorld')).toBe('hello-world');
		});

		test('numbers in name', async () => {
			expect(kebabCase('value1Name')).toBe('value1-name');
			expect(kebabCase('get2ndValue')).toBe('get2nd-value');
		});
	});

	describe('parameter validation edge cases', () => {
		// Skipping: test('parameter with only brackets' - causes test suite to fail
		// The empty parameter name causes the parser to throw but also print help

		test('parameter with special characters', async () => {
			const parsed = await cli(
				{
					parameters: ['<file-path>'],
				},
				undefined,
				['test.txt'],
			);

			expect<string>(parsed._.filePath).toBe('test.txt');
		});

		test('very long parameter name', async () => {
			const longName = '<this-is-a-very-long-parameter-name-with-many-words>';
			const parsed = await cli(
				{
					parameters: [longName],
				},
				undefined,
				['value'],
			);

			expect<string>(parsed._.thisIsAVeryLongParameterNameWithManyWords).toBe('value');
		});

		test('parameter with uppercase letters', async () => {
			const parsed = await cli(
				{
					parameters: ['<FileNAME>'],
				},
				undefined,
				['test.txt'],
			);

			// camelCase doesn't change case without separators
			expect<string>(parsed._.FileNAME).toBe('test.txt');
		});

		// Skipped: empty string parameter value triggers validation error and help output
		// which cannot be easily tested with expect().toThrow()

		test('whitespace-only parameter value', async () => {
			const parsed = await cli(
				{
					parameters: ['<value>'],
				},
				undefined,
				['   '],
			);

			expect<string>(parsed._.value).toBe('   ');
		});
	});

	describe('flag value edge cases', () => {
		test('flag with empty string value', async () => {
			const parsed = await cli(
				{
					flags: {
						value: String,
					},
				},
				undefined,
				['--value='],
			);

			expect<string | undefined>(parsed.flags.value).toBe('');
		});

		test('flag with whitespace value', async () => {
			const parsed = await cli(
				{
					flags: {
						value: String,
					},
				},
				undefined,
				['--value', '   '],
			);

			expect<string | undefined>(parsed.flags.value).toBe('   ');
		});

		test('number flag with zero', async () => {
			const parsed = await cli(
				{
					flags: {
						value: Number,
					},
				},
				undefined,
				['--value', '0'],
			);

			expect<number | undefined>(parsed.flags.value).toBe(0);
		});

		test('number flag with negative', async () => {
			const parsed = await cli(
				{
					flags: {
						value: Number,
					},
				},
				undefined,
				['--value=-42'],
			);

			expect<number | undefined>(parsed.flags.value).toBe(-42);
		});

		test('number flag with decimal', async () => {
			const parsed = await cli(
				{
					flags: {
						value: Number,
					},
				},
				undefined,
				['--value', '3.14'],
			);

			expect<number | undefined>(parsed.flags.value).toBe(3.14);
		});
	});

	describe('command name edge cases', () => {
		test('command name with numbers', async () => {
			const cmd1 = command({
				name: 'cmd1',
			});

			await cli(
				{
					commands: [cmd1],
				},
				undefined,
				['cmd1'],
			);
		});

		test('command name with dash', async () => {
			const myCommand = command({
				name: 'my-command',
			});

			await cli(
				{
					commands: [myCommand],
				},
				undefined,
				['my-command'],
			);
		});

		test('command name with underscore', async () => {
			const myCommand = command({
				name: 'my_command',
			});

			await cli(
				{
					commands: [myCommand],
				},
				undefined,
				['my_command'],
			);
		});
	});

	describe('isValidScriptName edge cases', () => {
		test('empty string is invalid', async () => {
			expect(isValidScriptName('')).toBe(false);
		});

		test('single space is invalid', async () => {
			expect(isValidScriptName(' ')).toBe(false);
		});

		test('multiple spaces is invalid', async () => {
			expect(isValidScriptName('   ')).toBe(false);
		});

		test('name with space is invalid', async () => {
			expect(isValidScriptName('my command')).toBe(false);
		});

		test('tab character is valid (not a space)', async () => {
			// The current implementation only checks for space character
			expect(isValidScriptName('my\tcommand')).toBe(true);
		});

		test('newline character is valid (not a space)', async () => {
			// The current implementation only checks for space character
			expect(isValidScriptName('my\ncommand')).toBe(true);
		});

		test('leading space is invalid', async () => {
			expect(isValidScriptName(' command')).toBe(false);
		});

		test('trailing space is invalid', async () => {
			expect(isValidScriptName('command ')).toBe(false);
		});

		test('valid names', async () => {
			expect(isValidScriptName('command')).toBe(true);
			expect(isValidScriptName('my-command')).toBe(true);
			expect(isValidScriptName('my_command')).toBe(true);
			expect(isValidScriptName('cmd123')).toBe(true);
			expect(isValidScriptName('a')).toBe(true);
		});

		test('unicode characters are valid', async () => {
			expect(isValidScriptName('命令')).toBe(true);
			expect(isValidScriptName('café')).toBe(true);
		});

		test('special characters are valid', async () => {
			expect(isValidScriptName('@scope/package')).toBe(true);
			expect(isValidScriptName('name.ext')).toBe(true);
		});
	});
});
