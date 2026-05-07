import type { HelpRenderer } from '../types.ts';
import type { Node } from './components.ts';

/**
 * Compose nodes into a rendered string. Calls each node's render method
 * and joins results with a single blank line.
 *
 * @example
 * ```ts
 * import { render, p, section } from 'cleye/help';
 * render(p('Description'), section('Usage', ...));
 * ```
 */
export const render = (...nodes: Node[]): string => nodes.map(node => node.render()).join('\n\n');

export const renderToString = (result: ReturnType<HelpRenderer>): string => {
	if (typeof result === 'string') {
		return result;
	}
	if (Array.isArray(result)) {
		return render(...result);
	}
	return render(result);
};
