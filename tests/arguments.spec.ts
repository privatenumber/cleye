import { cli, command } from '../dist';

describe('error handling', () => {
	describe('parameters', () => {
		test('invalid parameter format', () => {
			expect(() => {
				const parsed = cli(
					{
						parameters: ['value-a'],
					},
				);

				expect<string[]>(parsed._).toStrictEqual([]);
			}).toThrow('Invalid parameter: "value-a". Must be wrapped in <> (required parameter) or [] (optional parameter)');
		});

		test('invalid parameter character', () => {
			expect(() => {
				const parsed = cli(
					{
						parameters: ['[value.a]'],
					},
				);

				expect<string[]>(parsed._).toStrictEqual([]);
			}).toThrow('Invalid parameter: "[value.a]". Invalid character found "."');
		});

		test('duplicate parameters', () => {
			expect(() => {
				const parsed = cli(
					{
						parameters: ['[value-a]', '[value-a]', '[value-a]'],
					},
				);

				expect<string[]>(parsed._).toStrictEqual([]);
			}).toThrow('Invalid parameter: "value-a" is used more than once');
		});

		test('duplicate parameters across --', () => {
			expect(() => {
				const parsed = cli(
					{
						parameters: ['[value-a]', '--', '[value-a]'],
					},
				);

				expect<string[]>(parsed._).toStrictEqual([]);
			}).toThrow('Invalid parameter: "value-a" is used more than once');
		});

		test('multiple --', () => {
			expect(() => {
				const parsed = cli(
					{
						parameters: ['[value-a]', '--', '[value-b]', '--', '[value-c]'],
					},
				);

				expect<string[]>(parsed._).toStrictEqual([]);
			}).toThrow('Invalid parameter: "--". Must be wrapped in <> (required parameter) or [] (optional parameter)');
		});

		test('optional parameter before required parameter', () => {
			expect(() => {
				const parsed = cli(
					{
						parameters: ['[value-a]', '<value-b>'],
					},
				);

				expect<string[]>(parsed._).toStrictEqual([]);
			}).toThrow('Invalid parameter: Required parameter "<value-b>" cannot come after optional parameter "[value-a]"');
		});

		test('multiple spread not last', () => {
			expect(() => {
				const parsed = cli(
					{
						parameters: ['[value-a...]', '<value-b>'],
					},
				);

				expect<string[]>(parsed._).toStrictEqual([]);
			}).toThrow('Invalid parameter: Spread parameter "[value-a...]" must be last');
		});

		test('multiple spread parameters', () => {
			expect(() => {
				const parsed = cli(
					{
						parameters: ['[value-a...]', '<value-b...>'],
					},
				);

				expect<string[]>(parsed._).toStrictEqual([]);
			}).toThrow('Invalid parameter: Spread parameter "[value-a...]" must be last');
		});
	});

	describe('arguments', () => {
		let mockProcessExit: jest.SpyInstance;
		let mockConsoleError: jest.SpyInstance;
		let mockConsoleLog: jest.SpyInstance;

		beforeEach(() => {
			mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();
			mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
			mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
		});

		afterEach(() => {
			mockProcessExit.mockRestore();
			mockConsoleError.mockRestore();
			mockConsoleLog.mockRestore();
		});

		test('missing parameter', () => {
			cli(
				{
					parameters: ['<value-a>'],
				},
				undefined,
				[],
			);

			expect(mockConsoleError).toHaveBeenCalledWith('Error: Missing required parameter "value-a"\n');
			expect(mockProcessExit).toHaveBeenCalledWith(1);
		});

		test('missing spread parameter', () => {
			cli(
				{
					parameters: ['<value-a...>'],
				},
				undefined,
				[],
			);

			expect(mockConsoleError).toHaveBeenCalledWith('Error: Missing required parameter "value-a"\n');
			expect(mockProcessExit).toHaveBeenCalledWith(1);
		});

		test('missing -- parameter', () => {
			cli(
				{
					parameters: ['--', '<value-a>'],
				},
				undefined,
				[],
			);

			expect(mockConsoleError).toHaveBeenCalledWith('Error: Missing required parameter "value-a"\n');
			expect(mockProcessExit).toHaveBeenCalledWith(1);
		});
	});
});

describe('parses arguments', () => {
	test('simple parsing', () => {
		const callback = jest.fn();
		const parsed = cli(
			{
				parameters: ['<value-a>', '[value-B]', '[value c]'],
			},
			(callbackParsed) => {
				expect<string>(callbackParsed._.valueA).toBe('valueA');
				expect<string | undefined>(callbackParsed._.valueB).toBe('valueB');
				expect<string | undefined>(callbackParsed._.valueC).toBe('valueC');
				callback();
			},
			['valueA', 'valueB', 'valueC'],
		);

		expect<string>(parsed._.valueA).toBe('valueA');
		expect<string | undefined>(parsed._.valueB).toBe('valueB');
		expect<string | undefined>(parsed._.valueC).toBe('valueC');
		expect(callback).toHaveBeenCalled();
	});

	test('simple parsing across --', () => {
		const callback = jest.fn();
		const parsed = cli(
			{
				parameters: ['<value-a>', '[value-b]', '[value c]', '--', '<value-d>', '[value-e]', '[value f]'],
			},
			(callbackParsed) => {
				expect<string>(callbackParsed._.valueA).toBe('valueA');
				expect<string | undefined>(callbackParsed._.valueB).toBe('valueB');
				expect<string | undefined>(callbackParsed._.valueD).toBe('valueD');
				callback();
			},
			['valueA', 'valueB', '--', 'valueD'],
		);

		expect<string>(parsed._.valueA).toBe('valueA');
		expect<string | undefined>(parsed._.valueB).toBe('valueB');
		expect<string | undefined>(parsed._.valueD).toBe('valueD');
		expect(callback).toHaveBeenCalled();
	});

	test('simple parsing with empty --', () => {
		const callback = jest.fn();
		const parsed = cli(
			{
				parameters: ['<value-a>', '[value-b]', '[value c]', '--', '[value-d]'],
			},
			(callbackParsed) => {
				expect<string>(callbackParsed._.valueA).toBe('valueA');
				expect<string | undefined>(callbackParsed._.valueB).toBe('valueB');
				callback();
			},
			['valueA', 'valueB'],
		);

		expect<string>(parsed._.valueA).toBe('valueA');
		expect<string | undefined>(parsed._.valueB).toBe('valueB');
		expect(callback).toHaveBeenCalled();
	});

	test('spread', () => {
		const callback = jest.fn();
		const parsed = cli(
			{
				parameters: ['<value-a...>'],
			},
			(callbackParsed) => {
				expect<string[]>(callbackParsed._.valueA).toStrictEqual(['valueA', 'valueB']);
				callback();
			},
			['valueA', 'valueB'],
		);

		expect<string[]>(parsed._.valueA).toStrictEqual(['valueA', 'valueB']);
		expect(callback).toHaveBeenCalled();
	});

	test('spread with --', () => {
		const callback = jest.fn();
		const parsed = cli(
			{
				parameters: ['<value-a...>', '--', '<value-b...>'],
			},
			(callbackParsed) => {
				expect<string[]>(callbackParsed._.valueA).toStrictEqual(['valueA', 'valueB']);
				expect<string[]>(callbackParsed._.valueB).toStrictEqual(['valueC', 'valueD']);
				callback();
			},
			['valueA', 'valueB', '--', 'valueC', 'valueD'],
		);

		expect<string[]>(parsed._.valueA).toStrictEqual(['valueA', 'valueB']);
		expect<string[]>(parsed._.valueB).toStrictEqual(['valueC', 'valueD']);
		expect(callback).toHaveBeenCalled();
	});

	test('command', () => {
		const callback = jest.fn();

		const testCommand = command({
			name: 'test',
			parameters: ['<arg-a...>'],
		}, (callbackParsed) => {
			expect<string[]>(callbackParsed._.argA).toStrictEqual(['valueA', 'valueB']);
			callback();
		});

		const parsed = cli(
			{
				parameters: ['<value-a...>'],

				commands: [
					testCommand,
				],
			},
			undefined,
			['test', 'valueA', 'valueB'],
		);

		if (parsed.command === 'test') {
			expect<string[]>(parsed._.argA).toStrictEqual(['valueA', 'valueB']);
		}
		expect(callback).toHaveBeenCalled();
	});
});
