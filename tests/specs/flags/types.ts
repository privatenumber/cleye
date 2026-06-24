import { describe, test } from 'manten';
import { expectTypeOf } from 'expect-type';
import { cli, type Flags } from '#cleye';

describe('flags types', () => {
	test('flag types without defaults', async () => {
		const parsed = cli({
			flags: {
				stringFlag: String,
				numberFlag: Number,
				booleanFlag: Boolean,
			},
		}, undefined, []);

		expectTypeOf(parsed.flags.stringFlag).toEqualTypeOf<string | undefined>();
		expectTypeOf(parsed.flags.numberFlag).toEqualTypeOf<number | undefined>();
		expectTypeOf(parsed.flags.booleanFlag).toEqualTypeOf<boolean | undefined>();
		expectTypeOf(parsed.flags.help).toEqualTypeOf<boolean | undefined>();
	});

	test('flag types with defaults', async () => {
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

		expectTypeOf(parsed.flags.stringFlag).toBeString();
		expectTypeOf(parsed.flags.numberFlag).toBeNumber();
		expectTypeOf(parsed.flags.booleanFlag).toBeBoolean();
	});

	test('flag types with described defaults', async () => {
		const parsed = cli({
			flags: {
				stringFlag: {
					type: String,
					default: {
						value: 'default',
						description: 'from config',
					},
				},
				numberFlag: {
					type: Number,
					default: {
						value: () => 42,
						description: 'computed',
					},
				},
			},
		}, undefined, []);

		expectTypeOf(parsed.flags.stringFlag).toBeString();
		expectTypeOf(parsed.flags.numberFlag).toBeNumber();
	});

	test('array flag types', async () => {
		const parsed = cli({
			flags: {
				stringArray: [String],
				numberArray: {
					type: [Number],
				},
			},
		}, undefined, []);

		expectTypeOf(parsed.flags.stringArray).toEqualTypeOf<string[]>();
		expectTypeOf(parsed.flags.numberArray).toEqualTypeOf<number[]>();
	});

	test('custom type function', async () => {
		const parsed = cli({
			flags: {
				date: (value: string) => new Date(value),
			},
		}, undefined, []);

		expectTypeOf(parsed.flags.date).toEqualTypeOf<Date | undefined>();
	});

	test('flag with alias and description', async () => {
		const parsed = cli({
			flags: {
				extraOptions: {
					type: Boolean,
					alias: 'e',
					default: false,
					description: 'Some description',
				},
			},
		}, undefined, []);

		expectTypeOf(parsed.flags.extraOptions).toBeBoolean();
	});

	test('version flag is added when version is set', async () => {
		const parsed = cli({
			version: '1.0.0',
			flags: {
				foo: String,
			},
		}, undefined, []);

		expectTypeOf(parsed.flags).toEqualTypeOf<{
			foo: string | undefined;
			version: boolean | undefined;
			help: boolean | undefined;
		}>();
	});

	test('user-defined help flag keeps its parser type', async () => {
		const parsed = cli({
			flags: {
				help: String,
			},
		}, undefined, []);

		expectTypeOf(parsed.flags.help).toEqualTypeOf<string | undefined>();
	});

	test('user-defined version flag keeps its parser type when version option is set', async () => {
		const parsed = cli({
			version: '1.0.0',
			flags: {
				version: {
					type: Number,
				},
			},
		}, undefined, []);

		expectTypeOf(parsed.flags.version).toEqualTypeOf<number | undefined>();
	});

	test('help flag is not added when help is false', async () => {
		const parsed = cli({
			help: false,
			flags: {
				foo: String,
			},
		}, undefined, []);

		expectTypeOf(parsed.flags).toEqualTypeOf<{
			foo: string | undefined;
		}>();
	});

	test('parsed.flags is usable when no flags option is provided', async () => {
		// Defensive: `not.toBeNever()` guards against a future refactor that
		// could collapse the resolved flags type to `never` (e.g. via an
		// `undefined & { help: BooleanConstructor }` intersection).
		await cli({}, (parsed) => {
			expectTypeOf(parsed.flags).not.toBeNever();
			expectTypeOf(parsed.flags).toEqualTypeOf<{
				help: boolean | undefined;
			}>();
			expectTypeOf(parsed.flags.help).toEqualTypeOf<boolean | undefined>();
		}, []);
	});

	test('parsed.flags survives explicit `flags?: Flags | undefined` typing', async () => {
		// Defensive: covers the wrapper-pattern shape where Options['flags']
		// resolves to `Flags | undefined` rather than being absent. The
		// intersection should distribute over the union without collapsing.
		const options: { flags?: Flags } = {};
		const parsed = cli(options, undefined, []);
		expectTypeOf(parsed.flags).not.toBeNever();
		expectTypeOf(parsed.flags).toMatchTypeOf<{ help: boolean | undefined }>();
	});

	test('Flags type is exported and usable', async () => {
		const sharedFlags = {
			verbose: {
				type: Boolean,
				alias: 'v',
				description: 'Enable verbose output',
			},
			config: {
				type: String,
				description: 'Config file path',
				placeholder: '<path>',
			},
		} satisfies Flags;

		const flags: Flags = sharedFlags;
		expectTypeOf(flags).toMatchTypeOf<Flags>();

		const parsed = cli({
			flags: sharedFlags,
		}, undefined, []);

		expectTypeOf(parsed.flags.verbose).toEqualTypeOf<boolean | undefined>();
		expectTypeOf(parsed.flags.config).toEqualTypeOf<string | undefined>();
	});

	test('shared flags spread into a command preserve inference', async () => {
		// Define flags once in a shared module and spread them into each
		// command. `satisfies Flags` keeps the literal member types so cleye
		// can still infer each flag (a `: Flags` annotation would widen them
		// and collapse `parsed.flags` to the loose index type).
		const sharedFlags = {
			verbose: Boolean,
			config: {
				type: String,
				default: 'config.json',
			},
		} satisfies Flags;

		const parsed = cli({
			flags: {
				...sharedFlags,
				port: Number,
			},
		}, undefined, []);

		expectTypeOf(parsed.flags.verbose).toEqualTypeOf<boolean | undefined>();
		expectTypeOf(parsed.flags.config).toBeString(); // default → non-undefined survives the spread
		expectTypeOf(parsed.flags.port).toEqualTypeOf<number | undefined>();
	});

	test('ignoreArgv callback with 3 parameters', () => {
		cli({
			name: 'test',
			ignoreArgv(type, flagOrArgv, value) {
				expectTypeOf(type).toEqualTypeOf<'argument' | 'flag' | 'unknown-flag'>();
				expectTypeOf(flagOrArgv).toBeString();
				expectTypeOf(value).toEqualTypeOf<string | undefined>();
				return false;
			},
		});

		cli({
			name: 'test',
			ignoreArgv(_type, _flagOrArgv, _value) {
				return false;
			},
		});
	});
}, { parallel: false });
