---
name: cleye
description: cleye CLI development tool — argv parsing with typed parameters, flags, commands, and auto-generated help. Use when building Node.js CLI scripts with cleye or when the user imports `cli` or `command` from `cleye`.
---

# cleye

## Quick Patterns

| Task | Pattern |
|------|---------|
| Basic CLI | `cli({ name, parameters, flags })` |
| Named command | `command({ name, parameters, flags }, callback)` |
| Register commands | `cli({ commands: [cmd1, cmd2] })` |
| Async callback | `await cli({ ... }, async (argv) => { ... })` |
| Raw argv | `cli({ ... }, callback, process.argv.slice(2))` |

## Parameters

Positional arguments mapped to named properties on `argv._`.

| Format | Description |
|--------|-------------|
| `<name>` | Required |
| `[name]` | Optional |
| `<name...>` | Required spread (1+) |
| `[name...]` | Optional spread (0+) |
| `--` | End-of-flags separator |

```ts
const argv = cli({
    parameters: ['<required>', '[optional]', '[rest...]']
})
argv._.required // string
argv._.optional // string | undefined
argv._.rest // string[]
argv._['--'] // string[] — everything after --
```

Multi-word names use camelCase on `argv._`: `'<first name>'` → `argv._.firstName`.

## Flags

```ts
const argv = cli({
    flags: {
        verbose: Boolean, // shorthand
        output: {
            type: String,
            alias: 'o',
            default: 'dist',
            description: 'Output directory',
            placeholder: '<path>'
        },
        count: {
            type: [Number], // array: -n 1 -n 2
            alias: 'n'
        }
    }
})

argv.flags.verbose // boolean | undefined
argv.flags.output // string
argv.flags.count // number[]
```

Flag name is camelCase; parsed from kebab-case CLI input (`--output-dir` → `outputDir`).

**Delimiters** — `=`, `:`, and `.` all work as value separators:

```sh
--flag=value   --flag:value   --flag.value
```

Use `:` when the value itself contains `=` (e.g. `--define:KEY=VALUE`).

**Counting flags** — use `[Boolean]` and check `.length`:

```ts
cli({
    flags: {
        verbose: {
            type: [Boolean],
            alias: 'v'
        }
    }
})
// -vvv → argv.flags.verbose.length === 3
```

**Optional value** — custom type returns `true` when no value is given:

```ts
const OptionalString = (value: string) => value || true
cli({ flags: { tag: OptionalString } })
// --tag        → true
// --tag beta   → 'beta'
```

## Boolean Flag Negation

By default, set a boolean flag to `false` using the `=` operator:

```sh
--verbose=false   # → false
--verbose false   # → true (false treated as separate argument)
```

To also support the `--no-<flag>` convention, enable `booleanFlagNegation` (additive — `=false` still works):

```ts
cli({
    flags: { verbose: Boolean },
    booleanFlagNegation: true
})
// --no-verbose     → false
// --verbose=false  → false (still works)
// Last-wins: --verbose --no-verbose → false
```

Commands inherit `booleanFlagNegation` from the parent `cli()` but can override it.

## Strict Flags

```ts
cli({
    flags: { foo: Boolean },
    strictFlags: true
})
// --baz → Error: Unknown flag: --baz. (Did you mean --foo?)
```

Commands inherit `strictFlags` but can override it.

## Commands

```ts
// install-command.ts
export const installCommand = command({
    name: 'install',
    alias: ['i', 'add'],
    parameters: ['<package name>'],
    flags: { saveDev: Boolean }
}, (argv) => {
    argv._.packageName // string
    argv.flags.saveDev // boolean | undefined
})

// main.ts
cli({
    name: 'npm',
    version: '1.0.0',
    commands: [installCommand]
})
```

When a command is matched, `argv.command` narrows the type for type-safe branching.

## Help & Version

```ts
cli({
    name: 'my-script',
    version: '1.2.3', // enables --version; also shown in --help
    help: {
        description: 'Does things',
        usage: 'my-script [flags] <file>',
        examples: ['my-script foo.txt', 'my-script --output=dist foo.txt'],
        version: '1.2.3' // show version in --help without handling --version
    }
})
// help: false  — disables --help handling; call argv.showHelp() manually
```

Tip: import `name`, `version`, and `description` from `package.json` to avoid keeping them in sync manually:

```ts
import { name, version, description } from './package.json' with { type: 'json' }

cli({ name, version, help: { description } })
```

## Custom Flag Types

Any function `(value: string) => T` works as a flag type — the return type is inferred.

```ts
// Validation + narrowing
const Port = (value: string) => {
    const n = Number(value)
    if (!Number.isInteger(n) || n < 1 || n > 65_535) { throw new Error(`Invalid port: ${value}`) }
    return n
}
// argv.flags.port → number

// Enum
const sizes = ['small', 'medium', 'large'] as const
const Size = (v: string) => {
    if (!(sizes as readonly string[]).includes(v)) { throw new Error(`Expected: ${sizes.join(', ')}`) }
    return v as typeof sizes[number]
}
// argv.flags.size → 'small' | 'medium' | 'large'

// Comma-separated list
const List = (v: string) => v.split(',')
// --tags a,b,c → argv.flags.tags === ['a', 'b', 'c']

// Inline JSON
cli({ flags: { data: JSON.parse } })
// --data '{"key":1}' → argv.flags.data === { key: 1 }

// Dot-nested object (combine with . delimiter)
const Env = (v: string): Record<string, string | true> => {
    const [k, value] = v.split('=')
    return { [k]: value ?? true }
}
cli({ flags: { env: [Env] } })
// --env.TOKEN=abc --env.CI → merge to { TOKEN: 'abc', CI: true }
```

## Help Customization

```ts
cli({
    help: {
        render(nodes, renderers) {
            nodes.push('\nDocs: https://example.com')
            renderers.flagOperator = () => '=' // --flag=<value>
            return renderers.render(nodes)
        }
    }
})
```

Default renderers: `/src/render-help/renderers.ts`.

## ignoreArgv

```ts
cli({
    ignoreArgv(type, flagOrArgv, value) {
        if (type === 'unknown-flag') { return true } // silently skip unknown flags
    }
})
```

`type`: `'known-flag' | 'unknown-flag' | 'argument'`

## Return Type

```ts
type ParsedArgv = {
    _: string[] & Parameters
    flags: { [name: string]: InferredType }
    unknownFlags: { [name: string]: (string | boolean)[] }
    showVersion: () => void
    showHelp: (options?: HelpOptions) => void
}
```

## TypeScript Exports

```ts
import type { Flags, Renderers, TypeFlag } from 'cleye'
```

| Type | Use |
|------|-----|
| `Flags` | Type for the `flags` option object |
| `Renderers` | Help renderer class type for `help.render` customization |
| `TypeFlag` | Re-export from `type-flag` for portable type declarations |
