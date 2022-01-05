/**
 * Usage:
 *  npx esno examples/pkg-size --help
 */

import { cli } from '../../src';

const argv = cli({
	name: 'pkg-size',

	version: '1.0.0',

	parameters: ['<pkg-path>'],

	flags: {
		sizes: {
			type: [String],
			alias: 'S',
			default: () => ['size', 'gzip', 'brotli'],
			description: 'Comma separated list of sizes to show (size, gzip, brotli)',
			placeholder: '<size>',
		},
		sortBy: {
			type: String,
			alias: 's',
			default: 'brotli',
			description: 'Sort list by (name, size, gzip, brotli)',
			placeholder: '<column>',
		},
		unit: {
			type: String,
			alias: 'u',
			default: 'metric',
			description: 'Display units (metric, iec, metric_octet, iec_octet)',
			placeholder: '<unit>',
		},
		ignoreFiles: {
			type: String,
			alias: 'i',
			description: 'Glob to ignores files from list. Total size will still include them.',
			placeholder: '<glob>',
		},
		json: {
			type: Boolean,
			description: 'JSON output',
		},
	},

	help: {
		examples: [
			'pkg-size',
			'pkg-size ./package/path',

			'',

			'# Display formats',
			'pkg-size --sizes=size,gzip,brotli',
			'pkg-size -S brotli',

			'',

			'# Sorting',
			'pkg-size --sort-by=name',
			'pkg-size -s size',
			'pkg-size --unit=iec',

			'',

			'# Formatting',
			'pkg-size -u metric_octet',
		],
	},
});

console.log(argv);
