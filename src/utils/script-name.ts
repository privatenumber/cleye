export const isValidScriptName = (
	name: string,
) => name.length > 0 && !name.includes(' ');
