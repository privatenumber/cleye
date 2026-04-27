import { cli } from '#cleye';

// Same Context shape as status.ts — both subs receive the parent's flags.
// In a real CLI you'd extract the type into a shared module.
type Context = { cwd: string;
	pager: boolean; };

export default ({ cwd, pager }: Context) => cli({
	flags: {
		oneline: {
			type: Boolean,
			description: 'Show each commit on a single line',
		},
	},
	help: {
		description: 'Show commit logs',
	},
}, (parsed) => {
	const pagerNote = pager ? ' (paginated)' : '';
	console.log(`log in ${cwd}${pagerNote}, oneline=${Boolean(parsed.flags.oneline)}`);
});
