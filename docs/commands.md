# Commands

Commands let you organize a CLI into subcommands — like `npm install` or `git remote add`. Each command is its own `cli()` call, and commands can nest indefinitely (`git remote add` is three levels deep).

Every level can have its own flags and callback. Callbacks act as **middleware**: the parent's callback always runs first, and the matched command executes after it. This means each level gets a chance to parse its own flags, run setup logic, and pass data down before handing off to the child.

```sh
$ my-cli --verbose install lodash --save-dev
```

Here's the execution flow:

1. **Parent parses its flags** — `--verbose` is parsed. Parsing stops at the command name `install`.
2. **Parent callback runs** — receives `argv.flags.verbose` and `argv.command === 'install'`.
3. **Command executes** — `install`'s file is loaded, calling its own `cli()` to parse `lodash --save-dev`.

Everything before the command name belongs to the parent. Everything after belongs to the child — each level's own `cli()` parses only its slice:

```
my-cli --verbose install lodash --save-dev

my-cli (parent)
│  argv.flags   = { verbose: true }
│  argv.command = 'install'
│
└─ install (subcommand)
   argv._     = ['lodash']
   argv.flags = { saveDev: true }
```

If no callback is provided ([sync mode](./sync-mode.md#when-to-use-which)), step 2 is skipped and you must call `await argv.runCommand()` explicitly. If no command matches, help is shown (or an error if [strictCommands](#strict-commands) is enabled).

> [!WARNING]
> **A flag is owned by the level adjacent to the command name.** Tokens before the command name are parsed by the parent; tokens after, by the matched subcommand. So `my-cli --json install` gives `--json` to the parent, and `install` never sees it. Conversely, `my-cli install --json` gives it to `install`, and the parent never sees it. Whichever level didn't declare the flag collects it into `unknownFlags` and ignores it, or rejects it as a typo under [`strictFlags`](./flags.md#strict-flags). So a flag that should work on *either* side of the command has to be declared at both levels, with the parent forwarding its value so the child can fall back to it (see [Layered flags](#layered-flags)).

> [!TIP]
> `parameters` and `commands` can be used together. If the first positional token matches a registered command, it resolves as that command. If it doesn't match any command, it falls back to being parsed as a parameter.
>
> This is useful for building hybrid CLIs with a default fallback mode, like a script runner:
>
> ```ts
> cli({
>     parameters: ['[script]'],
>     commands: {
>         install: () => { /* known */ }
>     }
> }, (parsed) => {
>     if (parsed.command === undefined && parsed._.script) {
>         // `parsed._.script` is the fallback script name
>     }
> })
> ```
>
> When `parameters` and `commands` are declared together, cleye throws at config time on two conflicts:
>
> - **Required parameters** (`<...>`) — when a command matches, parameter validation is bypassed, so a "required" parameter would only be enforced in the fallback path. Use `[...]` (optional) instead.
> - **`strictCommands: true`** — strict-mode says "unknown positional is a typo, error and suggest"; parameters says "unknown positional is a value, absorb it." Pick one.
>
> Flags follow the same split. The fallback path's flags are declared on the parent, so a flag placed before a subcommand is consumed by the parent, not the command. If a subcommand needs that flag too, forward it down (see [Layered flags](#layered-flags)).

## Defining commands

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
> **Put each command in its own file.** Use the `loader: () => import('./commands/<name>.ts')` pattern even for trivial handlers. It keeps the parent CLI declarative and lazy-loads each subcommand's code only when invoked — flag parsing for `cli --help` doesn't pay the cost of loading every command's dependencies. This is the canonical pattern; see [`examples/05-npm`](../examples/05-npm) for a multi-command setup.

## Explicit `runCommand`

By default, the matched command runs automatically after the callback. To take full control — run code before and after, [pass data](#passing-data-down-to-subcommands), or catch errors — call `runCommand` explicitly. When you do, auto-invocation is skipped:

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

`runCommand` invokes the matched command each time you call it, using the arguments from that call. Store the returned value or Promise yourself if you need to reuse a result. Its return type mirrors the matched handler: synchronous handlers return their value directly, async handlers (and the `loader: () => import(...)` pattern) return a Promise. See [Passing data down to subcommands](#passing-data-down-to-subcommands) for how the child receives the argument.

## Command files

A command file is loaded through the `loader: () => import('./commands/<name>.ts')` you registered. cleye runs that module for you, inside the context it set up for the matched command — the argv after the command name and the inherited options are already in scope, so the file's top-level `cli()` reads them automatically.

So a command file **does not need to be a function**. cleye already executes it, in the right context; there is nothing to hand in. Wrap it in an exported function *only* when the parent passes it data via `runCommand(data)` — the function's parameter is that data.

This is deliberate. The form you write is a signal:

- A plain top-level `cli()` is a **self-contained command**.
- An exported function says **"I receive data from the parent."**

You opt into that parent-child coupling through syntax, and only when you need it. Simple commands stay simple and lean, and the function form marks exactly the commands that participate in data flow.

### Side-effect style — the default for dynamic imports

With no data to receive, call `cli()` at the top of the file. cleye runs the module when the command matches, and the top-level `cli()` parses the argv after the command name:

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

The command name is automatically inherited from the parent's command key (`install`). You don't need to set `name` on a subcommand — and doing so has no effect on its default `--help`, which always shows the full command path (the exception is running the file standalone; see the tip below).

Side-effect command files cannot receive forwarded data: the dynamic import runs the file, but nothing passes it an argument. If the parent forwards parent flags or config via `runCommand(data)`, use the default-export style below instead.

> [!TIP]
> **Side-effect command files double as standalone scripts.** Because the file runs `cli()` at the top level, you can invoke it directly during development:
>
> ```sh
> node ./commands/install.ts lodash --save-dev
> ```
>
> No need to re-route through the parent CLI just to test one command. Set the command file's `name` option if you want a friendly `--help` header when running standalone.

### Default-export style — when passing data via `runCommand`

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

## Command file layout

Default to a flat file per command:

```
commands/
    install.ts
    build.ts
    test.ts
```

Promote a command to its own directory when it accumulates supporting code:

```
commands/
    install.ts          # still flat — no supporting files yet
    build/              # promoted — has its own helpers
        index.ts        # entry the parent imports
        bundler.ts
        cache.ts
    test/
        index.ts
        runner.ts
        fixtures.ts
```

Do not create `index.ts` while it would be the only file in the folder. Keep the flat `./commands/<name>.ts` file until there is actually something else to put alongside it — a folder with one `index.ts` adds path depth and import ceremony without delivering co-location benefit.

The promotion is reversible. If supporting code later goes away, collapse the folder back to a flat file.

## Passing data down to subcommands

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

### Per-command type narrowing

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

## Layered flags

**Each level of a multi-command CLI can declare its own flags.** Parent flags apply to whichever subcommand runs; child flags apply only to that subcommand. The parent passes its parsed flags down via `runCommand(data)`, the child receives them as the first argument to its default export. Real CLIs like `git`, `docker`, and `kubectl` use this pattern — global options before the subcommand, subcommand-specific options after.

> [!NOTE]
> **Looking for global or persistent flags?** cleye has no global-flag primitive (no yargs `.global()`, no oclif or commander persistent flags). This forwarding pattern is the equivalent: the parent declares the flag once and passes its value to whichever subcommand runs. Each level keeps owning its own argv slice, and the parent decides exactly what each child receives. To declare the same flag at multiple levels without repeating yourself, see [Sharing flags](#sharing-flags).

### Global flags

The parent resolves a global flag into shared state that every subcommand needs, then forwards the result to the child through `runCommand(data)`. The child receives it as the first argument to its default export — it never declares the flag itself. Here a `--user-id` flag is looked up into a `user` object and handed to whichever subcommand runs:

```ts
// cli.ts (parent)
await cli({
    flags: {
        userId: {
            type: String,
            description: 'User to act as'
        }
    },
    commands: {
        status: () => import('./commands/status.ts')
    }
}, async ({ flags, runCommand }) => {
    const user = await getUserById(flags.userId)
    await runCommand(user)
})
```

```ts
// commands/status.ts (child)
import { cli } from 'cleye'

type User = {
    id: string
    name: string
}

export default (user: User) => cli({
    flags: {
        short: {
            type: Boolean,
            alias: 's'
        }
    }
}, (parsed) => {
    renderStatus(user, parsed.flags.short)
})
```

`my-cli --user-id 42 status` looks up user `42` at the parent and passes the loaded `user` to `status`, which uses it alongside its own `--short`. A global flag goes before the command, where the parent owns and parses it.

The same callback can derive and forward several values at once. A minimal `git` reimplementation:

```ts
// cli.ts (parent)
await cli({
    name: 'git',
    flags: {
        C: {
            type: String,
            default: '.',
            placeholder: '<path>',
            description: 'Run as if started in <path>'
        },
        noPager: {
            type: Boolean,
            description: 'Disable the pager'
        }
    },
    commands: {
        status: () => import('./commands/status.ts'),
        log: () => import('./commands/log.ts')
    },
    booleanFlagNegation: true
}, async ({ flags, runCommand }) => {
    // Parent flags become typed context for whichever subcommand runs.
    await runCommand({
        cwd: flags.C,
        pager: !flags.noPager
    })
})
```

```ts
// commands/status.ts (child)
import { cli } from 'cleye'

type Context = {
    cwd: string
    pager: boolean
}

export default ({ cwd, pager }: Context) => cli({
    // Child declares its own flags. Parent flags are NOT inherited at the
    // flag level — they arrive via the `Context` argument instead.
    flags: {
        short: {
            type: Boolean,
            alias: 's',
            description: 'Give the output in the short-format'
        }
    }
}, (parsed) => {
    runStatus(cwd, parsed.flags.short, pager)
})
```

Invocation:

```sh
git -C /tmp --no-pager status --short
#   ^^^^^^^^^^^^^^^^^^^^^^^^         parent flags
#                             ^^^^^^ child flag
```

The parent's callback acts as middleware between the user's invocation and the child: it picks which subset of parent state the child needs, transforms it (e.g. `pager: !flags.noPager`), and forwards it. The child sees a clean typed `Context` instead of reaching back into a parent argv it doesn't own.

> [!WARNING]
> **Don't blind-merge the parent's flags into the child's.** It is tempting to forward the parent's whole `flags` object and spread-merge it (`{ ...parentFlags, ...parsed.flags }`). But a flag the user didn't pass is not absent: it carries a value (`undefined` for most types, `[]` for an array flag, or whatever `default` the child declared), and that value overwrites the forwarded one. Forwarding a small transformed context (as above, or as in the `git` example) sidesteps this: there is nothing to merge. If you must merge raw flag objects, drop the unset keys first, and don't give a shared child flag a `default` (a configured default is indistinguishable from a user-passed value, so apply it as a fallback after merging instead, e.g. `merged.json ?? false`):
> ```ts
> const isSet = (value: unknown) => (
>     value !== undefined && !(Array.isArray(value) && value.length === 0)
> )
> const defined = Object.fromEntries(
>     Object.entries(parsed.flags).filter(([, value]) => isSet(value))
> )
> const merged = {
>     ...context,
>     ...defined
> }
> ```

See [`examples/07-git`](../examples/07-git) for the full runnable version. The same pattern composes through deeper nesting — see [Nested commands](#nested-commands) below.

### Sharing flags

Re-declaring the same flag at every level (as the forwarding example above does with `json: Boolean`) gets repetitive. Define it once in a module and spread it into each `flags` object. Assert its shape with `satisfies Flags`: when flags are written inline, a malformed entry is caught by `cli()`'s parameter type, but a standalone object gets no such check unless you add one.

```ts
// flags.ts
import type { Flags } from 'cleye'

export const globalFlags = {
    json: {
        type: Boolean,
        description: 'Output as JSON'
    }
} satisfies Flags
```

```ts
// cli.ts (parent)
import { cli } from 'cleye'
import { globalFlags } from './flags.ts'

const argv = cli({
    flags: { ...globalFlags },
    commands: {
        status: () => import('./commands/status.ts')
    }
})

await argv.runCommand()
```

```ts
// commands/status.ts (child)
import { cli } from 'cleye'
import { globalFlags } from './flags.ts'

const argv = cli({
    flags: {
        ...globalFlags,
        short: {
            type: Boolean,
            alias: 's'
        }
    }
})

argv.flags.json // => boolean | undefined (typed through the spread)
argv.flags.short // => boolean | undefined
```

`satisfies` validates each definition at its source — a typo like `alias: 123` errors in `flags.ts` rather than slipping through — while preserving the inferred types, so `argv.flags` stays precisely typed at each level (an undeclared flag like `argv.flags.nope` is still a compile error). Avoid a type annotation (`const globalFlags: Flags = ...`) for this: it widens the value to `Flags` and erases the per-flag types, so the spread would no longer type `argv.flags`. Each level parses its own occurrence: `cli --json status` sets it at the parent, `cli status --json` sets it at the child.

> [!TIP]
> **Group flags when sharing.** When the shared flags form a logical group, define the module with [`group()`](./flags.md#grouping-flags) instead of `satisfies Flags`. It validates and infers the same way, and tags each flag so it renders under a shared `--help` heading at every level it's spread into:
> ```ts
> // flags.ts
> import { group } from 'cleye'
>
> export const globalFlags = group('Global', {
>     json: {
>         type: Boolean,
>         description: 'Output as JSON'
>     }
> })
> ```

Spreading reuses the *definition*, not the *value*: it does not pass a parsed value between levels. If the child must know the flag regardless of where it appeared, combine this with the forwarding pattern above — spread the definition into both levels so either placement is accepted, and forward the parent's value so the child can fall back to it:

```ts
// commands/status.ts (child)
export default (json: boolean) => cli({
    flags: {
        ...globalFlags,
        short: {
            type: Boolean,
            alias: 's'
        }
    }
}, (parsed) => {
    // Own placement wins; otherwise use the forwarded parent value.
    render(parsed.flags.json ?? json)
})
```

Now `--json` is accepted before or after the command and the child always sees the effective value. Keep the shared flag free of a `default` so an unset child flag stays `undefined` and the `??` fallback works; apply any default at the very end (e.g. `parsed.flags.json ?? json ?? false`).

## Nested commands

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

## Option inheritance

`strictFlags`, `strictCommands`, `booleanFlagNegation`, and `throwOnExit` automatically inherit from parent to child through all nesting levels. A child can override any inherited option:

```ts
// Parent enables strictFlags for all commands
cli({
    strictFlags: true,
    commands: {
        // This command disables strictFlags for itself
        build: () => import('./commands/build.ts')
    }
})
```

```ts
// commands/build.ts — overrides parent
cli({
    strictFlags: false, // Override parent's strictFlags
    flags: { watch: Boolean }
})
```


## Strict commands
To reject unknown command names with an error, enable `strictCommands`:

```ts
cli({
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

