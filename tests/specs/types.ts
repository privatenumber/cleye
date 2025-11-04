import { testSuite } from 'manten';
import { expectTypeOf } from 'expect-type';
import { cli, command } from '#cleye';

export default testSuite(({ describe }) => {
	describe('types', ({ test }) => {
		test('cli with parameters and flags', () => {
			const parsed = cli({
				parameters: ['<foo>', '[bar...]'],

				flags: {
					booleanFlag: Boolean,
					booleanFlagDefault: {
						type: Boolean,
						default: false,
					},
					stringFlag: String,
					stringFlagDefault: {
						type: String,
						default: 'hello',
					},
					numberFlag: Number,
					numberFlagDefault: {
						type: Number,
						default: 1,
					},
					extraOptions: {
						type: Boolean,
						alias: 'e',
						default: false,
						description: 'Some description',
					},
				},
			}, undefined, ['value1']);

			// Type check when no command is matched
			if (parsed.command === undefined) {
				// Check parameters
				expectTypeOf(parsed._.foo).toBeString();
				expectTypeOf(parsed._.bar).toEqualTypeOf<string[]>();

				// Check it's also an Arguments type (has '--')
				expectTypeOf(parsed._['--']).toEqualTypeOf<string[]>();

				expectTypeOf(parsed.flags).toEqualTypeOf<{
					booleanFlag: boolean | undefined;
					booleanFlagDefault: boolean;
					stringFlag: string | undefined;
					stringFlagDefault: string;
					numberFlag: number | undefined;
					numberFlagDefault: number;
					extraOptions: boolean;
					help: boolean | undefined;
				}>();
			}
		});

		test('cli with commands', () => {
			const parsed = cli({
				flags: {
					booleanFlag: Boolean,
					booleanFlagDefault: {
						type: Boolean,
						default: false,
					},
					stringFlag: String,
					stringFlagDefault: {
						type: String,
						default: 'hello',
					},
					numberFlag: Number,
					numberFlagDefault: {
						type: Number,
						default: 1,
					},
					extraOptions: {
						type: Boolean,
						alias: 'e',
						default: false,
						description: 'Some description',
					},
				},

				commands: [
					command({
						name: 'commandA',

						parameters: [
							'<foo>',
							'<hello world>',
							'[bar...]',
						],

						flags: {
							booleanFlag: Boolean,
							booleanFlagDefault: {
								type: Boolean,
								default: false,
							},
							stringFlag: String,
							stringFlagDefault: {
								type: String,
								default: 'hello',
							},
							numberFlag: Number,
							numberFlagDefault: {
								type: Number,
								default: 1,
							},
							extraOptions: {
								type: Boolean,
								alias: 'e',
								default: false,
								description: 'Some description',
							},
						},
					}),
				],
			}, undefined, ['commandA', 'value1', 'value2']);

			// Type check when commandA is matched
			if (parsed.command === 'commandA') {
				// Check parameters
				expectTypeOf(parsed._.foo).toBeString();
				expectTypeOf(parsed._.helloWorld).toBeString();
				expectTypeOf(parsed._.bar).toEqualTypeOf<string[]>();

				// Check it's also an Arguments type (has '--')
				expectTypeOf(parsed._['--']).toEqualTypeOf<string[]>();

				expectTypeOf(parsed.flags).toEqualTypeOf<{
					booleanFlag: boolean | undefined;
					booleanFlagDefault: boolean;
					stringFlag: string | undefined;
					stringFlagDefault: string;
					numberFlag: number | undefined;
					numberFlagDefault: number;
					extraOptions: boolean;
					help: boolean | undefined;
				}>();
			}
		});

		test('parameter name normalization', () => {
			const parsed = cli({
				parameters: [
					'<hello world>',
				],
			}, undefined, ['a']);

			if (parsed.command === undefined) {
				// Parameter with spaces should normalize to camelCase
				expectTypeOf(parsed._).toHaveProperty('helloWorld');
				expectTypeOf(parsed._.helloWorld).toBeString();
			}
		});

		test('flag types without defaults', () => {
			const parsed = cli({
				flags: {
					stringFlag: String,
					numberFlag: Number,
					booleanFlag: Boolean,
				},
			}, undefined, []);

			if (parsed.command === undefined) {
				expectTypeOf(parsed.flags.stringFlag).toEqualTypeOf<string | undefined>();
				expectTypeOf(parsed.flags.numberFlag).toEqualTypeOf<number | undefined>();
				expectTypeOf(parsed.flags.booleanFlag).toEqualTypeOf<boolean | undefined>();
				expectTypeOf(parsed.flags.help).toEqualTypeOf<boolean | undefined>();
			}
		});

		test('flag types with defaults', () => {
			const parsed = cli({
				flags: {
					stringFlag: {
						type: String,
						default: 'default',
					},
					numberFlag: {
						type: Number,
						default: 42,
					},
					booleanFlag: {
						type: Boolean,
						default: true,
					},
				},
			}, undefined, []);

			if (parsed.command === undefined) {
				expectTypeOf(parsed.flags.stringFlag).toBeString();
				expectTypeOf(parsed.flags.numberFlag).toBeNumber();
				expectTypeOf(parsed.flags.booleanFlag).toBeBoolean();
			}
		});

		test('optional and required parameters', () => {
			const parsed = cli({
				parameters: ['<required>', '[variadic...]'],
			}, undefined, ['req', 'var1', 'var2']);

			if (parsed.command === undefined) {
				expectTypeOf(parsed._.required).toBeString();
				expectTypeOf(parsed._.variadic).toEqualTypeOf<string[]>();
			}
		});

		test('command discriminated union', () => {
			const parsed = cli({
				commands: [
					command({
						name: 'cmd1',
						parameters: ['<param1>'],
					}),
					command({
						name: 'cmd2',
						parameters: ['<param2>'],
					}),
				],
			}, undefined, ['cmd1', 'value']);

			// Type narrows correctly based on command name
			if (parsed.command === 'cmd1') {
				expectTypeOf(parsed._).toHaveProperty('param1');
				expectTypeOf(parsed._).not.toHaveProperty('param2');
			}

			if (parsed.command === 'cmd2') {
				expectTypeOf(parsed._).toHaveProperty('param2');
				expectTypeOf(parsed._).not.toHaveProperty('param1');
			}
		});

		test('no parameters', () => {
			const parsed = cli({
				flags: {
					flag: String,
				},
			}, undefined, []);

			if (parsed.command === undefined) {
				// Check it's an Arguments type (has '--' property)
				expectTypeOf(parsed._['--']).toEqualTypeOf<string[]>();
				// And extends string[]
				expectTypeOf(parsed._).toMatchTypeOf<string[]>();
			}
		});

		test('double dash arguments', () => {
			const parsed = cli({}, undefined, ['--', 'arg1', 'arg2']);

			if (parsed.command === undefined) {
				expectTypeOf(parsed._['--']).toEqualTypeOf<string[]>();
			}
		});
	});
});
