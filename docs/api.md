# API

## cli(options, callback?, argv?)

Returns:
- `ParsedArgv` (sync) when no callback is passed.
- `Promise<CallbackReturn>` when a callback is passed — resolves to whatever the callback returns.

In sync mode, matched commands are not auto-invoked. Call `await argv.runCommand()` yourself if you have commands.

Function to parse argv by declaring parameters, flags, and commands.

### `ParsedArgv` shape (the callback's first argument)

```ts
import type { ParsedArgvEntry } from 'type-flag'

type ParsedArgv = {
    // Parsed arguments
    _: string[] & Parameters

    // Parsed flags
    flags: {
        [flagName: string]: InferredType
    }

    // Unexpected flags
    unknownFlags: {
        [flagName: string]: (string | boolean)[]
    }

    // Ordered parsed argv elements
    entries: ParsedArgvEntry[]

    // Matched command name, or undefined
    command: string | undefined

    // Trigger the matched command. Always defined — sync no-op (returns
    // `undefined`) when no command matched. When a command matched, the
    // signature and return mirror the handler's shape: arguments and sync
    // value for sync handlers, Promise for async handlers and lazy
    // loaders. Each call invokes the command with that call's arguments.
    runCommand: (...arguments_: unknown[]) => unknown

    // Print the configured version to stdout; no-op when no version is set.
    showVersion: () => void

    // Method to print help (pass HelpOptions to override content)
    showHelp: (options?: HelpOptions) => void
}
```

`entries` is an advanced API for cases where the order of parsed flags matters. Most CLIs should read `flags`; use `entries` when repeated or mixed flags act as ordered operations rather than independent settings.

`flags` and `unknownFlags` are null-prototype dictionaries. Use `Object.hasOwn()` or the `in` operator for ownership checks.

### options

| Property | Type | Description |
| - | - | - |
| `name` | `string` | Command name shown in `--help` — your **bin** name (the command users type). Usually `package.json`'s `name`, but set it explicitly when they differ (scoped name, multiple bins, or a different command). Defaults to the entry filename (`basename(process.argv[1])`) when omitted. |
| `version` | `string` | Enables `--version` flag and shown in `--help`. Pass via `help.version` to show in help only. |
| `parameters` | `string[]` | Positional argument definitions. Formats: `<required>`, `[optional]`, `<spread...>`, `[spread...]`. |
| `flags` | `Flags` | Flag definitions. See [Defining flags](./flags.md#defining-flags). |
| `commands` | `Record<string, CommandEntry>` | Command definitions. See [Defining commands](./commands.md#defining-commands). |
| `help` | `false \| HelpOptions \| ((context: HelpContext) => HelpOptions)` | Help configuration, or `false` to disable `--help`. A function receives `{ name, command, version }` and returns `HelpOptions`. See [help options](#help). |
| `ignoreArgv` | `IgnoreArgvCallback` | Callback to skip certain argv tokens from parsing. |
| `strictFlags` | `boolean` | Error on unknown flags with typo suggestions. Inherited by commands. |
| `strictCommands` | `boolean` | Error on unknown commands with typo suggestions. Inherited by commands. |
| `booleanFlagNegation` | `boolean` | Enable `--no-<flag>` for boolean flags. Inherited by commands. |
| `throwOnExit` | `boolean` | Throw `CleyeExit` instead of calling `process.exit`. For embedding cleye in a host process. Inherited by commands. |

#### flags

An object mapping flag names (in camelCase) to a type function or descriptor:

| Property | Type | Description |
| - | - | - |
| `type` | `Function` | Flag value parsing function. |
| `alias` | `string` | Non-empty single-character alias for the flag. Not allowed on single-character flag names. |
| `default` | `any \| { value: any, description: string }` | Default value for the flag. Use `{ value, description }` to show explicit help text for computed defaults without executing them while rendering help. |
| `description` | `string` | Description shown in `--help`. |
| `placeholder` | `string` | Placeholder for the flag value shown in `--help`. |

#### commands

A map of command names to entries:

```ts
type CommandEntry =
    | (() => void | Promise<void>)
    | {
        description?: string
        alias?: string | string[]
        loader: () => void | Promise<void>
    }
```

#### help

| Property | Type | Description |
| - | - | - |
| `version` | `string` | Version shown in `--help` without enabling `--version` flag. |
| `description` | `string` | Description shown in `--help`. |
| `usage` | `string \| string[] \| false` | Usage examples. `false` disables auto-generated usage. |
| `examples` | `string \| string[]` | Example code snippets shown in `--help`. |
| `render` | `HelpRenderer` (`(options, { form }) => string \| Node \| Node[]`) | Function to customize the help document. |

`help` may also be a function that receives a `HelpContext` and returns `HelpOptions` (see [Dynamic help options](./help.md#dynamic-help-options)):

| Property | Type | Description |
| - | - | - |
| `name` | `string` | The command's own name (the program name at the root). |
| `command` | `string` | The full invocation path, e.g. `npm config get`. Equals `name` at the root. |
| `version` | `string` | The configured version, if any. |

### callback(parsed)

Optional callback invoked after parsing. The `cli()` Promise resolves to whatever this callback returns.

`parsed` is the `ParsedArgv` shape above — including `runCommand` as a property. Destructure to access it: `({ runCommand, flags, _ }) => { ... }`.

If the callback doesn't call `runCommand`, cleye auto-invokes the matched command after the callback returns. The auto-invoke's return value is discarded — call `runCommand()` yourself to capture it.

### argv

Type: `string[]`

Default: `process.argv.slice(2)`

The raw parameters array to parse.

## Type exports

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

import type {
    Flag,
    Node
} from 'cleye/help'
```

