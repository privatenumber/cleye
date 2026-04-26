
<p align="center">
	<img width="110" src=".github/logo.webp">
</p>
<h1 align="center">
	cleye
	<br>
	<a href="https://npm.im/cleye"><img src="https://badgen.net/npm/v/cleye"></a> <a href="https://npm.im/cleye"><img src="https://badgen.net/npm/dm/cleye"></a>
</h1>

The intuitive command-line interface (CLI) development tool.

### Features
- Single API — just `cli()`
- Strongly typed parameters and flags
- Commands as lazy imports with automatic argv routing
- Nested command support
- Middleware-style callbacks with data passing
- `--help` documentation generation (customizable)
- Strict mode for flags and commands with typo suggestions

> [Try it out online](https://stackblitz.com/edit/cleye-demo?devtoolsheight=50&file=examples/greet.ts&view=editor)

<br>

<p align="center">
	<a href="https://github.com/sponsors/privatenumber/sponsorships?tier_id=398771"><img width="412" src="https://raw.githubusercontent.com/privatenumber/sponsors/master/banners/assets/donate.webp"></a>
	<a href="https://github.com/sponsors/privatenumber/sponsorships?tier_id=397608"><img width="412" src="https://raw.githubusercontent.com/privatenumber/sponsors/master/banners/assets/sponsor.webp"></a>
</p>
<p align="center"><sup><i>Already a sponsor?</i> Join the discussion in the <a href="https://github.com/pvtnbr/cleye">Development repo</a>!</sup></p>

## Install

```bash
npm i cleye
```

## Quick start
_Cleye_ makes it very easy to develop command-line scripts in Node.js. It handles argv parsing to give you strongly typed parameters + flags and generates `--help` documentation based on the provided information.

Here's an example script that simply logs: `Good morning/evening <name>!`:

_greet.js:_
```ts
import { cli } from 'cleye'

await cli({
    name: 'greet.js',

    parameters: [
        '<first name>',
        '[last name]'
    ],

    flags: {
        time: {
            type: String,
            description: 'Time of day to greet (morning or evening)',
            default: 'morning'
        }
    }
}, (argv) => {
    const name = [argv._.firstName, argv._.lastName].filter(Boolean).join(' ')

    if (argv.flags.time === 'morning') {
        console.log(`Good morning ${name}!`)
    } else {
        console.log(`Good evening ${name}!`)
    }
})
```

> [!NOTE]
> `cli()` is async. The returned `Promise` resolves to whatever the callback returns. Without a callback, it resolves to `undefined` — pass `(parsed) => parsed` if you want `ParsedArgv` back.

> [!TIP]
> Pull `name` and `version` from your `package.json` to keep them in sync:
> ```ts
> import packageJson from './package.json' with { type: 'json' }
>
> await cli({
>     name: packageJson.name,
>     version: packageJson.version
> })
> ```

Generated help documentation can be viewed with the `--help` flag:

```sh
$ node greet.js --help

greet.js

Usage:
  greet.js [flags...] <first name> [last name]

Flags:
  -h, --help                 Show help
      --time <string>        Time of day to greet (morning or evening) (default: "morning")
```

Run the script to see it in action:

```sh
$ node greet.js John Doe --time evening

Good evening John Doe!
```

### Examples
Want to dive right into some code? Check out some of these examples:

- [**greet.js**](/examples/greet/index.ts): Working example from above
- [**npm install**](/examples/npm/index.ts): Reimplementation of [`npm install`](https://docs.npmjs.com/cli/install/)'s CLI
- [**tsc**](/examples/tsc/index.ts): Reimplementation of TypeScript [`tsc`](https://www.typescriptlang.org/docs/handbook/compiler-options.html)'s CLI
- [**snap-tweet**](/examples/snap-tweet/index.ts): Reimplementation of [`snap-tweet`](https://github.com/privatenumber/snap-tweet)'s CLI
- [**pkg-size**](/examples/pkg-size/index.ts): Reimplementation of [`pkg-size`](https://github.com/pkg-size/pkg-size)'s CLI

## Flags
Flags (aka Options) are key-value pairs passed into the script in the format `--flag-name <value>`.

For example, in the following command, `--file-a` has value `data.json` and `--file-b` has value `file.txt`:

```
$ my-script --file-a data.json --file-b=file.txt
```

### Parsing features
_Cleye_'s flag parsing is powered by [`type-flag`](https://github.com/privatenumber/type-flag) and comes with many features:

- Array & Custom types
- Flag delimiters: `--flag value`, `--flag=value`, `--flag:value`, and `--flag.value`
- Combined aliases: `-abcd 2` → `-a -b -c -d 2`
- [End of flags](https://unix.stackexchange.com/a/11382): Pass in `--` to end flag parsing
- Unknown flags: Unexpected flags stored in `unknownFlags`


Read the [_type-flag_ docs](https://github.com/privatenumber/type-flag) to learn more.

### Defining flags
Flags can be specified in the `flags` object-property, where the key is the flag name, and the value is a flag type function or an object that describes the flag.

The flag name is recommended to be in camelCase as it will be interpreted to parse kebab-case equivalents.

The flag type function can be any function that accepts a string and returns the parsed value. Default JavaScript constructors should cover most use-cases: [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/String), [Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/Number), [Boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean/Boolean), etc.

The flag description object can be used to store additional information about the flag, such as `alias`, `default`, and `description`. To accept multiple values for a flag, wrap the type function in an array.

All of the provided information will be used to generate better help documentation.

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

### Boolean flag negation
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
await cli({
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

### Custom flag types & validation
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

### Composable type helpers

`cleye/formats` is a tree-shakable subpath that ships ready-made type-function helpers for common flag shapes. Import only what you need.

```ts
import {
    oneOf, commaList, integer, float, range, url
} from 'cleye/formats'

cli({
    flags: {
        format: { type: oneOf('json', 'yaml', 'csv') }, // => 'json' | 'yaml' | 'csv'
        tags: { type: commaList(String) }, // => string[]
        port: { type: range(1024, 65_535) }, // => number, validated in range
        count: { type: integer() }, // => number (integer only)
        ratio: { type: float() }, // => number (finite float)
        apiUrl: { type: url() } // => URL object
    }
})
```

| Helper | Return type | Description |
|--------|-------------|-------------|
| `oneOf(...values)` | Union of the given string literals | Throws if the value is not in the list. |
| `commaList(itemType)` | `T[]` | Splits on `,`, trims whitespace, maps each item through `itemType`. |
| `integer()` | `number` | Parses a base-10 integer. Throws on floats or non-numeric input. |
| `float()` | `number` | Parses a finite float. Throws on non-finite or non-numeric input. |
| `range(min, max)` | `(input: string) => number` | Returns a parser that validates the input parses to a number in `[min, max]`. |
| `url()` | `URL` | Parses with `new URL()`. Returns a `URL` object so callers get `.host`, `.pathname`, etc. |

### Default flags
By default, _Cleye_ will try to handle the `--help, -h` and `--version` flags.

#### Help flag
Handling `--help, -h` is enabled by default.

To disable it, set `help` to `false`. The help documentation can still be manually displayed by calling `.showHelp(helpOptions)` on the returned object.

#### Version flag
To enable handling `--version`, specify the `version` property.

```ts
await cli({
    version: '1.2.3'
})
```

```sh
$ my-script --version
1.2.3
```

The version is also shown in the help documentation. To opt out of handling `--version` while still showing the version in `--help`, pass the version into `help.version`.

> [!TIP]
> Import `name`, `version`, and `description` directly from `package.json` to avoid keeping them in sync manually:
> ```ts
> import { name, version, description } from './package.json' with { type: 'json' }
>
> cli({
>     name,
>     version,
>     help: { description }
> })
> ```

### Strict flags
To reject unknown flags with an error, enable `strictFlags`:

```ts
await cli({
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

## Arguments
Arguments are values passed into the script that are not associated with any flags/options.

For example, in the following command, the first argument is `file-a.txt` and the second is `file-b.txt`:

```
$ my-script file-a.txt file-b.txt
```

Arguments can be accessed from the `_` array-property of the returned object.

Example:

```ts
await cli({ /* ... */ }, (argv) => {
    // $ my-script file-a.txt file-b.txt

    argv._ // => ["file-a.txt", "file-b.txt"] (string[])
})
```

### Parameters
Parameters (aka _positional arguments_) are the names that map against argument values. Think of parameters as variable names and arguments as values associated with the variables.

Parameters can be defined in the `parameters` array-property to make specific arguments accessible by name. This is useful for writing more readable code, enforcing validation, and generating help documentation.

Parameters are defined in the following formats:
- **Required parameters** are indicated by angle brackets (eg. `<parameter name>`).
- **Optional parameters** are indicated by square brackets (eg. `[parameter name]`).
- **Spread parameters** are indicated by `...` suffix. Required spread (`<files...>`) needs at least one value; optional spread (`[files...]`) accepts zero or more.

Note, required parameters cannot come after optional parameters, and spread parameters must be last.

Parameters can be accessed in camelCase on the `_` property of the returned object.

Example:

```ts
await cli({
    parameters: [
        '<required parameter>',
        '[optional parameter]',
        '[optional spread...]'
    ]
}, (argv) => {
    // $ my-script a b c d

    argv._.requiredParameter // => "a" (string)
    argv._.optionalParameter // => "b" (string | undefined)
    argv._.optionalSpread // => ["c", "d"] (string[])
})
```

### End-of-flags
End-of-flags (`--`) (aka _end-of-options_) allows users to pass in a subset of arguments. This is useful for passing in arguments that should be parsed separately from the rest of the arguments or passing in arguments that look like flags.

An example of this is [`npm run`](https://docs.npmjs.com/cli/v8/commands/npm-run-script):
```sh
$ npm run <script> -- <script arguments>
```
The `--` indicates that all arguments afterwards should be passed into the _script_ rather than _npm_.

All end-of-flag arguments will be accessible from `argv._['--']`.

Additionally, you can specify `--` in the `parameters` array to parse end-of-flags arguments.

Example:

```ts
await cli({
    name: 'npm-run',
    parameters: [
        '<script>',
        '--',
        '[arguments...]'
    ]
}, (argv) => {
    // $ npm-run echo -- hello world

    argv._.script // => "echo" (string)
    argv._.arguments // => ["hello", "world"] (string[])
})
```

## Commands

Commands let you organize a CLI into subcommands — like `npm install` or `git remote add`. Each command is its own `cli()` call, and commands can nest indefinitely (`git remote add` is three levels deep).

Every level can have its own flags and callback. Callbacks act as **middleware**: the parent's callback always runs first, and the matched command executes after it. This means each level gets a chance to parse its own flags, run setup logic, and pass data down before handing off to the child.

```sh
$ my-cli --verbose install lodash --save-dev
```

Here's the execution flow:

1. **Parent parses its flags** — `--verbose` is parsed. Parsing stops at the command name `install`.
2. **Parent callback runs** — receives `argv.flags.verbose` and `argv.command === 'install'`.
3. **Command executes** — `install`'s file is loaded, calling its own `cli()` to parse `lodash --save-dev`.

Everything before the command name belongs to the parent. Everything after belongs to the child:

```sh
$ my-cli --verbose install lodash --save-dev
#        ^^^^^^^^^                ^^^^^^^^^^
#        parent flag              child flags
```

If no callback is provided, step 2 is skipped and the command runs immediately. If no command matches, help is shown.

> [!NOTE]
> If a CLI has both commands and parameters, command names take priority. An argument matching a command name will trigger the command instead of being parsed as a parameter value. In practice, this is rarely an issue — parent commands typically only have flags, not parameters.

### Defining commands

Commands are defined as a map in the `commands` option:

```ts
await cli({
    name: 'my-cli',
    version: '1.0.0',

    commands: {
        // Shorthand: just a function (no metadata for --help)
        build: () => import('./commands/build.ts'),

        // Full form: metadata for --help + handler
        install: {
            description: 'Install a package',
            alias: 'i',
            loader: () => import('./commands/install.ts')
        }
    }
}, async (argv) => {
    // argv: parsed flags/params for this level
    // if a command is matched, it runs after this callback
})
```

### Explicit `runCommand`

By default, the matched command runs automatically after the callback. To take full control — run code before and after, [pass data](#passing-data-to-commands), or catch errors — call `runCommand` explicitly. When you do, auto-invocation is skipped:

```ts
await cli({
    commands: {
        deploy: () => import('./commands/deploy.ts')
    }
}, async ({ runCommand }) => {
    const config = await loadConfig()

    try {
        await runCommand({ config })
        console.log('Deploy succeeded')
    } catch (error) {
        console.error('Deploy failed:', error.message)
        process.exit(1)
    }
})
```

`runCommand` is idempotent — calling it multiple times returns the same Promise. See [Passing data to commands](#passing-data-to-commands) for how the child receives the argument.

### Command files

#### Side-effect style
For dynamic imports.

The file runs `cli()` at the top level. When dynamically imported, ESM evaluates the module which runs the command:

```ts
// commands/install.ts
import { cli } from 'cleye'

await cli({
    parameters: ['<package>'],
    flags: { saveDev: Boolean }
}, (argv) => {
    console.log(argv._.package, argv.flags.saveDev)
})
```

The command name is inherited from the parent's command key (`install`) via `AsyncLocalStorage`. Each command file also works standalone — run it directly with `node commands/install.ts` and set `name` explicitly if needed.

#### Exported function style
For static imports.

```ts
// commands/install.ts
import { cli } from 'cleye'

export default () => cli({
    parameters: ['<package>'],
    flags: { saveDev: Boolean }
}, (argv) => {
    console.log(argv._.package, argv.flags.saveDev)
})
```

Use with static imports in the parent:

```ts
import installHandler from './commands/install.ts'

await cli({
    commands: {
        install: installHandler
    }
})
```

### Passing data to commands

Pass data to a command by calling `runCommand(data)`. The command file exports a function that receives it:

```ts
// cli.ts (parent)
await cli({
    commands: {
        deploy: () => import('./commands/deploy.ts')
    }
}, async ({ runCommand }) => {
    const config = await loadConfig()
    await runCommand({ config })
})
```

```ts
// commands/deploy.ts (child)
import { cli } from 'cleye'

type Context = { config: Config }

export default ({ config }: Context) => cli({
    parameters: ['<target>']
}, (argv) => {
    console.log(`Deploying ${argv._.target}`, config)
})
```

The argument is passed directly to the command's exported function — fully typed, no casting. If the command doesn't export a default function (side-effect style), the argument is ignored and `runCommand()` simply triggers the import.

### Nested commands

Since each command is its own `cli()` call, there's no limit to how deep commands can nest. Each level parses its own flags, runs its own callback as middleware, and passes the remaining argv to the next level. For example, `npm config get` is three levels deep:

```ts
// cli.ts
await cli({
    name: 'npm',
    commands: {
        config: () => import('./commands/config.ts')
    }
}, async (argv) => {
    // Runs before the matched command (e.g. load shared state)
})
```

```ts
// commands/config.ts
await cli({
    commands: {
        get: () => import('./commands/config-get.ts'),
        set: () => import('./commands/config-set.ts')
    }
}, async (argv) => {
    // Runs before get/set (e.g. load config file)
})
```

```ts
// commands/config-get.ts
await cli({
    parameters: ['<key>']
}, (argv) => {
    console.log(`Getting "${argv._.key}"`)
})
```

```sh
$ npm config get registry
Getting "registry"
```

### Option inheritance

`strictFlags` and `booleanFlagNegation` automatically inherit from parent to child through all nesting levels. A child can override any inherited option:

```ts
// Parent enables strictFlags for all commands
await cli({
    strictFlags: true,
    commands: {
        // This command disables strictFlags for itself
        build: () => import('./commands/build.ts')
    }
})
```

```ts
// commands/build.ts — overrides parent
await cli({
    strictFlags: false, // Override parent's strictFlags
    flags: { watch: Boolean }
})
```

## Help documentation
_Cleye_ uses all information provided to generate rich help documentation. The more information you give, the better the docs!

### Help customization

_Cleye_'s default help output is built by composing atoms — small rendering units exported from `cleye/help`. To customize the output, pass a `render(options, { form }) => string` function to `help.render`. You can either tweak the default output or build your own layout from atoms.

#### Tweak the default

The most common need is to append content or prepend a header. Import `defaultHelp` and delegate to it:

```ts
import { cli } from 'cleye'
import { defaultHelp } from 'cleye/help'

await cli({
    name: 'mycli',
    flags: { verbose: Boolean },
    help: {
        render: (options, { form }) => {
            const base = defaultHelp(options, { form })
            return `${base}\n\nMore at https://example.com/docs`
        }
    }
})
```

#### Fully custom layout

Build the output entirely from atoms imported from `cleye/help`:

```ts
import { cli } from 'cleye'
import {
    render, p, usage, section, flags, footer
} from 'cleye/help'

await cli({
    name: 'mycli',
    flags: { verbose: Boolean },
    help: {
        render: options => render(
            p('Custom CLI description.'),
            usage(options.name ?? 'mycli', '[flags...]'),
            section('Options', flags([
                {
                    long: 'verbose',
                    description: 'Enable verbose logging'
                }
            ])),
            footer('https://example.com/docs')
        )
    }
})
```

#### Force a specific flag layout

`flags()` chooses inline or hanging layout based on terminal width. To force one layout regardless of width, use `flagsInline` or `flagsHanging` directly:

```ts
import { cli } from 'cleye'
import { render, section, flagsHanging } from 'cleye/help'

await cli({
    name: 'mycli',
    flags: { verbose: Boolean },
    help: {
        render: options => render(
            section('Options', flagsHanging([
                {
                    long: 'verbose',
                    description: 'Enable verbose logging'
                }
            ]))
        )
    }
})
```

#### Available atoms (`cleye/help`)

| Atom | Signature | Description |
| - | - | - |
| `p` | `p(text)` | Paragraph; wraps to terminal width |
| `usage` | `usage(name, pattern)` | Styled `Usage: name pattern` line |
| `section` | `section(title, ...body)` | Bold heading followed by body nodes |
| `cmds` | `cmds(commands)` | Two-column command table |
| `flags` | `flags(list)` | Auto-responsive flag table |
| `flagsInline` | `flagsInline(list)` | Flag table, inline layout |
| `flagsHanging` | `flagsHanging(list)` | Flag table, hanging layout |
| `footer` | `footer(text)` | Literal trailing text |
| `render` | `render(...nodes)` | Joins nodes with a blank line |
| `defaultHelp` | `defaultHelp(options, { form? })` | Renders the standard help document |

## API

### cli(options, callback?, argv?)

Returns: `Promise<CallbackReturn>` — resolves to whatever the callback returns. Without a callback, resolves to `undefined`. Pass `(parsed) => parsed` to get `ParsedArgv` back.

Function to parse argv by declaring parameters, flags, and commands.

#### `ParsedArgv` shape (the callback's first argument)

```ts
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

    // Matched command name, or undefined
    command: string | undefined

    // Trigger the matched command. Always defined — when no command matched,
    // it is a callable noop that resolves to `undefined`.
    // Idempotent — repeated calls return the same Promise.
    // Pass an argument to forward to the command's exported function.
    runCommand: (argument?: unknown) => Promise<unknown>

    // Method to print version
    showVersion: () => void

    // Method to print help (pass HelpOptions to override content)
    showHelp: (options?: HelpOptions) => void
}
```

#### options

| Property | Type | Description |
| - | - | - |
| `name` | `string` | Script name for `--help` output. |
| `version` | `string` | Enables `--version` flag and shown in `--help`. Pass via `help.version` to show in help only. |
| `parameters` | `string[]` | Positional argument definitions. Formats: `<required>`, `[optional]`, `<spread...>`, `[spread...]`. |
| `flags` | `Flags` | Flag definitions. See [Defining flags](#defining-flags). |
| `commands` | `Record<string, CommandEntry>` | Command definitions. See [Defining commands](#defining-commands). |
| `help` | `false \| HelpOptions` | Help configuration or `false` to disable `--help`. See [help options](#help-1). |
| `ignoreArgv` | `IgnoreArgvCallback` | Callback to skip certain argv tokens from parsing. |
| `strictFlags` | `boolean` | Error on unknown flags with typo suggestions. Inherited by commands. |
| `booleanFlagNegation` | `boolean` | Enable `--no-<flag>` for boolean flags. Inherited by commands. |

##### flags

An object mapping flag names (in camelCase) to a type function or descriptor:

| Property | Type | Description |
| - | - | - |
| `type` | `Function` | Flag value parsing function. |
| `alias` | `string` | Single character alias for the flag. |
| `default` | `any` | Default value for the flag. |
| `description` | `string` | Description shown in `--help`. |
| `placeholder` | `string` | Placeholder for the flag value shown in `--help`. |

##### commands

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

##### help

| Property | Type | Description |
| - | - | - |
| `version` | `string` | Version shown in `--help` without enabling `--version` flag. |
| `description` | `string` | Description shown in `--help`. |
| `usage` | `string \| string[] \| false` | Usage examples. `false` disables auto-generated usage. |
| `examples` | `string \| string[]` | Example code snippets shown in `--help`. |
| `render` | `(nodes, renderers) => string` | Function to customize the help document. |

#### callback(parsed)

Optional callback invoked after parsing. The `cli()` Promise resolves to whatever this callback returns.

`parsed` is the `ParsedArgv` shape above — including `runCommand` as a property. Destructure to access it: `({ runCommand, flags, _ }) => { ... }`.

If the callback doesn't call `runCommand`, cleye auto-invokes the matched command after the callback returns. The auto-invoke's return value is discarded — call `runCommand()` yourself to capture it.

#### argv

Type: `string[]`

Default: `process.argv.slice(2)`

The raw parameters array to parse.

### Type exports

```ts
import type {
    CliOptions,
    CommandEntry,
    Commands,
    Flags,
    HelpDocumentNode,
    HelpOptions,
    ParsedArgv,
    Renderers,
    TypeFlag
} from 'cleye'
```

## Sponsors
<p align="center">
	<a href="https://github.com/sponsors/privatenumber">
		<img src="https://cdn.jsdelivr.net/gh/privatenumber/sponsors/sponsorkit/sponsors.svg">
	</a>
</p>
