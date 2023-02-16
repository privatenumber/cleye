import { expectType } from 'tsd';
import { cli, command } from '#cleye';

type Arguments = string[] & { '--': string[] };

const parsed = cli({
	parameters: ['[foo]', '<bar...>'],

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

			parameters: ['[bar]', '<foo...>', '<hello world>', '<hello-world>', '<hello_world>', '<hello.world>', '<hello =world>', '<hello / world>'],

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
		}, ({ flags }) => {
			expectType<{
				booleanFlag: boolean | undefined;
				booleanFlagDefault: boolean;
				stringFlag: string | undefined;
				stringFlagDefault: string;
				numberFlag: number | undefined;
				numberFlagDefault: number;
				extraOptions: boolean;
				help: boolean | undefined;
			}>(flags);
		}),
	],
}, ({ flags }) => {
	expectType<{
		booleanFlag: boolean | undefined;
		booleanFlagDefault: boolean;
		stringFlag: string | undefined;
		stringFlagDefault: string;
		numberFlag: number | undefined;
		numberFlagDefault: number;
		extraOptions: boolean;
		help: boolean | undefined;
	}>(flags);
});

if (parsed.command === undefined) {
	expectType<
		Arguments & {
			foo: string | undefined;
			bar: string[];
		}
	>(parsed._);

	expectType<{
		booleanFlag: boolean | undefined;
		booleanFlagDefault: boolean;
		stringFlag: string | undefined;
		stringFlagDefault: string;
		numberFlag: number | undefined;
		numberFlagDefault: number;
		extraOptions: boolean;
		help: boolean | undefined;
	}>(parsed.flags);
}

if (parsed.command === 'commandA') {
	expectType<
		Arguments & {
			bar: string | undefined;
			foo: string[];
			helloWorld: string;
		}
	>(parsed._);

	expectType<{
		booleanFlag: boolean | undefined;
		booleanFlagDefault: boolean;
		stringFlag: string | undefined;
		stringFlagDefault: string;
		numberFlag: number | undefined;
		numberFlagDefault: number;
		extraOptions: boolean;
		help: boolean | undefined;
	}>(parsed.flags);
}
