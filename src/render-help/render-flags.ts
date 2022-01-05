import type { Flags } from '../types';
import { kebabCase } from '../utils/convert-case';

const tableBreakpoints = {
	'> 80': [
		{
			width: 'content-width',
			paddingLeft: 2,
			paddingRight: 8,
		},

		// Flag alias to fill remaining line
		{
			width: 'auto',
		},
	],

	'> 40': [
		{
			width: 'auto',
			paddingLeft: 2,
			paddingRight: 8,

			// Remove alias padding on smaller screens
			preprocess: (text: string) => text.trim(),
		},

		// Flag description to be on own line
		{
			width: '100%',
			paddingLeft: 2,
			paddingBottom: 1,
		},
	],

	'> 0': {
		// Remove responsiveness
		stdoutColumns: 1000,

		columns: [
			{
				width: 'content-width',
				paddingLeft: 2,
				paddingRight: 8,
			},
			{
				width: 'content-width',
			},
		],
	},
};

export type FlagData = {
	name: string;
	flag: Flags[string];
	flagFormatted: string;
	aliasesEnabled: boolean;
	aliasFormatted: string | undefined;
};

export function renderFlags(flags: Flags) {
	let aliasesEnabled = false;
	const flagsData = Object.keys(flags)
		.sort((a, b) => a.localeCompare(b))
		.map((name): FlagData => {
			const flag = flags[name];
			const hasAlias = ('alias' in flag);

			if (hasAlias) {
				aliasesEnabled = true;
			}

			return {
				name,
				flag,
				flagFormatted: `--${kebabCase(name)}`,
				aliasesEnabled,
				aliasFormatted: hasAlias ? `-${flag.alias}` : undefined,
			};
		});

	const tableData = flagsData.map((flagData) => {
		flagData.aliasesEnabled = aliasesEnabled;

		return [
			{
				type: 'flagName',
				data: flagData,
			},
			{
				type: 'flagDescription',
				data: flagData,
			},
		];
	});

	return {
		type: 'table',
		data: {
			tableData,
			tableBreakpoints,
		},
	};
}
