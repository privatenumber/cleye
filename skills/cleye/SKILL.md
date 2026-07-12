---
name: cleye
description: "Build Node.js CLIs with cleye: typed positional parameters, flags, command maps, runCommand flow, generated help/version output, and help components. Use when authoring or reviewing code that imports `cli` from `cleye`, `cleye/formats`, or `cleye/help`. Do not use for unrelated CLI libraries."
---

# cleye

Use this skill for consumer code that builds command-line interfaces with `cleye`. Prefer the current beta API: import `cli` from `cleye`, define commands as a map, and lazy-load command files with dynamic imports.

## Start Here

| User goal | Do this |
| --- | --- |
| Simple script with flags | Use `cli({ name, flags })` and read Core Patterns below. |
| Positional args | Add `parameters`; names become camelCase on `argv._`. |
| Validated flag values | Use `cleye/formats` or a Standard Schema (Zod/Valibot/ArkType); read [Flag Formats](references/flag-formats.md). |
| Generated help | Use `version` and `help.description` / `help.examples`. |
| CLI architecture choices | Read [Design Recipes](references/design-recipes.md). |
| Subcommands | Use a `commands` map; read [Commands](references/commands.md). |
| Host process or tests | Use `throwOnExit` / custom argv; read [Runtime And Testing](references/runtime-and-testing.md). |
| Custom help layout | Keep declarative help first; read [Help Customization](references/help-customization.md) only when metadata is not enough. |
| Reusable wrappers | Read [Public Types](references/public-types.md). |

## Core Workflow

1. Start with one `cli()` call and declare `name`, `parameters`, and `flags`.
2. Use the callback form for most CLIs, especially when commands are involved.
3. Add declarative help metadata before reaching for custom help components.
4. Choose `parameters` or `commands` at a level. They can be combined for fallback routing when the first positional token selects behavior.
5. Put command files in separate modules and lazy-load them.
6. Enable strict modes when typos should fail instead of landing in `unknownFlags` or the no-command-match path.

## Quick Patterns

| Task | Pattern |
| --- | --- |
| Basic parser | `cli({ name, parameters, flags })` |
| Async callback | `await cli({ ... }, async argv => { ... })` |
| Test/custom argv | `cli({ ... }, undefined, ['--flag'])` |
| Commands | `cli({ commands: { build: () => import('./build.ts') } })` |
| Full command metadata | `build: { description, alias, loader }` |
| Manual command execution | `await parsed.runCommand(data)` |
| Embedded host | `cli({ throwOnExit: true }, undefined, argv)` |

## Basic CLI

```ts
import { cli } from 'cleye'

const argv = cli({
    name: 'greet',
    parameters: ['<name>'],
    flags: {
        shout: {
            type: Boolean,
            alias: 's',
            description: 'Uppercase the greeting'
        }
    }
})

const greeting = `Hello, ${argv._.name}`
console.log(argv.flags.shout ? greeting.toUpperCase() : greeting)
```

Use the callback form when setup, async work, or command auto-invocation is part of the flow:

```ts
await cli({
    flags: { verbose: Boolean }
}, async (argv) => {
    if (argv.flags.verbose) {
        console.error('Verbose logging enabled')
    }
})
```

Without a callback, `cli()` returns parsed argv synchronously. With a callback, it returns a Promise for the callback result.

## Parameters

Positional parameters are declared in order and exposed on `argv._`.

| Format | Result |
| --- | --- |
| `<name>` | Required string |
| `[name]` | Optional string |
| `<name...>` | Required spread, one or more strings |
| `[name...]` | Optional spread, zero or more strings |
| `--` | End-of-flags bucket at `argv._['--']` |

```ts
const argv = cli({
    parameters: ['<input file>', '[output]', '[extra...]']
})

argv._.inputFile // string
argv._.output // string | undefined
argv._.extra // string[]
argv._['--'] // string[] (everything after --)
```

Multi-word parameter names become camelCase properties.

## Flags

Define flags as shorthand type functions or descriptor objects. Flag names are camelCase in code and kebab-case on the command line.

```ts
const argv = cli({
    flags: {
        verbose: Boolean,
        outputDir: {
            type: String,
            alias: 'o',
            default: 'dist',
            description: 'Output directory',
            placeholder: '<path>'
        },
        tag: {
            type: [String],
            alias: 't'
        }
    }
})

argv.flags.verbose // boolean | undefined
argv.flags.outputDir // string
argv.flags.tag // string[]
```

Important flag behavior:

- Aliases must be non-empty single-character strings.
- Single-character flag names already render as short flags and cannot have a separate alias.
- `--flag=value`, `--flag:value`, and `--flag.value` all pass `value` to the type function.
- Boolean flags parse `--enabled=false`; use `booleanFlagNegation: true` to also accept `--no-enabled`.
- Use `[Boolean]` for counting flags: `-vvv` becomes an array with length `3`.
- Use `strictFlags: true` to reject unknown flags with suggestions.
- For computed defaults, use `default: { value, description }` so help can show stable text without executing runtime code.
- Command-line flags are presence-based and may be absent. For a business-required flag, assert after parsing instead of looking for `required: true`.

A [Standard Schema](https://standardschema.dev) validator (Zod, Valibot, ArkType) can be a flag type directly. cleye infers the flag type from the schema output:

```ts
import * as z from 'zod'

cli({
    flags: {
        size: z.enum(['small', 'large']), // 'small' | 'large' | undefined
        port: z.coerce.number(), // number | undefined
        tags: [z.string()] // string[]
    }
})
```

Coerce numbers (CLI values are strings), wrap in `[ ]` for multiple values (not `z.array`), keep booleans as native `Boolean`, and use cleye's `default` (not the schema's). Use the `{ type: schema, description, placeholder }` object form to add help metadata.

Read [Flag Formats](references/flag-formats.md) for `OneOf`, `Integer`, `Range`, `CommaList`, `Url`, Standard Schema validators, required-flag assertions, custom parsers, described defaults, sharing flag definitions across commands, and grouping flags into help sections.

## Help And Version

By default, cleye injects help flags and prints generated documentation:

- `--help` prints long help.
- `-h` prints short help.
- If both are present, `--help` wins.
- `version: '1.2.3'` enables `--version` and also shows the version in help.
- `help: false` disables automatic help handling; `argv.showHelp()` still works.

```ts
cli({
    name: 'my-script',
    version: '1.2.3',
    help: {
        description: 'Process files',
        usage: 'my-script [flags] <file>',
        examples: [
            'my-script input.txt',
            'my-script --output=dist input.txt'
        ]
    }
})
```

To show a version in help without enabling `--version`, pass it through `help.version`.

Use [Help Customization](references/help-customization.md) only when declarative help metadata cannot produce the needed layout.

## Commands

Commands are a map on `commands`. The key is the command name. The value is either a handler function or an object with metadata and `loader`.

```ts
await cli({
    name: 'tool',
    commands: {
        build: () => import('./commands/build.ts'),
        install: {
            description: 'Install a package',
            alias: ['i', 'add'],
            loader: () => import('./commands/install.ts')
        }
    }
}, async (parsed) => {
    console.log(`running ${parsed.command}`)
})
```

Command argv is split at the first positional token. Flags before the command belong to the parent; flags after the command belong to the child command file.

Read [Commands](references/commands.md) for lazy command files, aliases, strict command mode, `runCommand(data)`, nested commands, and rerunnable handlers.

## Runtime And Types

| Need | Resource |
| --- | --- |
| Keep a host process alive on help/errors | [Runtime And Testing](references/runtime-and-testing.md) |
| Parse custom argv in tests | [Runtime And Testing](references/runtime-and-testing.md) |
| Use sync mode without callback | [Runtime And Testing](references/runtime-and-testing.md) |
| Pick callback vs sync, strict vs permissive, or command style | [Design Recipes](references/design-recipes.md) |
| Import `Flags`, `ParsedArgv`, `HelpRenderer`, or help component types | [Public Types](references/public-types.md) |

## Do Not

- Do not use a `command()` helper; cleye's public entry point is `cli()`.
- Do not register commands as an array; use `commands: { name: entry }`.
- You can combine `parameters` and `commands` at the same `cli()` level. Commands take precedence.
- Do not pass custom argv as the second `cli()` argument. Use `cli(options, undefined, argv)` when there is no callback.
- Do not customize help before trying `help.description`, `help.usage`, and `help.examples`.
