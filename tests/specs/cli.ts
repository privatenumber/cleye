import { testSuite, expect } from 'manten';
import { cli } from '#cleye';

export default testSuite(({ describe }) => {
	describe('cli', ({ describe }) => {
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
	});
});
