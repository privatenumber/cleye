import { stripVTControlCharacters } from 'node:util';
import { describe, test, expect } from 'manten';
import { cli, group, type CliOptions } from '#cleye';
import { mockEnvFunctions } from '../../utils/mock-env-functions.ts';

const renderHelp = (options: CliOptions, argv: string[]) => {
	const mocked = mockEnvFunctions();
	cli(options, undefined, argv);
	mocked.restore();
	return stripVTControlCharacters(mocked.consoleLog.calls[0][0] as string);
};

describe('flag grouping', () => {
	test('long help renders groups as sections in declaration order', () => {
		const output = renderHelp({
			name: 'x',
			flags: {
				verbose: Boolean,
				...group('Filters', {
					region: String,
					lang: String,
				}),
				...group('Output', { json: Boolean }),
			},
		}, ['--help']);

		const flagsAt = output.indexOf('Flags:');
		const filtersAt = output.indexOf('Filters:');
		const outputAt = output.indexOf('Output:');

		// Sections appear in first-appearance order: default, then Filters, then Output.
		expect(flagsAt).toBeGreaterThan(-1);
		expect(filtersAt).toBeGreaterThan(flagsAt);
		expect(outputAt).toBeGreaterThan(filtersAt);

		// Ungrouped flag + the auto help flag sit under the default Flags section.
		expect(output.indexOf('--verbose')).toBeLessThan(filtersAt);
		expect(output.indexOf('--help')).toBeLessThan(filtersAt);

		// Grouped flags sit under their own headings.
		expect(output.indexOf('--lang')).toBeGreaterThan(filtersAt);
		expect(output.indexOf('--region')).toBeGreaterThan(filtersAt);
		expect(output.indexOf('--region')).toBeLessThan(outputAt);
		expect(output.indexOf('--json')).toBeGreaterThan(outputAt);
	});

	test('short help stays flat and ignores groups', () => {
		const output = renderHelp({
			name: 'x',
			flags: { ...group('Filters', { region: String }) },
		}, ['-h']);

		expect(output).toContain('Flags:');
		expect(output).not.toContain('Filters:');
		expect(output).toContain('--region');
	});

	test('a group named like the default section folds into it', () => {
		const output = renderHelp({
			name: 'x',
			flags: { ...group('Flags', { region: String }) },
		}, ['--help']);

		const headerCount = output.split('Flags:').length - 1;
		expect(headerCount).toBe(1);
		expect(output).toContain('--region');
	});

	test('no group declared renders a single Flags section', () => {
		const output = renderHelp({
			name: 'x',
			flags: {
				alpha: Boolean,
				beta: String,
			},
		}, ['--help']);

		expect(output).toContain('Flags:');
		expect(output.indexOf('Flags:')).toBe(output.lastIndexOf('Flags:'));
	});
}, { parallel: false });
