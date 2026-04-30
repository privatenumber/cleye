import stringWidth from 'string-width';
import { createComponents } from '../render/components.ts';
import { createDefaultHelp } from '../render/default-help.ts';

const components = createComponents({ measureString: stringWidth });

export const {
	p, usage, footer, section, cmds, flagsInline, flagsHanging, flags,
} = components;

export const defaultHelp = createDefaultHelp(components);

export { render } from '../render/render.ts';
export type { Flag, Node } from '../render/components.ts';
