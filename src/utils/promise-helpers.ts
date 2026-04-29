export const isThenable = (value: unknown): value is PromiseLike<unknown> => (
	!!value
	&& (typeof value === 'object' || typeof value === 'function')
	&& typeof (value as { then?: unknown }).then === 'function'
);

export const isModuleWithDefault = (
	value: unknown,
): value is { default: (...arguments_: unknown[]) => unknown } => (
	!!value
	&& typeof value === 'object'
	&& 'default' in value
	&& typeof (value as { default: unknown }).default === 'function'
);
