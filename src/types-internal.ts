import type { Flags } from 'type-flag';

/**
 * Any callable. Used as the constraint for handler/loader functions in
 * CommandEntry and the type-machinery that extracts and forwards their
 * signatures (`EntryHandler`, `RunCommandFor`).
 *
 * `any` is intentional here: using `unknown[]` for a function constraint makes
 * typed handlers such as `(name: string) => void` fail parameter compatibility.
 */
export type AnyFunction = (...arguments_: any) => any;

/**
 * Default value plus explicit help text. Recognized only when both `value` and
 * `description` are present; objects with just one of those keys remain plain
 * object defaults.
 */
export type DescribedDefault<Value = unknown> = {
	value: Value | (() => Value);
	description: string;
};

/**
 * The shape of `runCommand` when no command matched — a callable noop that
 * returns `undefined` synchronously. `await undefined` is a no-op, so callers
 * can still write `await argv.runCommand()` if they want symmetry across
 * the discriminated union's branches.
 */
export type NoopRunCommand = () => undefined;

type AlphabetLowercase = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
type Numeric = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type AlphaNumeric = AlphabetLowercase | Uppercase<AlphabetLowercase> | Numeric;

export type CamelCase<Word extends string> = (
	Word extends `${infer FirstCharacter}${infer Rest}`
		? (
			FirstCharacter extends AlphaNumeric
				? `${FirstCharacter}${CamelCase<Rest>}`
				: Capitalize<CamelCase<Rest>>
		)
		: Word
);

export type StripBrackets<Parameter extends string> = (
	Parameter extends `<${infer ParameterName}>` | `[${infer ParameterName}]`
		? (
			ParameterName extends `${infer SpreadName}...`
				? SpreadName
				: ParameterName
		)
		: never
);

export type ParameterType<Parameter extends string> = (
	Parameter extends `<${infer _ParameterName}...>` | `[${infer _ParameterName}...]`
		? string[]
		: Parameter extends `<${infer _ParameterName}>`
			? string
			: Parameter extends `[${infer _ParameterName}]`
				? string | undefined
				: never
);

/**
 * Augment the user-declared flags with auto-injected `version` (when
 * `options.version` is set) and `help` (unless `options.help` is `false`).
 * Used to compute `ParsedArgv['flags']`.
 *
 * Defaults `flags` to `{}` when omitted so the intersection doesn't collapse
 * to `never` for the no-flags case (e.g. `cli({})`).
 */
type NormalizeDescribedDefault<Default> = (
	Default extends DescribedDefault<infer Value>
		? Value | (() => Value)
		: Default
);

type NormalizeDescribedDefaults<Schemas> = {
	[FlagName in keyof Schemas]: Schemas[FlagName] extends { default: infer Default }
		? Omit<Schemas[FlagName], 'default'> & { default: NormalizeDescribedDefault<Default> }
		: Schemas[FlagName];
};

type UserFlags<Options extends { flags?: Flags }> = Options['flags'] extends Flags
	? NormalizeDescribedDefaults<Options['flags']>
	: unknown;

type FlagKeyExists<Options extends { flags?: Flags }, FlagName extends string> = (
	Options['flags'] extends Flags
		? FlagName extends keyof Options['flags']
			? true
			: false
		: false
);

type AutoFlag<
	Options extends { flags?: Flags },
	FlagName extends string,
	Schema,
> = FlagKeyExists<Options, FlagName> extends true ? unknown : Schema;

export type ResolvedFlags<Options extends { flags?: Flags }> = (
	UserFlags<Options>
	& (Options extends { version: string } ? AutoFlag<Options, 'version', { version: BooleanConstructor }> : unknown)
	& (Options extends { help: false } ? unknown : AutoFlag<Options, 'help', { help: BooleanConstructor }>)
);

/** Extract the handler from a CommandEntry — the entry itself or `entry.loader`. */
type EntryHandler<Entry> = Entry extends AnyFunction
	? Entry
	: Entry extends { loader: infer Loader extends AnyFunction }
		? Loader
		: never;

/**
 * The shape of `runCommand` for a specific matched command. Mirrors the
 * resolved handler's sync/async character:
 *
 * - Sync handler (`cmd: () => 42`) → `runCommand` returns `42` directly.
 * - Async handler (`cmd: async () => 42`) → `runCommand` returns `Promise<42>`.
 * - Loader pattern returning a module namespace (`loader: () => import(...)`)
 *   → always async because `import()` is async; the default export's return
 *   value is unwrapped through the awaited Promise.
 *
 * Synchronous handlers that return a `{ default: fn }` shape get the same
 * default-unwrap treatment without an extra Promise wrap.
 */
export type RunCommandFor<Entry> =
	EntryHandler<Entry> extends (...arguments_: infer Arguments) => infer Return
		? Return extends Promise<infer Resolved>
			? Resolved extends { default: infer Default extends AnyFunction }
				? (...arguments_: Parameters<Default>) => Promise<Awaited<ReturnType<Default>>>
				: (...arguments_: Arguments) => Promise<Resolved>
			: Return extends { default: infer Default extends AnyFunction }
				? (...arguments_: Parameters<Default>) => ReturnType<Default>
				: (...arguments_: Arguments) => Return
		: never;
