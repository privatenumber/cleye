/**
 * A help-document node. Inspectable as data (debuggable via console.log)
 * AND callable for rendering (open-ended dispatch via .render method).
 *
 * `kind` is informational only — used for debugging and optional filtering.
 * Dispatch is via `.render()`, not a switch on `kind`, so users can add
 * their own atoms by returning any object matching this shape.
 */
export type Node = {
	readonly kind: string;
	render: () => string;
	readonly [key: string]: unknown;
};
