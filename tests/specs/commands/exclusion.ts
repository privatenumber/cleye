import { describe, test, expect } from 'manten';
import { cli } from '#cleye';

describe('parameters and commands mutual exclusion', () => {
	test('throws synchronously when both are provided', () => {
		// @ts-expect-error — runtime guard companion; type also rejects.
		expect(() => cli({
			parameters: ['<file>'],
			commands: { build: () => {} },
		})).toThrow(/mutually exclusive/);
	});

	test('does not throw when only parameters is provided', () => {
		expect(() => cli({
			parameters: ['<file>'],
		}, undefined, ['x'])).not.toThrow();
	});

	test('does not throw when only commands is provided', () => {
		expect(() => cli({
			commands: { build: () => {} },
		}, undefined, ['build'])).not.toThrow();
	});

	test('empty parameters or empty commands does not trigger the guard', () => {
		// @ts-expect-error — type still rejects coexistence even if empty.
		expect(() => cli({
			parameters: [],
			commands: { build: () => {} },
		}, undefined, ['build'])).not.toThrow();
		// @ts-expect-error — type still rejects coexistence even if empty.
		expect(() => cli({
			parameters: ['<file>'],
			commands: {},
		}, undefined, ['x'])).not.toThrow();
	});
}, { parallel: false });
