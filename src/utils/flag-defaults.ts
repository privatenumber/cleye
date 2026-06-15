import { isStandardSchema } from 'type-flag/internal';
import type { Flags } from '../types.ts';
import type { DescribedDefault } from '../types-internal.ts';

/**
 * Whether a flag definition is a config object (`{ type, ... }`) rather than a
 * bare type, array, or Standard Schema — those are opaque flag types whose own
 * members (e.g. a Zod schema's `.default()` method) must not be read as cleye
 * flag options.
 */
export const isFlagConfigObject = (value: unknown): value is Record<string, unknown> => (
	typeof value === 'object'
	&& value !== null
	&& !Array.isArray(value)
	&& !isStandardSchema(value)
);

const getDescribedDefault = (value: unknown): DescribedDefault | undefined => {
	if (!isFlagConfigObject(value)) {
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
		if (!isFlagConfigObject(config) || !('default' in config)) {
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
