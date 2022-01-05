/**
 * Demo from README.md
 *
 * Usage:
 *  npx esno examples/greet --help
 */

import { cli } from '../../src';

// Parse argv
const argv = cli({
	name: 'greet.js',

	// Define parameters
	// Becomes available in ._.filePath
	parameters: [
		'<first name>', // First name is required
		'[last name]', // Last name is optional
	],

	// Define flags/options
	// Becomes available in .flags
	flags: {
		// Parses `--time` as a string
		time: {
			type: String,
			description: 'Time of day to greet (morning or evening)',
			default: 'morning',
		},
	},
});

const name = [argv._.firstName, argv._.lastName].filter(Boolean).join(' ');

if (argv.flags.time === 'morning') {
	console.log(`Good morning ${name}!`);
} else {
	console.log(`Good evening ${name}!`);
}
