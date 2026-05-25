import { describe, test, expect } from 'manten';
import { cli } from '#cleye';

describe('parameters and commands coexistence', () => {
	test('optional parameter with commands works', () => {
		expect(() => cli({
			parameters: ['[file]'],
			commands: { build: () => {} },
		}, undefined, ['x'])).not.toThrow();
	});

	test('optional spread parameter with commands works', () => {
		expect(() => cli({
			parameters: ['[files...]'],
			commands: { build: () => {} },
		}, undefined, ['x', 'y'])).not.toThrow();
	});

	test('required parameter with commands throws at config time', () => {
		expect(() => cli({
			parameters: ['<file>'],
			commands: { build: () => {} },
		}, undefined, ['x'])).toThrow('Required parameters cannot be used with commands');
	});

	test('required spread parameter with commands throws at config time', () => {
		expect(() => cli({
			parameters: ['<files...>'],
			commands: { build: () => {} },
		}, undefined, ['x'])).toThrow('Required parameters cannot be used with commands');
	});

	test('strictCommands with parameters throws at config time', () => {
		expect(() => cli({
			parameters: ['[file]'],
			commands: { build: () => {} },
			strictCommands: true,
		}, undefined, ['x'])).toThrow('strictCommands cannot be used with parameters');
	});

	test('strictCommands without parameters is unaffected', () => {
		expect(() => cli({
			commands: { build: () => {} },
			strictCommands: true,
		}, undefined, ['build'])).not.toThrow();
	});

	test('strictCommands: false explicitly with parameters does not throw', () => {
		expect(() => cli({
			parameters: ['[file]'],
			commands: { build: () => {} },
			strictCommands: false,
		}, undefined, ['x'])).not.toThrow();
	});

	test('required parameter alone (no commands) does not throw', () => {
		expect(() => cli({
			parameters: ['<file>'],
		}, undefined, ['x'])).not.toThrow();
	});

	test('only commands provided does not throw', () => {
		expect(() => cli({
			commands: { build: () => {} },
		}, undefined, ['build'])).not.toThrow();
	});

	test('empty parameters or empty commands does not trigger the guard', () => {
		expect(() => cli({
			parameters: [],
			commands: { build: () => {} },
		}, undefined, ['build'])).not.toThrow();
		expect(() => cli({
			parameters: ['<file>'],
			commands: {},
		}, undefined, ['x'])).not.toThrow();
	});
}, { parallel: false });
