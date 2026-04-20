import { describe, test, expect } from 'manten';
import { render } from '../../src/render/render.ts';
import type { Node } from '../../src/render/types.ts';

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
});
