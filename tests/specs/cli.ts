import { setImmediate } from 'node:timers/promises';
import { describe, test, expect } from 'manten';
import { cli } from '#cleye';

describe('cli', () => {
	describe('error-handling', () => {
		test('must pass in options', async () => {
			await expect(
				// @ts-expect-error no options
				cli(),
			).rejects.toThrow('Options is required');
		});

		test('missing name', async () => {
			await expect(
				cli({
					name: '',
				}),
			).rejects.toThrow('Invalid script name: ""');
		});

		test('invalid name format', async () => {
			await expect(
				cli({
					name: 'a b',
				}),
			).rejects.toThrow('Invalid script name: "a b"');
		});

		test('allowed name format', async () => {
			await cli({
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

	describe('Promise behavior', () => {
		test('cli Promise waits for callback to complete', async () => {
			let callbackCompleted = false;

			await cli({}, async () => {
				await setImmediate();
				callbackCompleted = true;
			});

			expect(callbackCompleted).toBe(true);
		});

		test('result is the parsed argv', async () => {
			const result = await cli({
				parameters: ['<value>'],
			}, async () => {
				await setImmediate();
			}, ['test']);

			expect<string>(result._.value).toBe('test');
		});
	});
});
