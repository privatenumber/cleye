import { cli } from '#cleye';

// Side-effect style: dynamic import evaluates the module, which invokes
// `cli()` at top level. No function wrapper needed when nothing is passed
// down from the parent.
//
// Bonus: this file can also be invoked directly during development:
//   node examples/06-strict-mode/commands/build.ts --watch
//
// Child cli inherits `strictFlags` from the parent via context, so
// `--wathc` (typo of `--watch`) is rejected here.
await cli({
	flags: { watch: Boolean },
}, (parsed) => {
	console.log('build:', { watch: parsed.flags.watch });
});
