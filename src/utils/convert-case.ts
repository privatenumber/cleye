export const camelCase = (word: string) => word.replaceAll(/[\W_]([a-z\d])?/gi, (_, c) => (c ? c.toUpperCase() : ''));

export const kebabCase	= (word: string) => word.replaceAll(/\B([A-Z])/g, '-$1').toLowerCase();
