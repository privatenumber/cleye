export const camelCase = (word: string) => word.replace(/[\W_]([a-z\d])?/gi, (_, c) => (c ? c.toUpperCase() : ''));

export const kebabCase	= (word: string) => word.replace(/\B([A-Z])/g, '-$1').toLowerCase();
