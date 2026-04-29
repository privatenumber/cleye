import { describe, test, expect } from 'manten';
import { camelCase } from '../../src/utils/convert-case.ts';

describe('camelCase', () => {
	test('joins words with separators', () => {
		expect(camelCase('hello world')).toBe('helloWorld');
		expect(camelCase('hello-world')).toBe('helloWorld');
		expect(camelCase('hello_world')).toBe('helloWorld');
	});

	test('collapses consecutive separators', () => {
		expect(camelCase('hello--world')).toBe('helloWorld');
		expect(camelCase('hello__world')).toBe('helloWorld');
	});

	test('mixed separators', () => {
		expect(camelCase('value_name-here')).toBe('valueNameHere');
	});

	test('leading separator capitalizes first letter', () => {
		expect(camelCase('-hello')).toBe('Hello');
	});

	test('trailing separator is dropped', () => {
		expect(camelCase('hello-')).toBe('hello');
	});

	test('already camelCase passes through', () => {
		expect(camelCase('myValue')).toBe('myValue');
	});

	test('digits are preserved', () => {
		expect(camelCase('value1')).toBe('value1');
		expect(camelCase('1value')).toBe('1value');
	});
});
