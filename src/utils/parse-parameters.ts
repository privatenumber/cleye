import { camelCase } from './convert-case.ts';

/**
 * The end-of-flags sentinel in `options.parameters`. Tokens after `--` map
 * onto `parsed._['--']` instead of the main positional list.
 */
export const END_OF_FLAGS = '--';

const specialCharactersPattern = /[|\\{}()[\]^$+*?.]/;

export type ParsedParameter = {
	name: string;
	camelCaseName: string;
	required: boolean;
	spread: boolean;
};

export const parseParameters = (parameters: string[]): ParsedParameter[] => {
	const parsedParameters: ParsedParameter[] = [];

	let hasOptional: string | undefined;
	let hasSpread: string | undefined;

	for (const parameter of parameters) {
		if (hasSpread) {
			throw new Error(`Invalid parameter: Spread parameter "${hasSpread}" must be last`);
		}

		const firstCharacter = parameter[0];
		const lastCharacter = parameter.at(-1);

		let required: boolean | undefined;
		if (firstCharacter === '<' && lastCharacter === '>') {
			required = true;

			if (hasOptional) {
				throw new Error(`Invalid parameter: Required parameter "${parameter}" cannot come after optional parameter "${hasOptional}"`);
			}
		}

		if (firstCharacter === '[' && lastCharacter === ']') {
			required = false;
			hasOptional = parameter;
		}

		if (required === undefined) {
			throw new Error(`Invalid parameter: "${parameter}". Must be wrapped in <> (required parameter) or [] (optional parameter)`);
		}

		let name = parameter.slice(1, -1);

		const spread = name.slice(-3) === '...';

		if (spread) {
			hasSpread = parameter;
			name = name.slice(0, -3);
		}

		const invalidCharacter = name.match(specialCharactersPattern);
		if (invalidCharacter) {
			throw new Error(`Invalid parameter: "${parameter}". Invalid character found "${invalidCharacter[0]}"`);
		}

		const camelCaseName = camelCase(name);
		if (name === '' || camelCaseName === '') {
			throw new Error(`Invalid parameter: "${parameter}". Name must contain at least one alphanumeric character`);
		}

		parsedParameters.push({
			name,
			camelCaseName,
			required,
			spread,
		});
	}

	return parsedParameters;
};

export const checkDuplicateParameters = (parameters: ParsedParameter[]): void => {
	const seen = new Map<string, string>();
	for (const { name, camelCaseName } of parameters) {
		const existing = seen.get(camelCaseName);
		if (existing !== undefined) {
			if (existing === name) {
				throw new Error(`Invalid parameter: "${name}" is used more than once`);
			}
			throw new Error(`Invalid parameter: "${name}" collides with "${existing}" (both map to "${camelCaseName}")`);
		}
		seen.set(camelCaseName, name);
	}
};
