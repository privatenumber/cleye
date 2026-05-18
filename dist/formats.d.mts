declare const oneOf: <const T extends readonly string[]>(values: T) => (input: string) => T[number];
declare const commaList: <T>(itemType: (value: string) => T) => (input: string) => T[];
declare const integer: () => (input: string) => number;
declare const float: () => (input: string) => number;
declare const range: (min: number, max: number) => (input: string) => number;
declare const url: () => (input: string) => URL;

export { commaList, float, integer, oneOf, range, url };
