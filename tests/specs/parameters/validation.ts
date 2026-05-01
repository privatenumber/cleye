import { describe, test, expect } from 'manten';
import { cli } from '#cleye';
import { mockEnvFunctions } from '../../utils/mock-env-functions.ts';

describe('parameter validation', () => {
	describe('invalid parameter declarations', () => {
		test('invalid parameter format', () => {
			expect(
				() => cli({
					parameters: ['value-a'],
				}),
			).toThrow('Invalid parameter: "value-a". Must be wrapped in <> (required parameter) or [] (optional parameter)');
		});

		test('invalid parameter character', () => {
			expect(
				() => cli({
					parameters: ['[value.a]'],
				}),
			).toThrow('Invalid parameter: "[value.a]". Invalid character found "."');
		});

		test('invalid parameter — all special characters', () => {
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
				expect(
					() => cli({
						parameters: [`<value${char}a>`],
					}),
				).toThrow('Invalid character found');
			}
		});

		test('duplicate parameters', () => {
			expect(
				() => cli({
					parameters: ['[value-a]', '[value-a]', '[value-a]'],
				}),
			).toThrow('Invalid parameter: "value-a" is used more than once');
		});

		test('duplicate parameters across --', () => {
			expect(
				() => cli({
					parameters: ['[value-a]', '--', '[value-a]'],
				}),
			).toThrow('Invalid parameter: "value-a" is used more than once');
		});

		test('multiple --', () => {
			expect(
				() => cli({
					parameters: ['[value-a]', '--', '[value-b]', '--', '[value-c]'],
				}),
			).toThrow('Invalid parameter: "--". Must be wrapped in <> (required parameter) or [] (optional parameter)');
		});

		test('optional parameter before required parameter', () => {
			expect(
				() => cli({
					parameters: ['[value-a]', '<value-b>'],
				}),
			).toThrow('Invalid parameter: Required parameter "<value-b>" cannot come after optional parameter "[value-a]"');
		});

		test('multiple spread not last', () => {
			expect(
				() => cli({
					parameters: ['[value-a...]', '<value-b>'],
				}),
			).toThrow('Invalid parameter: Spread parameter "[value-a...]" must be last');
		});

		test('multiple spread parameters', () => {
			expect(
				() => cli({
					parameters: ['[value-a...]', '<value-b...>'],
				}),
			).toThrow('Invalid parameter: Spread parameter "[value-a...]" must be last');
		});

		test('duplicate required parameters caught at parse time (no argv supplied)', () => {
			// Previously this surfaced as "Missing required parameter" because
			// the missing-required check fired before the duplicate check.
			expect(
				() => cli({ parameters: ['<a>', '<a>'] }),
			).toThrow('Invalid parameter: "a" is used more than once');
		});

		test('camelCase-collision error names both source parameters', () => {
			// "<file-name>" and "<fileName>" both camelCase to `fileName`.
			// The error must surface both source names, not just one.
			expect(
				() => cli({ parameters: ['<file-name>', '<fileName>'] }),
			).toThrow(/Invalid parameter: ["']?fileName["']? collides with ["']?file-name["']?/);
		});

		test('rejects empty parameter name "<>"', () => {
			expect(() => cli({ parameters: ['<>'] })).toThrow(
				/Invalid parameter/,
			);
		});

		test('rejects parameter that camelCases to empty string', () => {
			// "<-->" strips to "--", camelCase('--') === ''. Currently populates
			// `parsed._['']`. Should reject at parse time.
			expect(() => cli({ parameters: ['<-->'] })).toThrow(
				/Invalid parameter/,
			);
		});
	}, { parallel: false });

	describe('missing arguments', () => {
		test('missing required parameters', () => {
			for (const parameters of [
				['<value-a>'],
				['<value-a...>'],
				['--', '<value-a>'],
			]) {
				const mocked = mockEnvFunctions();
				cli({ parameters }, undefined, []);
				mocked.restore();

				expect(mocked.consoleError.calls[0]).toStrictEqual(['Error: Missing required parameter "value-a"\n']);
				expect(mocked.processExit.calls[0]).toStrictEqual([1]);
			}
		});
	}, { parallel: false });

	describe('parameter name edge cases', () => {
		test('very long parameter name', () => {
			const parsed = cli({
				parameters: ['<this-is-a-very-long-parameter-name-with-many-words>'],
			}, undefined, ['value']);

			expect<string>(parsed._.thisIsAVeryLongParameterNameWithManyWords).toBe('value');
		});

		test('parameter with uppercase letters preserves casing without separators', () => {
			const parsed = cli({
				parameters: ['<FileNAME>'],
			}, undefined, ['test.txt']);

			expect<string>(parsed._.FileNAME).toBe('test.txt');
		});

		test('whitespace-only parameter value', () => {
			const parsed = cli({
				parameters: ['<value>'],
			}, undefined, ['   ']);

			expect<string>(parsed._.value).toBe('   ');
		});

		test('empty-string positional satisfies a required parameter', () => {
			// Empty string is a valid argv value; it must not be treated as
			// "missing required". Reproduces a bug where `!value` rejected ''.
			const mocked = mockEnvFunctions();
			const parsed = cli({ parameters: ['<value>'] }, undefined, ['']);
			mocked.restore();

			expect(mocked.consoleError.called).toBe(false);
			expect(mocked.processExit.called).toBe(false);
			expect<string>(parsed._.value).toBe('');
		});
	});
}, { parallel: false });
