# Commands

Use this reference when a cleye CLI has subcommands, aliases, lazy command files, strict command mode, nested commands, or parent-to-child data flow.

## Command Map

Commands are defined as a map. The key is the canonical command name:

```ts
await cli({
    name: 'npm',
    commands: {
        install: {
            description: 'Install a package',
            alias: ['i', 'add'],
            loader: () => import('./commands/install.ts')
        },
        run: () => import('./commands/run.ts')
    }
})
```

Use object entries when the command needs metadata for help output. Use a bare function when there is no alias or description.

You can combine `commands` with `parameters` at the same `cli()` level. If the first positional token matches a registered command, it resolves as the command; otherwise, it falls back to parsing as parameters. Read [Design Recipes](design-recipes.md) for wildcard command dispatch.

When combining, cleye rejects two configurations at config time:

- **Required parameters** (`<name>`): when a command matches, parameter validation is bypassed, so the "required" annotation would only fire in the fallback path. Use `[name]` instead.
- **`strictCommands: true`**: strict-mode errors on unknown positionals; parameters absorbs them. Pick one.

## Command Boundary

The first positional token is the command candidate. Parent flags must appear before that token. Child flags appear after it:

```sh
tool --verbose install lodash --save-dev
#    parent flag       child command argv
```

A flag is owned by the level adjacent to the command name. A flag before the command goes to the parent and the subcommand never sees it; a flag after goes to the subcommand. The level that didn't declare the flag collects it into `unknownFlags` and ignores it, or rejects it under `strictFlags`. So a flag that must work on either side is declared at both levels, with the parent forwarding its value via `runCommand(data)` (see the `runCommand` section) so the child can fall back to it. cleye has no global or persistent flag primitive; this forwarding is the equivalent.

If a command name is misspelled and `strictCommands` is enabled, cleye reports the command typo before parsing flags after that candidate.

## Lazy Command Files

For ordinary lazy imports, use side-effect style. The imported module calls `cli()` at top level and parses the argv after the command name:

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

This style doubles as a standalone development entry point because running the file directly also executes its `cli()` call.

Because this is normal JavaScript module evaluation, module caching applies. A second dynamic import of the same side-effect file does not re-run its top-level `cli()` call. Use default-export style when `runCommand()` may be called more than once.

## `runCommand`

In callback mode, cleye auto-invokes the matched command after the callback returns unless the callback already called `parsed.runCommand()`.

Call `runCommand(data)` when the parent needs to pass parsed parent flags, config, or other context to the command:

```ts
await cli({
    flags: {
        C: {
            type: String,
            default: '.'
        }
    },
    commands: {
        status: () => import('./commands/status.ts')
    }
}, async ({ flags, runCommand }) => {
    await runCommand({ cwd: flags.C })
})
```

Use default-export style in the command file to receive that data:

```ts
// commands/status.ts
import { cli } from 'cleye'

type Context = {
    cwd: string
}

export default ({ cwd }: Context) => cli({
    flags: { short: Boolean }
}, (argv) => {
    console.log(cwd, argv.flags.short)
})
```

Forward a small transformed context like `{ cwd }` rather than the raw `flags` object. If you spread-merge raw flags (`{ ...parentFlags, ...parsed.flags }`), unset child flags clobber the forwarded values: a typed flag defaults to `undefined`, an array flag to `[]`, and a flag with a configured `default` to that default. Drop unset keys before merging if you must, and don't give a shared child flag a `default` (it is indistinguishable from a user value; apply it as a post-merge fallback instead).

`runCommand` invokes the matched command every time it is called and uses the arguments from that call. Store the returned value or Promise yourself when you need to reuse a result.

The return value mirrors the matched handler. Sync handlers return sync values; async handlers and dynamic import loaders return Promises. When no command matched, `runCommand` is a sync no-op that returns `undefined`.

Narrow on `parsed.command` to get per-command argument and return types:

```ts
await cli({
    commands: {
        ping: () => 'pong' as const,
        connect: (host: string) => ({ host, connected: true })
    }
}, async (parsed) => {
    if (parsed.command === 'connect') {
        const result = await parsed.runCommand('localhost')
        result.connected // boolean
    }
})
```

## Strict Commands And Flags

Use strict mode when typos should fail:

```ts
await cli({
    strictFlags: true,
    strictCommands: true,
    commands: {
        build: () => import('./commands/build.ts'),
        install: {
            alias: ['add', 'i'],
            loader: () => import('./commands/install.ts')
        }
    }
})
```

`strictFlags`, `strictCommands`, `booleanFlagNegation`, and `throwOnExit` inherit through nested `cli()` calls. A child command can override them.

## Nested Commands

Each command file can define its own `commands` map. This supports shapes like `git remote add`:

```ts
// parent
await cli({
    commands: {
        remote: () => import('./commands/remote.ts')
    }
})

// commands/remote.ts
await cli({
    commands: {
        add: () => import('./remote/add.ts')
    }
})
```

Keep each level responsible for its own flags, help, and command map.
