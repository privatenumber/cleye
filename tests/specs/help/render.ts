import { describe, test, expect } from 'manten';
import { render, renderToString } from '../../../src/render/render.ts';
import type { Node } from '../../../src/render/components.ts';

describe('render()', () => {
	test('empty invocation returns empty string', () => {
		const result = render();
		expect(result).toBe('');
	});

	test('single node returns its rendered output', () => {
		const node: Node = {
			kind: 'text',
			render: () => 'hello',
		};
		const result = render(node);
		expect(result).toBe('hello');
	});

	test('multiple nodes are joined with a blank line', () => {
		const a: Node = {
			kind: 'text',
			render: () => 'a',
		};
		const b: Node = {
			kind: 'text',
			render: () => 'b',
		};
		const result = render(a, b);
		expect(result).toBe('a\n\nb');
	});

	test('user-defined node with arbitrary extra fields works', () => {
		const node: Node = {
			kind: 'custom',
			foo: 42,
			render: () => 'x',
		};
		const result = render(node);
		expect(result).toBe('x');
	});
}, { parallel: false });

describe('renderToString()', () => {
	test('returns pre-rendered strings unchanged', () => {
		expect(renderToString('ready')).toBe('ready');
	});

	test('renders a single node', () => {
		const node: Node = {
			kind: 'text',
			render: () => 'hello',
		};
		expect(renderToString(node)).toBe('hello');
	});

	test('renders node arrays with blank-line separation', () => {
		const a: Node = {
			kind: 'text',
			render: () => 'a',
		};
		const b: Node = {
			kind: 'text',
			render: () => 'b',
		};
		expect(renderToString([a, b])).toBe('a\n\nb');
	});
}, { parallel: false });
