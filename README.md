
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
- Per-command type narrowing on `runCommand` — handler args & return values flow through
- Nested command support
- Middleware-style callbacks with data passing — _or_ flat sync style for top-level use
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

## Agent Skills
_Cleye_ ships with a bundled [agent skill](https://agentskills.io) for AI coding assistants that use the package's `skills/` directory.

Projects using [`skills-npm`](https://github.com/antfu/skills-npm) can discover the skill from installed dependencies and link it into supported agent setups.

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
> The callback runs after argv is parsed. The Promise returned by `cli()` resolves to whatever the callback returns. See [Sync mode](#sync-mode-no-callback) for the alternative no-callback API.

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

Usage: greet.js [flags...] <first name> [last name]

Flags:
  -h, --help           Show help (-h for short form)
      --time <string>  Time of day to greet (morning or evening) (default: "morning")
```

Run the script to see it in action:

```sh
$ node greet.js John Doe --time evening

Good evening John Doe!
```

### Examples
Browse [`examples/`](/examples) for a numbered, progressive set — start with [`01-greet`](/examples/01-greet/index.ts) and follow the order; each step adds one concept. See [`examples/README.md`](/examples/README.md) for the roadmap.

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

### Required flags
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
        format: { type: oneOf(['json', 'yaml', 'csv']) }, // => 'json' | 'yaml' | 'csv'
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
| `oneOf(values)` | Union of the given string literals | Throws if the value is not in the list. Accepts an array (e.g. `oneOf(['a', 'b'])` or `oneOf(myConstArray)`). |
| `commaList(itemType)` | `T[]` | Splits on `,`, trims whitespace, maps each item through `itemType`. |
| `integer()` | `number` | Parses a base-10 integer. Throws on floats or non-numeric input. |
| `float()` | `number` | Parses a finite float. Throws on non-finite or non-numeric input. |
| `range(min, max)` | `(input: string) => number` | Returns a parser that validates the input parses to a number in `[min, max]`. |
| `url()` | `URL` | Parses with `new URL()`. Returns a `URL` object so callers get `.host`, `.pathname`, etc. |

### Default flags
By default, _Cleye_ will try to handle the `--help`, `-h`, and `--version` flags.

#### Help flags
Handling `--help` and `-h` is enabled by default.

- `--help` shows the full help output.
- `-h` shows short help output.

To disable both auto-injected help flags, set `help` to `false`. The help documentation can still be manually displayed by calling `.showHelp(helpOptions)` on the returned object.

If you define your own `help` or `h` flag, or use either name as another flag's alias, _Cleye_ will not auto-inject that name. User-defined flags always take precedence.

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

### Strict commands
To reject unknown command names with an error, enable `strictCommands`:

```ts
await cli({
    commands: {
        build: () => import('./commands/build.ts'),
        test: () => import('./commands/test.ts')
    },
    strictCommands: true
})
```

```sh
$ my-script biuld
Error: Unknown command: "biuld". (Did you mean "build"?)
```

When enabled, the CLI exits with an error if the leading positional doesn't match a registered command name or alias. Closest matches within 2 edits are suggested. Without `strictCommands`, an unknown command falls through to the default help-on-no-match behavior.

### Embedding cleye in a host process (`throwOnExit`)
By default, cleye calls `process.exit` on `--help`, `--version`, missing required parameters, `strictFlags`, `strictCommands`, and the sync no-command-match path. If you're embedding cleye inside a larger program (a wrapper script, a long-running service, a test harness) and don't want it to terminate the host process, set `throwOnExit: true` and catch `CleyeExit`:

```ts
import { cli, CleyeExit } from 'cleye'

try {
    await cli({
        throwOnExit: true,
        commands: { build: () => import('./commands/build.ts') }
    })
} catch (error) {
    if (error instanceof CleyeExit) {
        // error.code: 0 for --help / --version, 1 for validation failures
        // error.reason: 'help' | 'version' | 'missing-required-parameter' |
        //               'unknown-flag' | 'unknown-command' | 'no-command-match'
        if (error.code !== 0) {
            console.error('cli failed:', error.reason)
        }
        return
    }
    throw error
}
```

cleye throws `CleyeExit` from the actual exit point (e.g. the line that resolves the unknown command), so stack traces point directly at the source. Inheritance is automatic via try/catch propagation — nesting works without any special wiring.

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

Note, required parameters cannot come after optional parameters, and spread parameters must be last. Names must contain at least one alphanumeric character (after camelCase normalization).

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

If no callback is provided, step 2 is skipped and you must call await argv.runCommand() explicitly. If no command matches, help is shown (or an error if [strictCommands](#strict-commands) is enabled).

> [!IMPORTANT]
> `parameters` and `commands` are mutually exclusive at the same level. The leading positional token can be a command name OR a parameter value, never both — there's no way to disambiguate without violating fail-fast (a typo in a command name would silently become a parameter value). cleye enforces this at the type level and throws at runtime if both are passed.
>
> **To accept arbitrary command names** (a script runner, a router, anything dynamic), keep `commands` defined and check for unknown commands in your callback:
>
> ```ts
> cli({
>     commands: {
>         build: () => { /* known */ }
>     }
> }, (parsed) => {
>     if (parsed.command === undefined && parsed._[0]) {
>         // wildcard dispatch — `parsed._[0]` is the unknown command name,
>         // `parsed._.slice(1)` are its remaining args
>     }
> })
> ```

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

> [!TIP]
> **Put each command in its own file.** Use the `loader: () => import('./commands/<name>.ts')` pattern even for trivial handlers. It keeps the parent CLI declarative and lazy-loads each subcommand's code only when invoked — flag parsing for `cli --help` doesn't pay the cost of loading every command's dependencies. This is the canonical pattern; see [`examples/04-npm`](/examples/04-npm) for a multi-command setup.

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
        await runCommand(config)
        console.log('Deploy succeeded')
    } catch (error) {
        console.error('Deploy failed:', error.message)
        process.exit(1)
    }
})
```

`runCommand` invokes the matched command each time you call it, using the arguments from that call. Store the returned value or Promise yourself if you need to reuse a result. Its return type mirrors the matched handler: synchronous handlers return their value directly, async handlers (and the `loader: () => import(...)` pattern) return a Promise. See [Passing data to commands](#passing-data-to-commands) for how the child receives the argument.

### Command files

#### Side-effect style — the default for dynamic imports

When the parent uses `loader: () => import('./commands/install.ts')` and isn't passing data down, the simplest pattern is to call `cli()` at the top of the command file. The dynamic import evaluates the module, which runs the command:

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

The command name is inherited from the parent's command key (`install`) via `AsyncLocalStorage`.

> [!TIP]
> **Side-effect command files double as standalone scripts.** Because the file runs `cli()` at the top level, you can invoke it directly during development:
>
> ```sh
> node ./commands/install.ts lodash --save-dev
> ```
>
> No need to re-route through the parent CLI just to test one command. Set the command file's `name` option if you want a friendly `--help` header when running standalone.

#### Default-export style — when passing data via `runCommand`

When the parent calls `runCommand(data)` to pass data down (or you're using static imports), export a function instead. The function receives the data and is invoked by `runCommand`:

```ts
// commands/install.ts
import { cli } from 'cleye'

export default (config: Config) => cli({
    parameters: ['<package>'],
    flags: { saveDev: Boolean }
}, (argv) => {
    console.log(config, argv._.package, argv.flags.saveDev)
})
```

Default-export handlers run every time `runCommand(...)` is called, so this is the right style when parent code may retry or invoke a command with different data. Side-effect command files still follow JavaScript module caching: a second dynamic import of the same file does not re-run its top-level `cli()` call.

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
    await runCommand(config)
})
```

```ts
// commands/deploy.ts (child)
import { cli } from 'cleye'

export default (config: Config) => cli({
    parameters: ['<target>']
}, (argv) => {
    console.log(`Deploying ${argv._.target}`, config)
})
```

The argument is passed directly to the command's exported function — fully typed, no casting. If the command doesn't export a default function (side-effect style), the argument is ignored and `runCommand()` simply triggers the import.

#### Per-command type narrowing

`runCommand` is typed by the matched command. Inside the callback, narrowing on `parsed.command` unlocks the matched handler's argument and return types:

```ts
await cli({
    commands: {
        ping: () => 'pong' as const,
        connect: (host: string) => ({
            host,
            connected: true
        })
    }
}, async (parsed) => {
    if (parsed.command === 'ping') {
        const result = await parsed.runCommand()
        //    ^? 'pong'
    }

    if (parsed.command === 'connect') {
        const result = await parsed.runCommand('localhost')
        //    ^? { host: string; connected: boolean }

        // Compile error — `connect` requires a string
        // await parsed.runCommand(123)
    }
})
```

For lazy loaders (`loader: () => import('./cmd.ts')`), the type unwraps to the module's `default` export's signature so the imported handler's types flow through automatically:

```ts
// commands/deploy.ts
export default (region: string) => cli({ /* ... */ })

// cli.ts
await cli({
    commands: {
        deploy: { loader: () => import('./commands/deploy.ts') }
    }
}, async (parsed) => {
    if (parsed.command === 'deploy') {
        await parsed.runCommand('us-east-1')
        //                      ^? typed from deploy.ts's default export
    }
})
```

When no command matched, `parsed.runCommand` is a sync no-op typed as `() => undefined`.

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

`strictFlags`, `strictCommands`, `booleanFlagNegation`, and `throwOnExit` automatically inherit from parent to child through all nesting levels. A child can override any inherited option:

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

## Sync mode (no callback)

The callback API is the recommended default for command-heavy CLIs — it auto-invokes matched commands, makes nested middleware natural, and is usually the shorter form. `cli()` also supports a **sync mode** for cases that don't need any of that: simple flag/parameter parsers, scripts that pass argv around without async coloring, or top-level code that prefers reading top-to-bottom over a callback indirection.

When called **without a callback**, `cli()` parses synchronously and returns `ParsedArgv` directly:

```ts
import { cli } from 'cleye'

const argv = cli({
    name: 'greet',
    parameters: ['<name>'],
    flags: {
        loud: Boolean
    }
})

// argv is ParsedArgv synchronously — no await
const greeting = `hello ${argv._.name}`
console.log(argv.flags.loud ? greeting.toUpperCase() : greeting)
```

> [!IMPORTANT]
> Sync mode trades the callback's auto-invoke convenience for a flatter call surface. **You must call `argv.runCommand()` yourself** when you have commands. Help/version flags still exit synchronously via `process.exit`.

### When to use which

| | Callback (default) | Sync mode |
| - | - | - |
| Return type | `Promise<CallbackReturn>` | `ParsedArgv` (synchronous) |
| Matched command | Auto-invoked after callback | **Caller must invoke** |
| Style | Middleware — async composition | Linear top-level code |
| Top-level await needed | Yes (or `.then()`) | No (until `runCommand`) |
| Errors | Sync throw OR rejected Promise | Sync throw |

For **command-heavy CLIs** the callback form is usually shorter and safer — auto-invoke handles the common case, and unhandled errors surface naturally through the awaited Promise. Reach for sync mode when you genuinely need direct argv access without async coloring (e.g., parsing in a sync helper).

### Sync mode with commands

When commands are involved, sync mode requires explicit `runCommand()`. Wrap the whole script in an IIFE so the `await` is contained:

```ts
import { cli } from 'cleye'

(async () => {
    const argv = cli({
        name: 'npm',
        commands: {
            install: () => import('./commands/install.ts'),
            'run-script': () => import('./commands/run-script.ts')
        }
    })

    await argv.runCommand()
})().catch((error) => {
    console.error(error)
    process.exit(1)
})
```

Compare to the callback equivalent:

```ts
await cli({
    name: 'npm',
    commands: {
        install: () => import('./commands/install.ts'),
        'run-script': () => import('./commands/run-script.ts')
    }
}, async (argv) => {
    // commands auto-invoke after this callback returns
})
```

The two styles are functionally equivalent. Note the IIFE form is **two extra lines and one extra `.catch()`** — the callback form is usually shorter for command-heavy CLIs.

> [!WARNING]
> If you forget the `.catch()` on the IIFE, an error from `runCommand()` becomes an unhandled rejection. The callback form has the same risk if you don't `await` or chain `.catch()` on the outer `cli()` Promise — but `await` makes the failure mode obvious. Always handle rejections explicitly in sync mode.

### Returning values from sync mode

Because sync mode returns `ParsedArgv` directly, you can hand it off to other code without an `await`:

```ts
function parseArgs() {
    return cli({
        flags: {
            port: Number,
            host: String
        }
    })
}

// elsewhere — no async coloring required
const argv = parseArgs()
startServer(argv.flags.host ?? 'localhost', argv.flags.port ?? 3000)
```

### Errors in sync mode

Parse-time errors (invalid parameters, invalid flag aliases, duplicate aliases, missing required parameters) throw synchronously. Wrap with `try/catch` if you want to handle them:

```ts
try {
    const argv = cli({
        parameters: ['<required>']
    })
} catch (error) {
    console.error('Failed to parse:', error.message)
    process.exit(1)
}
```

Errors inside commands invoked via `runCommand()` reject the returned Promise — handle them on the IIFE's `.catch()` (see the npm example above) or with a `try/catch` around the `await runCommand()` call.

---

## Help documentation
_Cleye_ uses all information provided to generate rich help documentation. The more information you give, the better the docs!

### Help customization

_Cleye_'s default help output is built by composing components — small rendering units exported from `cleye/help`. To customize the output, pass a `help.render` function that returns an array of components (cleye joins them with blank lines). A single component or a pre-rendered string also work.

#### Tweak the default

The most common need is to append content or prepend a header. `defaultHelp` returns an array of components — spread it and add your own:

```ts
import { cli } from 'cleye'
import { defaultHelp, footer } from 'cleye/help'

await cli({
    name: 'mycli',
    flags: { verbose: Boolean },
    help: {
        render: (options, { form }) => [
            ...defaultHelp(options, { form }),
            footer('More at https://example.com/docs')
        ]
    }
})
```

#### Fully custom layout

Build the output entirely from components imported from `cleye/help`:

```ts
import { cli } from 'cleye'
import {
    p, usage, section, flags, footer
} from 'cleye/help'

await cli({
    name: 'mycli',
    flags: { verbose: Boolean },
    help: {
        render: options => [
            p('Custom CLI description.'),
            usage(options.name ?? 'mycli', '[flags...]'),
            section('Options', flags([
                {
                    long: 'verbose',
                    description: 'Enable verbose logging'
                }
            ])),
            footer('https://example.com/docs')
        ]
    }
})
```

#### Force a specific flag layout

`flags()` chooses inline or hanging layout based on terminal width. To force one layout regardless of width, use `flagsInline` or `flagsHanging` directly:

```ts
import { cli } from 'cleye'
import { section, flagsHanging } from 'cleye/help'

await cli({
    name: 'mycli',
    flags: { verbose: Boolean },
    help: {
        render: () => section('Options', flagsHanging([
            {
                long: 'verbose',
                description: 'Enable verbose logging'
            }
        ]))
    }
})
```

#### Available components (`cleye/help`)

| Component | Signature | Description |
| - | - | - |
| `p` | `p(text)` | Paragraph; wraps to terminal width |
| `usage` | `usage(name, pattern)` | Styled `Usage: name pattern` line |
| `section` | `section(title, ...body)` | Bold heading followed by body nodes |
| `cmds` | `cmds(commands)` | Two-column command table |
| `flags` | `flags(list)` | Auto-responsive flag table |
| `flagsInline` | `flagsInline(list)` | Flag table, inline layout |
| `flagsHanging` | `flagsHanging(list)` | Flag table, hanging layout |
| `footer` | `footer(text)` | Literal trailing text |
| `render` | `render(...nodes)` | Joins nodes into a string. cleye does this for you when `help.render` returns components; export is for testing or manual rendering. |
| `defaultHelp` | `defaultHelp(options, { form? })` | Returns the default help document as a component array — spread it to extend |

## API

### cli(options, callback?, argv?)

Returns:
- `ParsedArgv` (sync) when no callback is passed.
- `Promise<CallbackReturn>` when a callback is passed — resolves to whatever the callback returns.

In sync mode, matched commands are not auto-invoked. Call `await argv.runCommand()` yourself if you have commands.

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
| `strictCommands` | `boolean` | Error on unknown commands with typo suggestions. Inherited by commands. |
| `booleanFlagNegation` | `boolean` | Enable `--no-<flag>` for boolean flags. Inherited by commands. |
| `throwOnExit` | `boolean` | Throw `CleyeExit` instead of calling `process.exit`. For embedding cleye in a host process. Inherited by commands. |

##### flags

An object mapping flag names (in camelCase) to a type function or descriptor:

| Property | Type | Description |
| - | - | - |
| `type` | `Function` | Flag value parsing function. |
| `alias` | `string` | Non-empty single-character alias for the flag. Not allowed on single-character flag names. |
| `default` | `any \| { value: any, description: string }` | Default value for the flag. Use `{ value, description }` to show explicit help text for computed defaults without executing them while rendering help. |
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
| `render` | `HelpRenderer` (`(options, { form }) => string \| Node \| Node[]`) | Function to customize the help document. |

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
    DescribedDefault,
    ExitReason,
    Flags,
    HelpOptions,
    HelpRenderer,
    ParsedArgv
} from 'cleye'

import type {
    Flag,
    Node
} from 'cleye/help'
```

## Sponsors
<p align="center">
	<a href="https://github.com/sponsors/privatenumber">
		<img src="https://cdn.jsdelivr.net/gh/privatenumber/sponsors/sponsorkit/sponsors.svg">
	</a>
</p>
