export const oneOf = <const T extends readonly string[]>(
	values: T,
) => Object.assign(
	(input: string): T[number] => {
		if (!values.includes(input)) {
			throw new Error(`Expected one of: ${values.join(', ')} (got: "${input}")`);
		}
		return input as T[number];
	},
	// Advertise the accepted values as the help placeholder so the flag
	// renders `<a|b|c>` instead of a generic `<value>`.
	{ placeholder: values.join('|') },
);

export const commaList = <T>(itemType: (value: string) => T) => (input: string): T[] => {
	if (input === '') {
		return [];
	}
	return input.split(',').flatMap((item) => {
		const trimmed = item.trim();
		return trimmed === '' ? [] : [itemType(trimmed)];
	});
};

export const integer = () => (input: string): number => {
	if (input.trim() === '') {
		throw new TypeError(`Expected an integer (got: "${input}")`);
	}
	const value = Number(input);
	if (!Number.isInteger(value)) {
		throw new TypeError(`Expected an integer (got: "${input}")`);
	}
	return value;
};

export const float = () => (input: string): number => {
	if (input.trim() === '') {
		throw new TypeError(`Expected a finite number (got: "${input}")`);
	}
	const value = Number(input);
	if (!Number.isFinite(value)) {
		throw new TypeError(`Expected a finite number (got: "${input}")`);
	}
	return value;
};

export const range = (min: number, max: number) => (input: string): number => {
	if (input.trim() === '') {
		throw new TypeError(`Expected a number (got: "${input}")`);
	}
	const value = Number(input);
	if (!Number.isFinite(value)) {
		throw new TypeError(`Expected a number (got: "${input}")`);
	}
	if (value < min || value > max) {
		throw new Error(`Expected a number between ${min} and ${max} (got: ${value})`);
	}
	return value;
};

export const url = () => (input: string): URL => {
	try {
		return new URL(input);
	} catch (error) {
		throw new Error(`Expected a valid URL (got: "${input}")`, { cause: error });
	}
};
