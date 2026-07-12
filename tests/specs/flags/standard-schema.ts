import { stripVTControlCharacters } from 'node:util';
import { describe, test, expect } from 'manten';
import { expectTypeOf } from 'expect-type';
import * as z from 'zod';
import * as v from 'valibot';
import { cli } from '#cleye';
import { mockEnvFunctions } from '../../utils/mock-env-functions.ts';

describe('standard schema', () => {
	describe('parsing', () => {
		test('zod enum parses a valid value', () => {
			const parsed = cli({
				flags: { size: z.enum(['small', 'medium', 'large']) },
			}, undefined, ['--size', 'medium']);
			if (parsed.command === undefined) {
				expect(parsed.flags.size).toBe('medium');
			}
		});

		test('zod enum rejects an invalid value with a clean, flag-named error', () => {
			const mocked = mockEnvFunctions();
			cli({
				flags: { size: z.enum(['small', 'large']) },
			}, undefined, ['--size', 'xlarge']);
			mocked.restore();
			expect(mocked.processExit.calls).toStrictEqual([[1]]);
			const [message] = mocked.consoleError.calls[0] as [string];
			expect(message.startsWith('Error: Flag "--size":')).toBe(true);
		});

		test('zod coerce.number coerces the string value to a number', () => {
			const parsed = cli({
				flags: { port: z.coerce.number() },
			}, undefined, ['--port', '8080']);
			if (parsed.command === undefined) {
				expect(parsed.flags.port).toBe(8080);
			}
		});

		test('a schema wrapped in an array collects multiple values', () => {
			const parsed = cli({
				flags: { tags: [z.string()] },
			}, undefined, ['--tags', 'a', '--tags', 'b']);
			if (parsed.command === undefined) {
				expect(parsed.flags.tags).toStrictEqual(['a', 'b']);
			}
		});

		test('a transform schema reshapes the value', () => {
			const parsed = cli({
				flags: { list: z.string().transform(value => value.split(',')) },
			}, undefined, ['--list', 'a,b,c']);
			if (parsed.command === undefined) {
				expect(parsed.flags.list).toStrictEqual(['a', 'b', 'c']);
			}
		});

		test('cleye default applies when the flag is absent', () => {
			const parsed = cli({
				flags: {
					size: {
						type: z.enum(['small', 'large']),
						default: 'small',
					},
				},
			}, undefined, []);
			if (parsed.command === undefined) {
				expect(parsed.flags.size).toBe('small');
			}
		});

		test('valibot picklist parses a valid value', () => {
			const parsed = cli({
				flags: { mode: v.picklist(['dev', 'prod']) },
			}, undefined, ['--mode', 'prod']);
			if (parsed.command === undefined) {
				expect(parsed.flags.mode).toBe('prod');
			}
		});

		test('valibot rejects an invalid value with a clean, flag-named error', () => {
			const mocked = mockEnvFunctions();
			cli({
				flags: { mode: v.picklist(['dev', 'prod']) },
			}, undefined, ['--mode', 'staging']);
			mocked.restore();
			expect(mocked.processExit.calls).toStrictEqual([[1]]);
			const [message] = mocked.consoleError.calls[0] as [string];
			expect(message.startsWith('Error: Flag "--mode":')).toBe(true);
		});
	}, { parallel: false });

	describe('types', () => {
		test('infers the schema output as the flag type', () => {
			const parsed = cli({
				flags: {
					size: z.enum(['small', 'medium', 'large']),
					port: z.coerce.number(),
					tags: [z.string()],
					mode: v.picklist(['dev', 'prod']),
				},
			}, undefined, []);

			expectTypeOf(parsed.flags.size).toEqualTypeOf<'small' | 'medium' | 'large' | undefined>();
			expectTypeOf(parsed.flags.port).toEqualTypeOf<number | undefined>();
			expectTypeOf(parsed.flags.tags).toEqualTypeOf<string[]>();
			expectTypeOf(parsed.flags.mode).toEqualTypeOf<'dev' | 'prod' | undefined>();
		});

		test('a cleye default removes undefined from the inferred type', () => {
			const parsed = cli({
				flags: {
					size: {
						type: z.enum(['small', 'large']),

						// `as const` preserves the literal union; a plain default widens to string
						default: 'small' as const,
					},
				},
			}, undefined, []);

			expectTypeOf(parsed.flags.size).toEqualTypeOf<'small' | 'large'>();
		});
	}, { parallel: false });

	describe('help', () => {
		test('a bare schema flag does not render a spurious default', () => {
			const mocked = mockEnvFunctions();
			cli({
				name: 'demo',
				flags: { size: z.enum(['small', 'large']) },
			}, undefined, ['--help']);
			mocked.restore();

			// Strip ANSI so the assertion is hermetic against color env (CI runs FORCE_COLOR=1)
			const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0] as string);
			expect(output).toContain('--size');
			expect(output).not.toContain('default:');
		});

		test('placeholder and description are taken from the flag config', () => {
			const mocked = mockEnvFunctions();
			cli({
				name: 'demo',
				flags: {
					size: {
						type: z.enum(['small', 'large']),
						placeholder: '<size>',
						description: 'Pizza size',
					},
				},
			}, undefined, ['--help']);
			mocked.restore();

			const output = stripVTControlCharacters(mocked.consoleLog.calls[0][0] as string);
			expect(output).toContain('--size <size>');
			expect(output).toContain('Pizza size');
			expect(output).not.toContain('default:');
		});
	}, { parallel: false });
}, { parallel: false });
