import { setImmediate } from 'node:timers/promises';
import { testSuite, expect } from 'manten';
import { cli } from '#cleye';

export default testSuite(({ describe }) => {
	describe('cli', ({ describe, test }) => {
		describe('error-handling', ({ test }) => {
			test('must pass in options', () => {
				expect(() => {
					// @ts-expect-error no options
					cli();
				}).toThrow('Options is required');
			});

			test('missing name', () => {
				expect(() => {
					cli({
						name: '',
					});
				}).toThrow('Invalid script name: ""');
			});

			test('invalid name format', () => {
				expect(() => {
					cli({
						name: 'a b',
					});
				}).toThrow('Invalid script name: "a b"');
			});

			test('allowed name format', () => {
				cli({
					name: 'a.b_',
				});
			});
		});

		test('async callbacks', async () => {
			let asyncCompleted = false;
			await cli({}, async () => {
				await setImmediate();
				asyncCompleted = true;
			});
			expect(asyncCompleted).toBe(true);
		});
	});
});
