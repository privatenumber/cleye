/**
 * Non-intrusive embedding — `throwOnExit` + `CleyeExit`.
 *
 * By default, cleye calls process.exit on --help, --version, and validation
 * failures. When you embed cleye in a host process (a wrapper script, a
 * long-running service, a test harness) and want to recover control, set
 * `throwOnExit: true` and catch `CleyeExit`.
 *
 * Usage:
 *  node examples/08-embedded/index.ts deploy             # runs deploy
 *  node examples/08-embedded/index.ts --help             # caught, host continues
 *  node examples/08-embedded/index.ts unknown            # caught, host continues
 *  node examples/08-embedded/index.ts deploy --bogus     # caught, host continues
 */

import { cli, CleyeExit } from '#cleye';

await cli({
	name: 'embedded',

	// The whole point of this example: instead of cleye calling
	// process.exit on --help / --version / validation failures, it
	// throws `CleyeExit` for us to catch. The host process stays alive.
	throwOnExit: true,

	strictFlags: true,
	strictCommands: true,
	commands: {
		deploy: () => import('./commands/deploy.ts'),
	},
}, () => {
	// Callback runs first; matched command auto-invokes after.
}).catch((error) => {
	// `CleyeExit` carries `code` (0 for --help/--version, 1 for failures)
	// and `reason` (one of the six exit reasons). Unrelated errors keep
	// propagating — only handle what we recognize.
	if (!(error instanceof CleyeExit)) {
		throw error;
	}
	console.log(`[host] cleye exited (code=${error.code}, reason=${error.reason}); host continues`);
});

// Reachable in every case above — proving the host kept control.
console.log('[host] doing more work after cleye returned…');
