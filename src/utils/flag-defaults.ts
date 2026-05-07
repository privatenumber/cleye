import type { Flags } from '../types.ts';
import type { DescribedDefault } from '../types-internal.ts';

const getDescribedDefault = (value: unknown): DescribedDefault | undefined => {
	if (
		value === null
		|| typeof value !== 'object'
		|| Array.isArray(value)
	) {
		return;
	}

	const hasValue = 'value' in value;
	const hasDescription = 'description' in value;
	if (!hasValue || !hasDescription) {
		return;
	}
	if (typeof value.description !== 'string') {
		throw new TypeError('Invalid described default. Use default: { value, description: string }.');
	}
	return value as DescribedDefault;
};

export const getDefaultDescription = (value: unknown): string | undefined => {
	const describedDefault = getDescribedDefault(value);
	if (describedDefault) {
		return describedDefault.description;
	}
	if (typeof value === 'function') {
		return 'computed';
	}
	if (value !== undefined) {
		return JSON.stringify(value);
	}
	return undefined;
};

export const unwrapDescribedDefaults = (flags: Record<string, unknown>): Flags => {
	const normalizedFlags: Record<string, unknown> = {};
	for (const [name, config] of Object.entries(flags)) {
		if (
			config === null
			|| typeof config !== 'object'
			|| Array.isArray(config)
			|| !('default' in config)
		) {
			normalizedFlags[name] = config;
			continue;
		}

		const describedDefault = getDescribedDefault(config.default);
		if (describedDefault) {
			normalizedFlags[name] = {
				...config,
				default: describedDefault.value,
			};
		} else {
			normalizedFlags[name] = config;
		}
	}
	return normalizedFlags as Flags;
};
