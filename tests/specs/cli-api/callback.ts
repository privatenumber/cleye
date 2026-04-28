import { setImmediate } from 'node:timers/promises';
import { describe, test, expect } from 'manten';
import { cli } from '#cleye';

describe('cli() callback', () => {
	test('async callbacks resolve before cli() returns', async () => {
		let asyncCompleted = false;
		await cli({}, async () => {
			await setImmediate();
			asyncCompleted = true;
		});
		expect(asyncCompleted).toBe(true);
	});

	describe('error handling', () => {
		test('callback throws synchronous error → cli() rejects', async () => {
			await expect(
				cli({}, () => {
					throw new Error('Callback error');
				}),
			).rejects.toThrow('Callback error');
		});

		test('callback returns rejected Promise → cli() rejects', async () => {
			await expect(
				cli({}, async () => {
					throw new Error('Async error');
				}),
			).rejects.toThrow('Async error');
		});
	});

	describe('Promise semantics', () => {
		test('parsed properties are accessible after awaiting', async () => {
			const result = await cli({
				parameters: ['<value>'],
			}, async (parsed) => {
				await setImmediate();
				return parsed;
			}, ['test']);

			expect<string>(result._.value).toBe('test');
		});

		test('cli() Promise waits for callback to complete', async () => {
			let callbackCompleted = false;

			const resultPromise = cli({}, async () => {
				await setImmediate();
				callbackCompleted = true;
			});

			// Not yet — promise is still pending while callback awaits.
			expect(callbackCompleted).toBe(false);

			await resultPromise;
			expect(callbackCompleted).toBe(true);
		});

		test('cli() never resolves if callback never resolves', async () => {
			let cliResolved = false;

			const resultPromise = cli({}, async () => {
				await new Promise(() => {});
			});

			await Promise.race([
				resultPromise.then(() => {
					cliResolved = true;
				}),
				setImmediate(50),
			]);

			expect(cliResolved).toBe(false);
		});
	});
}, { parallel: false });
