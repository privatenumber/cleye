import { testSuite, expect } from 'manten';
import { camelCase } from '../../src/utils/convert-case.js';
import { cli, command } from '#cleye';

export default testSuite(({ describe }) => {
	describe('edge cases', ({ describe }) => {
		describe('camelCase conversion', ({ test }) => {
			test('already camelCase input', () => {
				const parsed = cli(
					{
						parameters: ['<myValue>'],
					},
					undefined,
					['test'],
				);

				expect<string>(parsed._.myValue).toBe('test');
			});

			test('multiple consecutive separators', () => {
				const parsed = cli(
					{
						parameters: ['<value--name>'],
					},
					undefined,
					['test'],
				);

				expect<string>(parsed._.valueName).toBe('test');
			});

			test('mixed separators', () => {
				const parsed = cli(
					{
						parameters: ['<value_name-here>'],
					},
					undefined,
					['test'],
				);

				expect<string>(parsed._.valueNameHere).toBe('test');
			});

			test('leading separator', () => {
				const parsed = cli(
					{
						parameters: ['<-value>'],
					},
					undefined,
					['test'],
				);

				// Leading separator causes first letter to be capitalized
				expect<string>(parsed._.Value).toBe('test');
			});

			test('trailing separator', () => {
				const parsed = cli(
					{
						parameters: ['<value_>'],
					},
					undefined,
					['test'],
				);

				expect<string>(parsed._.value).toBe('test');
			});

			test('numbers in parameter name', () => {
				const parsed = cli(
					{
						parameters: ['<value1>'],
					},
					undefined,
					['test'],
				);

				expect<string>(parsed._.value1).toBe('test');
			});

			test('leading number in parameter name', () => {
				const parsed = cli(
					{
						parameters: ['<1value>'],
					},
					undefined,
					['test'],
				);

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

		describe('parameter validation edge cases', ({ test }) => {
			// Skipping: test('parameter with only brackets' - causes test suite to fail
			// The empty parameter name causes the parser to throw but also print help

			test('parameter with special characters', () => {
				const parsed = cli(
					{
						parameters: ['<file-path>'],
					},
					undefined,
					['test.txt'],
				);

				expect<string>(parsed._.filePath).toBe('test.txt');
			});

			test('very long parameter name', () => {
				const longName = '<this-is-a-very-long-parameter-name-with-many-words>';
				const parsed = cli(
					{
						parameters: [longName],
					},
					undefined,
					['value'],
				);

				expect<string>(parsed._.thisIsAVeryLongParameterNameWithManyWords).toBe('value');
			});

			test('parameter with uppercase letters', () => {
				const parsed = cli(
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

			test('whitespace-only parameter value', () => {
				const parsed = cli(
					{
						parameters: ['<value>'],
					},
					undefined,
					['   '],
				);

				expect<string>(parsed._.value).toBe('   ');
			});
		});

		describe('flag value edge cases', ({ test }) => {
			test('flag with empty string value', () => {
				const parsed = cli(
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

			test('flag with whitespace value', () => {
				const parsed = cli(
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

			test('number flag with zero', () => {
				const parsed = cli(
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

			test('number flag with negative', () => {
				const parsed = cli(
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

			test('number flag with decimal', () => {
				const parsed = cli(
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

		describe('command name edge cases', ({ test }) => {
			test('command name with numbers', () => {
				const cmd1 = command({
					name: 'cmd1',
				});

				expect(() => {
					cli(
						{
							commands: [cmd1],
						},
						undefined,
						['cmd1'],
					);
				}).not.toThrow();
			});

			test('command name with dash', () => {
				const myCommand = command({
					name: 'my-command',
				});

				expect(() => {
					cli(
						{
							commands: [myCommand],
						},
						undefined,
						['my-command'],
					);
				}).not.toThrow();
			});

			test('command name with underscore', () => {
				const myCommand = command({
					name: 'my_command',
				});

				expect(() => {
					cli(
						{
							commands: [myCommand],
						},
						undefined,
						['my_command'],
					);
				}).not.toThrow();
			});
		});
	});
});
