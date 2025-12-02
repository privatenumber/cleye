export { cli } from './cli';
export { command, type Command } from './command';
export type { Renderers } from './render-help';
export type { Flags } from './types';

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
