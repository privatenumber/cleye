import { cli } from '#cleye';

// Type the data the parent passes via `runCommand({ cwd, pager })`. cleye
// reads this signature off the default export — the parent gets type-checked
// when calling `runCommand(...)`.
type Context = { cwd: string;
	pager: boolean; };

// Default-export style with a parameter is required when the parent passes
// data via runCommand. Side-effect style (`await cli(...)` at top level)
// doesn't have a way to receive arguments.
export default ({ cwd, pager }: Context) => cli({
	flags: {
		short: {
			type: Boolean,
			alias: 's',
			description: 'Give the output in the short-format',
		},
	},
	help: {
		description: 'Show the working tree status',
	},
}, (parsed) => {
	const pagerNote = pager ? '' : ' (no pager)';
	console.log(`status in ${cwd}${pagerNote}, short=${Boolean(parsed.flags.short)}`);
});
