export const camelCase = (word: string) => word.replaceAll(/[\W_]([a-z\d])?/gi, (_, c) => (c ? c.toUpperCase() : ''));

export const kebabCase = (word: string) => word.replaceAll(/([a-z])([A-Z])/g, '$1-$2').replaceAll(/\B([A-Z])([a-z])/g, '-$1$2').toLowerCase();
