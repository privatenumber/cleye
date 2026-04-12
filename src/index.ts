export { cli } from './cli.ts';
export { command, type Command } from './command.ts';
export type { Renderers } from './render-help/index.ts';
export type { Flags } from './types.ts';

/**
 * Re-export type-flag types that appear in cleye's public API.
 *
 * Without this, TypeScript cannot generate portable declaration files
 * for code like `export const cmd = command({...})` because the inferred
 * return type includes TypeFlag, which TS would reference via cleye's
 * internal node_modules path (not portable across package managers).
 *
 * Issue: https://github.com/privatenumber/cleye/issues/31
 */
export type { TypeFlag } from 'type-flag';
