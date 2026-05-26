import { N as Node, a as CliOptions, H as HelpForm, F as Flag } from '../types-BgE9RpFj.mjs';
export { r as render } from '../render-CQtF5qVz.mjs';
import 'type-flag';

declare const p: (text: string) => Node;
declare const usage: (name: string, pattern: string) => Node;
declare const footer: (text: string) => Node;
declare const section: (title: string, ...body: Node[]) => Node;
declare const cmds: (commands: {
    name: string;
    description?: string;
}[]) => Node;
declare const flagsInline: (flagList: Flag[]) => Node;
declare const flagsHanging: (flagList: Flag[]) => Node;
declare const flags: (flagList: Flag[]) => Node;
declare const defaultHelp: (options: CliOptions, options_?: {
    form?: HelpForm;
}) => Node[];

export { Flag, Node, cmds, defaultHelp, flags, flagsHanging, flagsInline, footer, p, section, usage };
