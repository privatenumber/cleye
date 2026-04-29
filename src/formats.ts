export const oneOf = <const T extends readonly string[]>(
	values: T,
) => (input: string): T[number] => {
	if (!values.includes(input)) {
		throw new Error(`Expected one of: ${values.join(', ')} (got: ${JSON.stringify(input)})`);
	}
	return input as T[number];
};

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
	const value = Number(input);
	if (!Number.isInteger(value)) {
		throw new TypeError(`Expected an integer (got: ${JSON.stringify(input)})`);
	}
	return value;
};

export const float = () => (input: string): number => {
	const value = Number(input);
	if (!Number.isFinite(value)) {
		throw new TypeError(`Expected a finite number (got: ${JSON.stringify(input)})`);
	}
	return value;
};

export const range = (min: number, max: number) => (input: string): number => {
	const value = Number(input);
	if (!Number.isFinite(value)) {
		throw new TypeError(`Expected a number (got: ${JSON.stringify(input)})`);
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
		throw new Error(`Expected a valid URL (got: ${JSON.stringify(input)})`, { cause: error });
	}
};
