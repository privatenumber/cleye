export const camelCase = (word: string) => word.replaceAll(/[\W_]([a-z\d])?/gi, (_, c) => (c ? c.toUpperCase() : ''));
