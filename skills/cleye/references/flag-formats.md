# Flag Formats

Use this reference when a CLI needs validated values, repeated flags, boolean
negation, described defaults, or custom flag parser functions.

## Built-In Constructors

Use JavaScript constructors for the common cases:

```ts
cli({
    flags: {
        verbose: Boolean,
        output: String,
        retries: Number
    }
})
```

Boolean flags parse `--flag=false` when the value is passed with `=`.
Without `=`, the next token is positional:

```sh
tool --verbose=false
tool --verbose false
```

The second form sets `verbose` to `true` and leaves `false` in `argv._`.

## Required Flags

In command-line APIs, flags are presence-based and may be absent. cleye inherits
that boundary: when a flag is not passed, the parsed value is `undefined` unless
the flag defines a `default`.

Use positional `parameters` for required data when order is natural. When a
named flag is required by application logic, assert it after parsing. cleye does
not provide `required: true` for flags because requiredness is application
validation, not flag parsing.

```ts
import assert from 'node:assert/strict'

const argv = cli({
    flags: {
        token: String
    }
})

assert.ok(argv.flags.token !== undefined, 'Missing required flag: --token')
```

## Aliases And Arrays

Aliases must be non-empty single-character strings. Single-character flag
names, such as `v`, already render as short flags and cannot define a separate
alias.

Wrap a type function in an array to collect repeated values:

```ts
const argv = cli({
    flags: {
        tag: {
            type: [String],
            alias: 't'
        }
    }
})

argv.flags.tag // string[]
```

Use `[Boolean]` for counting flags:

```ts
cli({
    flags: {
        verbose: {
            type: [Boolean],
            alias: 'v'
        }
    }
})
```

`-vvv` becomes an array with length `3`.

## Boolean Negation

Enable `booleanFlagNegation` when users should be able to pass `--no-name` for
boolean flags:

```ts
cli({
    flags: {
        color: {
            type: Boolean,
            default: true
        }
    },
    booleanFlagNegation: true
})
```

`--color`, `--no-color`, and `--color=false` all work. Last value wins.

## `cleye/formats`

Import reusable validators from `cleye/formats`:

```ts
import {
    commaList,
    float,
    integer,
    oneOf,
    range,
    url
} from 'cleye/formats'

cli({
    flags: {
        mode: { type: oneOf(['dev', 'prod'] as const) },
        port: { type: range(1024, 65_535) },
        count: { type: integer() },
        ratio: { type: float() },
        origins: { type: commaList(url()) }
    }
})
```

| Helper | Result |
| --- | --- |
| `oneOf(values)` | Validates and infers a string-literal union. |
| `commaList(itemType)` | Splits on commas, trims, and maps each item. |
| `integer()` | Parses a base-10 integer; rejects floats and empty values. |
| `float()` | Parses a finite float; rejects empty or non-finite values. |
| `range(min, max)` | Parses a number and validates inclusive bounds. |
| `url()` | Returns a `URL` object. |

## Custom Parsers

Any function `(value: string) => T` can be a type parser. Throw to reject an
invalid value:

```ts
const Size = (value: string) => {
    const sizes = ['small', 'medium', 'large'] as const
    if (!sizes.includes(value as typeof sizes[number])) {
        throw new Error(`Expected one of: ${sizes.join(', ')}`)
    }
    return value as typeof sizes[number]
}
```

## Described Defaults

Use a described default when the runtime value is computed but help should show
stable text:

```ts
cli({
    flags: {
        token: {
            type: String,
            default: {
                value: () => process.env.API_TOKEN,
                description: 'from API_TOKEN'
            }
        }
    }
})
```

The wrapper is recognized only when both `value` and `description` are present.
Objects with only one of those keys are treated as normal default values.
