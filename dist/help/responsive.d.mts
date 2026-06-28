import { N as Node, F as Flag, a as CliOptions, e as HelpForm } from '../types-YWD2qWLI.mjs';
export { l as footer, s as section, u as usage } from '../types-YWD2qWLI.mjs';
export { r as render } from '../render-kq-8HzNf.mjs';
import 'type-flag';

declare const p: (text: string) => Node;
declare const cmds: (commands: {
    name: string;
    description?: string;
}[]) => Node;
declare const flagsColumns: (flagList: Flag[]) => Node;
declare const flagsStacked: (flagList: Flag[]) => Node;
declare const flags: (flagList: Flag[]) => Node;

declare const defaultHelp: (options: CliOptions, options_?: {
    form?: HelpForm;
}) => Node[];

export { Flag, Node, cmds, defaultHelp, flags, flagsColumns, flagsStacked, p };
