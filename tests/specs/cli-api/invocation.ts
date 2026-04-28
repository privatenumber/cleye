import { describe, test, expect } from 'manten';
import { cli } from '#cleye';

describe('cli() invocation', () => {
	test('throws when options is omitted', () => {
		expect(
			// @ts-expect-error no options
			() => cli(),
		).toThrow('Options is required');
	});

	test('allows any name including spaces and empty string', () => {
		expect(() => cli({ name: '' })).not.toThrow();
		expect(() => cli({ name: 'a b' })).not.toThrow();
		expect(() => cli({ name: 'a.b_' })).not.toThrow();
	});
}, { parallel: false });
