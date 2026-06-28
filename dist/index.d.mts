import { a as CliOptions, S as StrictOptions, C as CallbackFunction, P as ParsedArgv, d as Flags, E as ExitReason } from './types-YWD2qWLI.mjs';
export { b as CommandEntry, c as Commands, D as DescribedDefault, H as HelpContext, f as HelpOptions, g as HelpRenderer } from './types-YWD2qWLI.mjs';
import 'type-flag';

declare function cli<Options extends CliOptions<[...Parameters]>, Parameters extends string[], CallbackReturn>(options: StrictOptions<Options> & CliOptions<[...Parameters]>, callback: CallbackFunction<ParsedArgv<Options, Parameters>, CallbackReturn>, argv?: string[]): Promise<CallbackReturn>;
declare function cli<Options extends CliOptions<[...Parameters]>, Parameters extends string[]>(options: StrictOptions<Options> & CliOptions<[...Parameters]>, callback?: undefined, argv?: string[]): ParsedArgv<Options, Parameters>;
declare function cli(options: CliOptions, callback?: CallbackFunction<any, any>, argv?: string[]): any;

/**
 * Group a set of flags under a named section in `--help` output. Spread the
 * result into the `flags` map; each flag is tagged with the group name so the
 * default help renderer lists it under a `<name>:` heading.
 *
 * @example
 * ```
 * cli({
 *     flags: {
 *         ...group('Output', { json: Boolean, color: Boolean }),
 *         verbose: Boolean
 *     }
 * })
 * ```
 *
 * The generic return type preserves each flag's type, so `argv.flags` stays
 * fully inferred after the spread.
 */
declare const group: <F extends Flags>(name: string, flags: F) => F;

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

export { CleyeExit, CliOptions, ExitReason, Flags, ParsedArgv, cli, group };
