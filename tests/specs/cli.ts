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

		describe('callback error handling', ({ test }) => {
			test('callback throws synchronous error', () => {
				expect(() => {
					cli({}, () => {
						throw new Error('Callback error');
					});
				}).toThrow('Callback error');
			});

			test('callback returns rejected Promise', async () => {
				const result = cli({}, async () => {
					throw new Error('Async error');
				});
				await expect(result).rejects.toThrow('Async error');
			});

			test('callback with fake promise thenable', () => {
				const fakePromise = {
					then: (resolve: any) => resolve('fake'), // eslint-disable-line unicorn/no-thenable
				};
				const result = cli({}, () => fakePromise as any);
				expect(result).toHaveProperty('then');
			});
		});

		describe('Promise edge cases', ({ test }) => {
			test('result properties accessible on Promise return', async () => {
				const result = cli({
					parameters: ['<value>'],
				}, async () => {
					await setImmediate();
				}, ['test']);

				// Properties should be accessible even though callback returns Promise
				expect<string>(result._.value).toBe('test');

				// And it's awaitable
				await result;
			});
		});
	});
});
