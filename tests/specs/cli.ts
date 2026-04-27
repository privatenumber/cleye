import { setImmediate } from 'node:timers/promises';
import { describe, test, expect } from 'manten';
import { cli } from '#cleye';

describe('cli', () => {
	describe('error-handling', () => {
		test('must pass in options', () => {
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
	});

	test('async callbacks', async () => {
		let asyncCompleted = false;
		await cli({}, async () => {
			await setImmediate();
			asyncCompleted = true;
		});
		expect(asyncCompleted).toBe(true);
	});

	describe('callback error handling', () => {
		test('callback throws synchronous error', async () => {
			await expect(
				cli({}, () => {
					throw new Error('Callback error');
				}),
			).rejects.toThrow('Callback error');
		});

		test('callback returns rejected Promise', async () => {
			await expect(
				cli({}, async () => {
					throw new Error('Async error');
				}),
			).rejects.toThrow('Async error');
		});
	});

	describe('Promise edge cases', () => {
		test('result properties accessible after await', async () => {
			const result = await cli({
				parameters: ['<value>'],
			}, async (parsed) => {
				await setImmediate();
				return parsed;
			}, ['test']);

			expect<string>(result._.value).toBe('test');
		});

		test('cli Promise waits for callback to complete', async () => {
			let callbackCompleted = false;

			const resultPromise = cli({}, async () => {
				await setImmediate();
				callbackCompleted = true;
			});

			// Callback shouldn't have completed yet
			expect(callbackCompleted).toBe(false);

			// After awaiting cli, callback should be complete
			await resultPromise;
			expect(callbackCompleted).toBe(true);
		});

		test('cli Promise never resolves if callback never resolves', async () => {
			let cliResolved = false;

			const resultPromise = cli({}, async () => {
				// Never resolve - hang forever
				await new Promise(() => {});
			});

			// Race the cli promise against a timeout
			await Promise.race([
				resultPromise.then(() => {
					cliResolved = true;
				}),
				setImmediate(50),
			]);

			// cli should not have resolved
			expect(cliResolved).toBe(false);
		});
	});
});
