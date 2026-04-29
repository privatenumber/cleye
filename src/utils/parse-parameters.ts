import { camelCase } from './convert-case.ts';

const { stringify } = JSON;

const specialCharactersPattern = /[|\\{}()[\]^$+*?.]/;

export type ParsedParameter = {
	name: string;
	camelCaseName: string;
	required: boolean;
	spread: boolean;
};

export function parseParameters(parameters: string[]): ParsedParameter[] {
	const parsedParameters: ParsedParameter[] = [];

	let hasOptional: string | undefined;
	let hasSpread: string | undefined;

	for (const parameter of parameters) {
		if (hasSpread) {
			throw new Error(`Invalid parameter: Spread parameter ${stringify(hasSpread)} must be last`);
		}

		const firstCharacter = parameter[0];
		const lastCharacter = parameter.at(-1);

		let required: boolean | undefined;
		if (firstCharacter === '<' && lastCharacter === '>') {
			required = true;

			if (hasOptional) {
				throw new Error(`Invalid parameter: Required parameter ${stringify(parameter)} cannot come after optional parameter ${stringify(hasOptional)}`);
			}
		}

		if (firstCharacter === '[' && lastCharacter === ']') {
			required = false;
			hasOptional = parameter;
		}

		if (required === undefined) {
			throw new Error(`Invalid parameter: ${stringify(parameter)}. Must be wrapped in <> (required parameter) or [] (optional parameter)`);
		}

		let name = parameter.slice(1, -1);

		const spread = name.slice(-3) === '...';

		if (spread) {
			hasSpread = parameter;
			name = name.slice(0, -3);
		}

		const invalidCharacter = name.match(specialCharactersPattern);
		if (invalidCharacter) {
			throw new Error(`Invalid parameter: ${stringify(parameter)}. Invalid character found ${stringify(invalidCharacter[0])}`);
		}

		parsedParameters.push({
			name,
			camelCaseName: camelCase(name),
			required,
			spread,
		});
	}

	return parsedParameters;
}

export function checkDuplicateParameters(parameters: ParsedParameter[]): void {
	const seen = new Map<string, string>();
	for (const { name, camelCaseName } of parameters) {
		const existing = seen.get(camelCaseName);
		if (existing !== undefined) {
			if (existing === name) {
				throw new Error(`Invalid parameter: ${stringify(name)} is used more than once`);
			}
			throw new Error(`Invalid parameter: ${stringify(name)} collides with ${stringify(existing)} (both map to ${stringify(camelCaseName)})`);
		}
		seen.set(camelCaseName, name);
	}
}
