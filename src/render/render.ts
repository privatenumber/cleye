import type { Node } from './types.ts';

/**
 * Compose nodes into a rendered string. Calls each node's render method
 * and joins results with a single blank line.
 *
 * @example
 * ```ts
 * import { render } from 'cleye';
 * // (atom imports come in later phases)
 * render(p('Description'), section('Usage', ...));
 * ```
 */
export const render = (...nodes: Node[]): string => nodes.map(node => node.render()).join('\n\n');
