import { cli } from '../dist/index.js';

describe('flags', () => {
	test('has return type & callback', () => {
		const callback = jest.fn();
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
			expect(callback).toHaveBeenCalled();
		}
	});

	describe('vearsion', () => {
		test('disabled', () => {
			const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
			const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

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

			expect(mockConsoleLog).not.toHaveBeenCalled();
			expect(mockProcessExit).not.toHaveBeenCalled();
			expect<{
				version?: undefined;
				help: boolean | undefined;
			}>(parsed.flags).toEqual({});

			mockConsoleLog.mockRestore();
			mockProcessExit.mockRestore();
		});

		test('enabled', () => {
			const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
			const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

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

			expect(mockConsoleLog).toHaveBeenCalled();
			expect(mockProcessExit).toHaveBeenCalledWith(0);

			mockConsoleLog.mockRestore();
			mockProcessExit.mockRestore();
		});
	});

	describe('help', () => {
		test('disabled', () => {
			const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
			const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

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

			expect(mockConsoleLog).not.toHaveBeenCalled();
			expect(mockProcessExit).not.toHaveBeenCalled();
			expect<{
				help?: undefined;
			}>(parsed.flags).toEqual({});

			mockConsoleLog.mockRestore();
			mockProcessExit.mockRestore();
		});

		test('enabled', () => {
			const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
			const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

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

			expect(mockConsoleLog).toHaveBeenCalled();
			expect(mockProcessExit).toHaveBeenCalledWith(0);

			mockConsoleLog.mockRestore();
			mockProcessExit.mockRestore();
		});
	});
});
