import { testSuite, expect } from 'manten';
import { spy } from 'nanospy';
import { cli } from '../../dist/index.js';
import { mockEnvFunctions } from '../utils/mock-env-functions';

export default testSuite(({ describe }) => {
	describe('flags', ({ describe, test }) => {
		test('has return type & callback', () => {
			const callback = spy();
			const argv = cli(
				{
					parameters: ['<value-a>', '[value-B]'],
					flags: {
						flagA: String,
						flagB: {
							type: Number,
						},
					},
				},
				(parsed) => {
					expect<string | undefined>(parsed.flags.flagA).toBe('valueA');
					expect<number | undefined>(parsed.flags.flagB).toBe(123);
					callback();
				},
				['--flagA', 'valueA', '--flagB', '123', 'valueA', 'valueB'],
			);

			if (!argv.command) {
				expect<string>(argv._.valueA).toBe('valueA');
				expect<string | undefined>(argv._.valueB).toBe('valueB');
				expect<string | undefined>(argv.flags.flagA).toBe('valueA');
				expect<number | undefined>(argv.flags.flagB).toBe(123);
				expect(callback.called).toBe(true);
			}
		});

		describe('version', ({ test }) => {
			test('disabled', () => {
				const mocked = mockEnvFunctions();
				const parsed = cli(
					{},
					(p) => {
						expect<{
							version?: undefined;
							help: boolean | undefined;
						}>(p.flags).toEqual({});
					},
					['--version'],
				);
				mocked.restore();

				expect<{
					version?: undefined;
					help: boolean | undefined;
				}>(parsed.flags).toEqual({});
				expect(mocked.consoleLog.called).toBe(false);
				expect(mocked.processExit.called).toBe(false);
			});

			test('enabled', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						version: '1.0.0',
						flags: {
							flagA: String,
						},
					},
					({ flags }) => {
						expect<boolean | undefined>(flags.version).toBe(true);
					},
					['--version'],
				);
				mocked.restore();

				expect(mocked.consoleLog.called).toBe(true);
				expect(mocked.processExit.calls).toStrictEqual([[0]]);
			});
		});

		describe('help', ({ test }) => {
			test('disabled', () => {
				const mocked = mockEnvFunctions();
				const parsed = cli(
					{
						help: false,
					},
					(p) => {
						expect<{
							help?: undefined;
						}>(p.flags).toEqual({});
					},
					['--help'],
				);
				mocked.restore();

				expect<{
					help?: undefined;
				}>(parsed.flags).toEqual({});
				expect(mocked.consoleLog.called).toBe(false);
				expect(mocked.processExit.called).toBe(false);
			});

			test('enabled', () => {
				const mocked = mockEnvFunctions();
				cli(
					{
						flags: {
							flagA: String,
						},
					},
					({ flags }) => {
						expect<boolean | undefined>(flags.help).toBe(true);
					},
					['--help'],
				);
				mocked.restore();

				expect(mocked.consoleLog.called).toBe(true);
				expect(mocked.processExit.calls).toStrictEqual([[0]]);
			});
		});
	});
});
