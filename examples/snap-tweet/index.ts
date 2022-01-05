/**
 * Usage:
 *  npx esno examples/snap-tweet --help
 */

import { cli } from '../../src';

const argv = cli({
	name: 'snap-tweet',

	version: '1.0.0',

	parameters: ['<tweet urls...>'],

	flags: {
		outputDir: {
			type: String,
			alias: 'o',
			description: 'Tweet screenshot output directory',
			placeholder: '<path>',
		},
		width: {
			type: Number,
			alias: 'w',
			description: 'Width of tweet',
			default: 550,
			placeholder: '<width>',
		},
		showTweet: {
			type: Boolean,
			alias: 't',
			description: 'Show tweet thread',
		},
		darkMode: {
			type: Boolean,
			alias: 'd',
			description: 'Show tweet in dark mode',
		},
		locale: {
			type: String,
			description: 'Locale',
			default: 'en',
			placeholder: '<locale>',
		},
	},

	help: {
		examples: [
			'# Snapshot a tweet',
			'snap-tweet https://twitter.com/jack/status/20',
			'',
			'# Snapshot a tweet with Japanese locale',
			'snap-tweet https://twitter.com/TwitterJP/status/578707432 --locale ja',
			'',
			'# Snapshot a tweet with dark mode and 900px width',
			'snap-tweet https://twitter.com/Interior/status/463440424141459456 --width 900 --dark-mode',
		],
	},
});

console.log(argv);
