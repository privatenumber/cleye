import type { ExitReason } from '../types.ts';

/**
 * Thrown by `cli()` at every internal exit point — `--help`, `--version`,
 * missing required parameters, invalid flag values, `strictFlags`,
 * `strictCommands`, and the sync no-command-match path. By default cli()
 * catches this and calls
 * `process.exit(code)`; setting `throwOnExit: true` lets it propagate so
 * library users can catch and decide how the host process responds.
 */
export class CleyeExit extends Error {
	name = 'CleyeExit' as const;

	code: number;

	reason: ExitReason;

	constructor(code: number, reason: ExitReason, cause?: unknown) {
		super(`cleye exited with code ${code} (${reason})`, { cause });
		this.code = code;
		this.reason = reason;
	}
}
