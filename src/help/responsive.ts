import stringWidth from 'string-width';
import { createAtoms } from '../render/atoms.ts';
import { createDefaultHelp } from '../render/default-help.ts';

const atoms = createAtoms({ measureString: stringWidth });

export const {
	p, usage, footer, section, cmds, flagsInline, flagsHanging, flags,
} = atoms;

export const defaultHelp = createDefaultHelp(atoms);

export { render } from '../render/render.ts';
export type { Flag, Node } from '../render/atoms.ts';
