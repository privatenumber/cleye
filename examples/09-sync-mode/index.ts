/**
 * Sync mode (advanced) — `cli()` without a callback.
 *
 * Drop the callback and `cli()` returns `ParsedArgv` synchronously. The whole
 * program reads top-to-bottom; no async coloring on the parsing step itself.
 *
 * Trade-off: with commands, sync mode does NOT auto-invoke the matched
 * handler. You're responsible for calling `argv.runCommand()` yourself —
 * which is why this is filed under "advanced": you have to know the API.
 *
 * Usage:
 *  node examples/09-sync-mode/index.ts greet alice
 *  node examples/09-sync-mode/index.ts greet bob --shout
 */

import { cli } from '#cleye';

// No callback passed → sync return. `argv` is `ParsedArgv` directly, not a
// Promise. We can introspect it before deciding to dispatch the command.
const argv = cli({
	name: 'sync-mode',
	commands: {
		greet: () => import('./commands/greet.ts'),
	},
});

// Sync mode does not auto-invoke matched commands — that's the trade-off
// for sync return. We must dispatch manually. (Compare to callback mode in
// 02-strict-mode where the callback's return triggers auto-invoke.)
await argv.runCommand();
