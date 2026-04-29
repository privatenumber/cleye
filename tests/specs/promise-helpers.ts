import { describe, test, expect } from 'manten';
import { isThenable, isModuleWithDefault } from '../../src/utils/promise-helpers.ts';

describe('isThenable', () => {
	test('true for native Promise', () => {
		expect(isThenable(Promise.resolve(1))).toBe(true);
	});

	test('true for thenable objects', () => {
		// eslint-disable-next-line unicorn/no-thenable -- testing thenable detection
		expect(isThenable({ then: () => {} })).toBe(true);
	});

	test('true for functions with a `then` property', () => {
		// eslint-disable-next-line unicorn/no-thenable -- testing thenable detection
		const function_ = Object.assign(() => {}, { then: () => {} });
		expect(isThenable(function_)).toBe(true);
	});

	test('false for plain objects', () => {
		expect(isThenable({})).toBe(false);
	});

	test('false for null and undefined', () => {
		expect(isThenable(null)).toBe(false);
		expect(isThenable(undefined)).toBe(false);
	});

	test('false for primitives', () => {
		expect(isThenable(42)).toBe(false);
		expect(isThenable('then')).toBe(false);
	});
});

describe('isModuleWithDefault', () => {
	test('true for { default: function }', () => {
		expect(isModuleWithDefault({ default: () => {} })).toBe(true);
	});

	test('false for { default: non-function }', () => {
		expect(isModuleWithDefault({ default: 'string' })).toBe(false);
		expect(isModuleWithDefault({ default: 42 })).toBe(false);
	});

	test('false for objects without a `default` key', () => {
		expect(isModuleWithDefault({ other: () => {} })).toBe(false);
	});

	test('false for null and undefined', () => {
		expect(isModuleWithDefault(null)).toBe(false);
		expect(isModuleWithDefault(undefined)).toBe(false);
	});

	test('false for primitives', () => {
		expect(isModuleWithDefault('default')).toBe(false);
	});
});
