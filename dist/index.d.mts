import { a as CliOptions, S as StrictOptions, C as CallbackFunction, P as ParsedArgv, E as ExitReason } from './types-cABISNDQ.mjs';
export { b as CommandEntry, c as Commands, D as DescribedDefault, d as Flags, H as HelpContext, f as HelpOptions, g as HelpRenderer } from './types-cABISNDQ.mjs';
import 'type-flag';

declare function cli<Options extends CliOptions<[...Parameters]>, Parameters extends string[], CallbackReturn>(options: StrictOptions<Options> & CliOptions<[...Parameters]>, callback: CallbackFunction<ParsedArgv<Options, Parameters>, CallbackReturn>, argv?: string[]): Promise<CallbackReturn>;
declare function cli<Options extends CliOptions<[...Parameters]>, Parameters extends string[]>(options: StrictOptions<Options> & CliOptions<[...Parameters]>, callback?: undefined, argv?: string[]): ParsedArgv<Options, Parameters>;
declare function cli(options: CliOptions, callback?: CallbackFunction<any, any>, argv?: string[]): any;

/**
 * Thrown by `cli()` at every internal exit point — `--help`, `--version`,
 * missing required parameters, `strictFlags`, `strictCommands`, and the sync
 * no-command-match path. By default cli() catches this and calls
 * `process.exit(code)`; setting `throwOnExit: true` lets it propagate so
 * library users can catch and decide how the host process responds.
 */
declare class CleyeExit extends Error {
    name: "CleyeExit";
    code: number;
    reason: ExitReason;
    constructor(code: number, reason: ExitReason);
}

export { CleyeExit, CliOptions, ExitReason, ParsedArgv, cli };
