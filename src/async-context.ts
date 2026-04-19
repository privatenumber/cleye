import { AsyncLocalStorage } from 'node:async_hooks';
import type { CliOptions } from './types.ts';

export type CliContext = {

	/** Command name assigned by the parent */
	name: string;

	/** Remaining argv for the child command to parse */
	argv: string[];

	/** Parent CLI options for inheriting strictFlags, booleanFlagNegation, etc. */
	parentOptions: CliOptions;
};

const cliAsyncStorage = new AsyncLocalStorage<CliContext>();

export const getCliContext = () => cliAsyncStorage.getStore();

export const runWithCliContext = <T>(
	context: CliContext,
	function_: () => T,
): T => cliAsyncStorage.run(context, function_);
