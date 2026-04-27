import { cli } from '#cleye';

// Even though the parent is in sync mode, this child cli can use
// callback mode independently — there's no "mode" inheritance.
await cli({
	parameters: ['<name>'],
	flags: { shout: Boolean },
}, (parsed) => {
	const message = `hello ${parsed._.name}`;
	console.log(parsed.flags.shout ? message.toUpperCase() : message);
});
