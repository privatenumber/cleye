export const camelCase = (word: string) => word.replace(/[-_ ](\w)/g, (_, c) => c.toUpperCase());

export const kebabCase	= (word: string) => word.replace(/\B([A-Z])/g, '-$1').toLowerCase();
