import { describe, test, expect } from 'manten';
import {
	parseParameters,
	checkDuplicateParameters,
} from '../../src/utils/parse-parameters.ts';

describe('parseParameters', () => {
	test('required parameters', () => {
		expect(parseParameters(['<file>'])).toStrictEqual([
			{
				name: 'file',
				camelCaseName: 'file',
				required: true,
				spread: false,
			},
		]);
	});

	test('optional parameters', () => {
		expect(parseParameters(['[file]'])).toStrictEqual([
			{
				name: 'file',
				camelCaseName: 'file',
				required: false,
				spread: false,
			},
		]);
	});

	test('spread parameters', () => {
		expect(parseParameters(['[items...]'])).toStrictEqual([
			{
				name: 'items',
				camelCaseName: 'items',
				required: false,
				spread: true,
			},
		]);
	});

	test('caches camelCaseName once at parse time', () => {
		// Cached to avoid recomputing in checkDuplicateParameters and
		// mapParametersToArguments. Verifies kebab-case → camelCase precompute.
		expect(parseParameters(['<file-name>'])).toStrictEqual([
			{
				name: 'file-name',
				camelCaseName: 'fileName',
				required: true,
				spread: false,
			},
		]);
	});

	test('rejects required after optional', () => {
		expect(() => parseParameters(['[a]', '<b>'])).toThrow(
			'Required parameter "<b>" cannot come after optional parameter "[a]"',
		);
	});

	test('rejects parameter after spread', () => {
		expect(() => parseParameters(['[a...]', '<b>'])).toThrow(
			'Spread parameter "[a...]" must be last',
		);
	});

	test('rejects unwrapped parameter', () => {
		expect(() => parseParameters(['unwrapped'])).toThrow(
			'Must be wrapped in <> (required parameter) or [] (optional parameter)',
		);
	});

	test('rejects invalid characters', () => {
		expect(() => parseParameters(['<a.b>'])).toThrow('Invalid character found "."');
	});
});

describe('checkDuplicateParameters', () => {
	test('passes when no duplicates exist', () => {
		const parameters = parseParameters(['<a>', '<b>']);
		expect(() => checkDuplicateParameters(parameters)).not.toThrow();
	});

	test('catches identical-name duplicates', () => {
		const parameters = parseParameters(['<a>', '<a>']);
		expect(() => checkDuplicateParameters(parameters)).toThrow(
			'Invalid parameter: "a" is used more than once',
		);
	});

	test('catches camelCase collisions and names both source parameters', () => {
		const parameters = parseParameters(['<file-name>', '<fileName>']);
		expect(() => checkDuplicateParameters(parameters)).toThrow(
			'Invalid parameter: "fileName" collides with "file-name" (both map to "fileName")',
		);
	});

	test('catches duplicates spanning segments (e.g. across `--`)', () => {
		const pre = parseParameters(['<a>']);
		const post = parseParameters(['<a>']);
		expect(() => checkDuplicateParameters([...pre, ...post])).toThrow(
			'Invalid parameter: "a" is used more than once',
		);
	});
});
