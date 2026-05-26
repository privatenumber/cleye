import { N as Node, f as HelpRenderer } from './types-BgE9RpFj.mjs';

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
declare const render: (...nodes: Node[]) => string;
declare const renderToString: (result: ReturnType<HelpRenderer>) => string;

export { renderToString as a, render as r };
