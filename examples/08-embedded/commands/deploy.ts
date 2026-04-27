import { cli } from '#cleye';

// `throwOnExit` and `strictFlags` both inherit from the parent via
// context. Passing `--bogus` here triggers the parent's strict mode,
// which throws CleyeExit (instead of process.exit) — the host catches.
await cli({
	flags: { force: Boolean },
}, (parsed) => {
	console.log(`deploying${parsed.flags.force ? ' (forced)' : ''}…`);
});
