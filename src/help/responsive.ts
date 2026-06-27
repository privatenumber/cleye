import { createDefaultHelp } from '../render/default-help.ts';
import {
	p,
	usage,
	footer,
	section,
	cmds,
	flagsColumns,
	flagsStacked,
	flags,
} from '../render/components-responsive.ts';

export {
	p, usage, footer, section, cmds, flagsColumns, flagsStacked, flags,
};

export const defaultHelp = createDefaultHelp({
	p,
	usage,
	section,
	cmds,
	flags,
	footer,
});

export { render } from '../render/render.ts';
export type { Flag, Node } from '../render/components.ts';
