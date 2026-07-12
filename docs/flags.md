# Flags
Flags (aka Options) are key-value pairs passed into the script in the format `--flag-name <value>`.

For example, in the following command, `--file-a` has value `data.json` and `--file-b` has value `file.txt`:

```
$ my-script --file-a data.json --file-b=file.txt
```

## Parsing features
_Cleye_'s flag parsing is powered by [`type-flag`](https://github.com/privatenumber/type-flag) and comes with many features:

- Array & Custom types
- [Standard Schema](https://standardschema.dev) validators (Zod, Valibot, ArkType) as flag types
- Flag delimiters: `--flag value`, `--flag=value`, `--flag:value`, and `--flag.value`
- Combined aliases: `-abcd 2` → `-a -b -c -d 2`
- [End of flags](https://unix.stackexchange.com/a/11382): Pass in `--` to end flag parsing
- Unknown flags: Unexpected flags stored in `unknownFlags`


Read the [_type-flag_ docs](https://github.com/privatenumber/type-flag) to learn more.

## Defining flags
Flags can be specified in the `flags` object-property, where the key is the flag name, and the value is a flag type function or an object that describes the flag.

The flag name is recommended to be in camelCase as it will be interpreted to parse kebab-case equivalents.

The flag type function can be any function that accepts a string and returns the parsed value. Default JavaScript constructors should cover most use-cases: [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/String), [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/Number), [Boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean/Boolean), etc.

The flag description object can be used to store additional information about the flag, such as `alias`, `default`, and `description`. To accept multiple values for a flag, wrap the type function in an array.

Flag aliases must be non-empty single-character strings. Single-character flag names, such as `v`, already render as short flags and cannot define a separate alias.

All of the provided information will be used to generate better help documentation.

If a default is computed at runtime, use `default: { value, description }` to show stable help text without calling the default function while rendering `--help`:

```ts
cli({
    flags: {
        token: {
            type: String,
            description: 'API token',
            default: {
                value: () => process.env.API_TOKEN,
                description: 'from API_TOKEN'
            }
        }
    }
})
```

The wrapper is only recognized when both `value` and `description` are present. Object defaults like `{ value: 30 }` or `{ description: 'local' }` remain plain default values.

Example:

```ts
await cli({
    flags: {
        someBoolean: Boolean,

        someString: {
            type: String,
            description: 'Some string flag',
            default: 'n/a'
        },

        someNumber: {
            // Wrap the type function in an array to allow multiple values
            type: [Number],
            alias: 'n',
            description: 'Array of numbers. (eg. -n 1 -n 2 -n 3)'
        }
    }
}, (argv) => {
    // $ my-script --some-boolean --some-string hello --some-number 1 -n 2

    argv.flags.someBoolean // => true (boolean | undefined)
    argv.flags.someString // => "hello" (string)
    argv.flags.someNumber // => [1, 2] (number[])
})
```

## Grouping flags

Wrap related flags with `group(name, flags)` and spread them into `flags` to render them under a titled section in `--help`:

```ts
import { cli, group } from 'cleye'

cli({
    name: 'search',
    flags: {
        ...group('Filters', {
            region: {
                type: String,
                description: 'Region to search'
            },
            lang: String
        }),
        ...group('Output', {
            json: Boolean
        }),
        verbose: Boolean // ungrouped → default "Flags" section
    }
})
```

```
Flags:
  -h, --help     Show help (-h for short form)
      --verbose

Filters:
      --lang <string>
      --region <string>  Region to search

Output:
      --json
```

Groups render in the order they first appear, after the default `Flags` section (which holds ungrouped flags). `group()` preserves each flag's type, so `argv.flags` stays fully inferred. Grouping applies to long help (`--help`); short help (`-h`) stays a single flat list.

## Required flags
In command-line APIs, flags are presence-based and may be absent. cleye inherits
that boundary: when a flag is not passed, the parsed value is `undefined` unless
the flag defines a `default`.

For required data, prefer positional `parameters` when order is natural. When a
named flag is a business requirement, assert it after parsing. cleye does not
provide `required: true` for flags because requiredness is application
validation, not flag parsing.

```ts
import assert from 'node:assert/strict'

const argv = cli({
    flags: {
        token: {
            type: String,
            description: 'API token'
        }
    }
})

assert.ok(argv.flags.token !== undefined, 'Missing required flag: --token')

argv.flags.token // => string
```

## Boolean flag negation
By default, boolean flags can be set to `false` by explicitly passing the value with `=`:

```sh
$ my-script --some-boolean=false
```

Without `=`, `false` is parsed as a separate argument, not as the flag's value:

```sh
$ my-script --some-boolean false
# argv.flags.someBoolean => true
# argv._ => ['false']
```

To also support the `--no-<flag>` prefix syntax, enable `booleanFlagNegation`:

```ts
cli({
    flags: {
        verbose: Boolean
    },
    booleanFlagNegation: true
})
```

```sh
$ my-script --no-verbose
# argv.flags.verbose => false
```

Last-wins semantics apply between `--flag` and `--no-flag`:

```sh
$ my-script --verbose --no-verbose
# argv.flags.verbose => false

$ my-script --no-verbose --verbose
# argv.flags.verbose => true
```

Only applies to flags defined as `Boolean`. For non-boolean flags, `--no-<flag>` is treated as an unknown flag.

## Custom flag types & validation
Custom flag types can be created to validate flags and narrow types. Simply create a new function that accepts a string and returns the parsed value.

Here's an example with a custom `Size` type that narrows the flag type to `"small" | "medium" | "large"`:

```ts
const possibleSizes = ['small', 'medium', 'large'] as const

type Sizes = typeof possibleSizes[number] // => "small" | "medium" | "large"

// Custom type function
const Size = (size: Sizes) => {
    if (!possibleSizes.includes(size)) {
        throw new Error(`Invalid size: "${size}"`)
    }

    return size
}

await cli({
    flags: {
        size: {
            type: Size,
            description: 'Size of the pizza (small, medium, large)'
        }
    }
}, (argv) => {
    // $ my-script --size large

    argv.flags.size // => "large" ("small" | "medium" | "large")
})
```

When a type function throws — `Size` above, a [`cleye/formats`](#composable-type-helpers) helper, or a [Standard Schema](#standard-schema-zod-valibot-arktype) validator — cleye treats it as a flag-value validation failure. It prints `Error: Flag "--<name>": <message>` to stderr and exits with code 1 (the same clean handling as other flag errors, not an uncaught stack trace). When [embedding with `throwOnExit`](./embedding.md), it instead throws `CleyeExit` (reason `'invalid-flag-value'`) whose `cause` is type-flag's `FlagParseError`. That error exposes `flagName`, and its `cause` is the original parser error (e.g. a `ZodError`).

## Standard Schema (Zod, Valibot, ArkType)

Any [Standard Schema](https://standardschema.dev) validator (Zod, Valibot, ArkType, and others) can be used directly as a flag type. _Cleye_ validates the value and infers the flag type from the schema's output. No wrapper or extra import.

```ts
import * as z from 'zod'

await cli({
    flags: {
        size: z.enum(['small', 'medium', 'large']),
        port: z.coerce.number(),
        tags: [z.string()] // Wrap in an array to accept multiple values
    }
}, (argv) => {
    // $ my-script --size large --port 8080 --tags a --tags b

    argv.flags.size // => "large" ("small" | "medium" | "large" | undefined)
    argv.flags.port // => 8080 (number | undefined)
    argv.flags.tags // => ["a", "b"] (string[])
})
```

It is library-agnostic, so any compliant schema works the same way:

```ts
import * as v from 'valibot'

cli({
    flags: {
        mode: v.picklist(['dev', 'prod']) // 'dev' | 'prod' | undefined
    }
})
```

To attach help metadata (`description`, `placeholder`, `alias`, `default`), use the object form with the schema as `type`. In help output, a schema flag's value renders as `<value>` by default, so set a `placeholder` for a clearer label:

```ts
cli({
    flags: {
        size: {
            type: z.enum(['small', 'large']),
            description: 'Size of the pizza',
            placeholder: '<size>'
        }
    }
})
```

On validation failure, the schema's message is surfaced as `Flag "--<name>": <message>`. Using a schema adds no runtime dependency: the Standard Schema spec is types-only and vendored into [`type-flag`](https://github.com/privatenumber/type-flag).

A few things to keep in mind:

- **Numbers need coercion.** Command-line values are always strings, so `z.number()` rejects `"3000"`. Use `z.coerce.number()` (or your library's equivalent), then chain validators like `.int()`, `.min()`, and `.max()`.
- **For multiple values, wrap the schema in `[ ]`** (as with `tags` above), not `z.array(...)`. A schema that itself outputs an array validates a single token against the array, so it type-checks but throws at runtime. To split one value into an array, use a transform such as `z.string().transform(value => value.split(','))`.
- **Keep booleans native.** Use `Boolean` rather than a schema for boolean flags, so valueless `--flag`, `--no-flag` negation, and short-flag grouping keep working.
- **Use cleye's `default`.** _Cleye_ only runs the parser when a flag is present, so a schema-level `.default()` never fires for an absent flag. Set `default` on the flag instead, with `as const` to preserve a literal type.
- **Schemas must be synchronous.** Flag parsing is synchronous, so an async schema throws.

## Composable type helpers

`cleye/formats` is a tree-shakable subpath that ships ready-made type-function helpers for common flag shapes. Import only what you need.

Formatters use PascalCase like built-in flag types (`String`, `Number`, and `Boolean`). Pass formatters that need no configuration directly; call the ones that need accepted values, an item type, or bounds.

```ts
import {
    OneOf, CommaList, Integer, Float, Range, Url
} from 'cleye/formats'

cli({
    flags: {
        format: { type: OneOf(['json', 'yaml', 'csv']) }, // => 'json' | 'yaml' | 'csv'
        tags: { type: CommaList(String) }, // => string[]
        port: { type: Range(1024, 65_535) }, // => number, validated in range
        count: { type: Integer }, // => number (integer only)
        ratio: { type: Float }, // => number (finite float)
        apiUrl: { type: Url } // => URL object
    }
})
```

| Helper | Return type | Description |
|--------|-------------|-------------|
| `OneOf(values)` | Union of the given string literals | Throws if the value is not in the list. Accepts an array (e.g. `OneOf(['a', 'b'])` or `OneOf(myConstArray)`). |
| `CommaList(itemType)` | `T[]` | Splits on `,`, trims whitespace, maps each item through `itemType`. |
| `Integer` | `number` | Parses a base-10 integer. Throws on floats or non-numeric input. |
| `Float` | `number` | Parses a finite float. Throws on non-finite or non-numeric input. |
| `Range(min, max)` | `number` | Validates that the input parses to a number in `[min, max]`. |
| `Url` | `URL` | Parses with `new URL()`. Returns a `URL` object so callers get `.host`, `.pathname`, etc. |

## Default flags
By default, _Cleye_ will try to handle the `--help`, `-h`, and `--version` flags.

### Help flags
Handling `--help` and `-h` is enabled by default.

- `--help` shows the full help output.
- `-h` shows short help output.

To disable both auto-injected help flags, set `help` to `false`. The help documentation can still be manually displayed by calling `.showHelp(helpOptions)` on the returned object.

If you define your own `help` or `h` flag, or use either name as another flag's alias, _Cleye_ will not auto-inject that name. User-defined flags always take precedence.

### Version flag
To enable handling `--version`, specify the `version` property.

```ts
cli({
    version: '1.2.3'
})
```

```sh
$ my-script --version
1.2.3
```

The version is also shown in the help documentation. To opt out of handling `--version` while still showing the version in `--help`, pass the version into `help.version`.

> [!TIP]
> Pull `name`, `version`, and `description` from your `package.json` to avoid keeping them in sync manually:
> ```ts
> import packageJson from './package.json' with { type: 'json' }
>
> cli({
>     name: packageJson.name,
>     version: packageJson.version,
>     help: { description: packageJson.description }
> })
> ```
> `name` should be the command users type. That's `package.json`'s `name` for a typical single-binary package, but set it to your **bin** name when they differ (scoped name, multiple bins, or a different command).

## Strict flags
To reject unknown flags with an error, enable `strictFlags`:

```ts
cli({
    flags: {
        foo: Boolean,
        bar: String
    },
    strictFlags: true
})
```

```sh
$ my-script --baz
Error: Unknown flag: --baz. (Did you mean --bar?)
```

When enabled, the CLI will exit with an error if any unknown flags are passed. If a similar flag name exists (within 2 edits), it will suggest the closest match.
