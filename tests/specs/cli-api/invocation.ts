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

	test('does not mutate the caller-provided argv array', () => {
		// type-flag mutates its argv input as a low-level filter feature; cleye
		// should treat the caller's array as input-only and not leak that.
		const argv = ['--verbose', 'foo'];
		const argvSnapshot = [...argv];
		cli({ flags: { verbose: Boolean } }, undefined, argv);
		expect(argv).toStrictEqual(argvSnapshot);
	});

	test('showVersion() is a no-op when options.version is not set', () => {
		const logs: unknown[] = [];
		const originalLog = console.log;
		console.log = (...args: unknown[]) => { logs.push(args); };
		try {
			const parsed = cli({}, undefined, []);
			parsed.showVersion();
		} finally {
			console.log = originalLog;
		}
		expect(logs).toStrictEqual([]);
	});
}, { parallel: false });
