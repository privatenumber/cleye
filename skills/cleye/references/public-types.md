# Public Types

Use this reference when writing wrappers, reusable command definitions, type tests, or library code that exposes cleye types.

## Main Types

```ts
import type {
    CliOptions,
    CommandEntry,
    Commands,
    DescribedDefault,
    ExitReason,
    Flags,
    HelpContext,
    HelpOptions,
    HelpRenderer,
    ParsedArgv
} from 'cleye'
```

| Type | Use |
| --- | --- |
| `CliOptions` | Type a reusable options object. |
| `Flags` | Type the `flags` option object. |
| `CommandEntry` | Type one command map value. |
| `Commands` | Type a full command map. |
| `ParsedArgv` | Type parsed results in wrappers or tests. |
| `HelpOptions` | Type help override objects. |
| `HelpRenderer` | Type custom `help.render` functions. |
| `HelpContext` | Type the context a function `help` receives (`{ name, command, version }`). |
| `ExitReason` | Narrow `CleyeExit.reason`. |
| `DescribedDefault` | Type `default: { value, description }`. |

## `ParsedArgv`

`ParsedArgv` is the object returned by sync mode and passed to callbacks:

```ts
import type { ParsedArgvEntry } from 'type-flag'

type ParsedArgv = {
    _: string[] & Record<string, unknown>
    flags: Record<string, unknown>
    unknownFlags: Record<string, (string | boolean)[]>
    entries: ParsedArgvEntry[]
    command: string | undefined
    runCommand: (...arguments_: unknown[]) => unknown
    showHelp: (options?: HelpOptions) => void
    showVersion: () => void
}
```

`entries` is an advanced API for cases where the order of parsed flags matters. Most CLIs should read `flags`; use `entries` when repeated or mixed flags act as ordered operations rather than independent settings.

`flags` and `unknownFlags` are null-prototype dictionaries. Use `Object.hasOwn()` or the `in` operator for ownership checks.

Use named parameters from `argv._` for declared `parameters`, `argv.command` to detect the matched command, and `argv.unknownFlags` only when intentionally forwarding flags with `strictFlags` disabled.

`runCommand` is always present. When no command matched, it returns `undefined` synchronously. When a command matched, TypeScript narrows its arguments and return value after checking `argv.command`.

## Options Surface

| Option | Expert note |
| --- | --- |
| `parameters` | Use for positional data. Can be combined with `commands` for fallback routing. |
| `commands` | Use for dispatch by the first positional token. Values are handler functions or `{ description, alias, loader }`. |
| `flags` | Values are type functions or descriptor objects with `type`, `alias`, `default`, `description`, and `placeholder`. |
| `help` | `false` disables automatic help handling; `showHelp()` still works. Can also be a function receiving `{ name, command, version }` that returns the help options. |
| `version` | Enables `--version`; use `help.version` to show a version in help only. |
| `strictFlags` | Rejects unknown flags with suggestions. Inherits into command files. |
| `strictCommands` | Rejects unknown command names with suggestions. Inherits into nested commands. |
| `booleanFlagNegation` | Enables `--no-name` for `Boolean` flags. Inherits into command files. |
| `throwOnExit` | Throws `CleyeExit` instead of calling `process.exit`. Inherits into command files. |
| `ignoreArgv` | Advanced escape hatch for skipping argv tokens before type-flag parsing. |

## Help Component Types

```ts
import type {
    Flag,
    Node
} from 'cleye/help'
```

Use `Flag` when building a manual flag list for `flags()`, `flagsColumns()`, or `flagsStacked()`. Use `Node` when building helper functions that return help components.

## Parser Types

For type-flag parser internals, import from `type-flag` directly. cleye does not re-export type-flag's parsed-result internals.
