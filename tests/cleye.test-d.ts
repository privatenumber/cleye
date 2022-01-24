import { expectType } from 'tsd';
import { cli, command } from '..';

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
	]
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
