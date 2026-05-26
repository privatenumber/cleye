# Design Recipes

Use this reference when choosing the shape of a cleye CLI, reviewing generated
code, or resolving ambiguous behavior before implementation.

## Combine Parameters and Commands for Fallbacks

At one `cli()` level, you can use `parameters` for positional values and `commands` for
dispatch. They can be combined to create hybrid CLIs with a default mode:

```ts
cli({
    parameters: ['[script]'],
    commands: {
        build: () => import('./commands/build.ts')
    }
})
```

If the leading positional token matches a registered command, it resolves as the
command. If it does not match, it falls back to being parsed as a parameter.

In the combined mode, cleye refuses two configurations at config time:

- **Required parameters** (`<name>`, not `[name]`): when a command matches,
  parameter validation is bypassed, so the "required" annotation would only
  fire in the fallback path. Asymmetric in a confusing way.
- **`strictCommands: true`**: strict-mode treats unknown positionals as command
  typos; parameters absorbs them as values. Semantically opposed; cleye refuses
  to let strictCommands be silently neutered.

Use this rule:

| Desired shape | Use |
| --- | --- |
| `tool input.txt --json` | `parameters` |
| `tool build --watch` | `commands` |
| `tool remote add origin` | nested `commands` |
| `tool [script] --flags` | `parameters` and `commands` combined |

For wildcard dispatch or a default fallback mode, inspect the parameters in
the callback:

```ts
await cli({
    parameters: ['[script]', '[args...]'],
    commands: {
        build: () => import('./commands/build.ts')
    }
}, async (parsed) => {
    if (parsed.command === undefined && parsed._.script) {
        await runDynamicCommand(parsed._.script, parsed._.args)
        return
    }

    await parsed.runCommand()
})
```

Enable `strictCommands: true` when unknown commands should be treated as typos
instead of falling back to parameters or custom wildcard input.

## Choose Callback Or Sync Mode

Prefer callback mode for command-heavy CLIs:

```ts
await cli({
    commands: {
        build: () => import('./commands/build.ts')
    }
}, async ({ runCommand }) => {
    await runCommand()
})
```

Callback mode gives each level a middleware step and auto-invokes a matched
command after the callback returns if the callback did not call `runCommand()`.

Use sync mode for simple parsers or sync wrappers:

```ts
const argv = cli({
    parameters: ['<file>'],
    flags: { json: Boolean }
})
```

With commands, sync mode never auto-invokes. The caller must handle command
execution and errors:

```ts
const argv = cli({
    commands: {
        build: () => import('./commands/build.ts')
    }
})

await argv.runCommand()
```

## Choose Command File Style

Use side-effect command files when the parent only needs to load the command:

```ts
// commands/build.ts
import { cli } from 'cleye'

await cli({
    flags: { watch: Boolean }
}, (argv) => {
    runBuild(argv.flags.watch)
})
```

This is the shortest lazy import path and also lets the command file run
standalone during development. JavaScript module caching still applies: a
second dynamic import of the same side-effect file does not re-run its top-level
`cli()` call.

Use default-export command files when the parent passes data, needs return
values, or may retry:

```ts
// commands/build.ts
import { cli } from 'cleye'

export default (config: Config) => cli({
    flags: { watch: Boolean }
}, (argv) => {
    return runBuild(config, argv.flags.watch)
})
```

`runCommand(config)` invokes the exported function each time and forwards that
call's arguments.

## Choose Command File Layout

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
    install.ts           # still flat — no supporting files yet
    build/               # promoted — has its own helpers
        index.ts         # entry the parent imports
        bundler.ts
        cache.ts
    test/
        index.ts
        runner.ts
        fixtures.ts
```

Do not create `index.ts` while it would be the only file in the folder. Keep the
flat `./commands/<name>.ts` file until there is actually something else to put
alongside it. A folder with one `index.ts` adds path depth and import ceremony
without delivering co-location benefit.

The promotion is reversible. If supporting code later goes away, collapse the
folder back to a flat file.

## Use Layered Flags For Multi-Command CLIs

Each command level declares its own flags. Parent flags apply to whichever
subcommand runs; child flags apply only to that subcommand. Real CLIs like
`git`, `docker`, and `kubectl` use this pattern — global options before the
subcommand, subcommand-specific options after.

The parent passes its parsed flags down as typed context via `runCommand(data)`.
The child receives it via the default-export argument:

```ts
// cli.ts (parent)
await cli({
    name: 'git',
    flags: {
        C: { type: String, default: '.' },
        noPager: { type: Boolean }
    },
    commands: {
        status: () => import('./commands/status.ts')
    },
    booleanFlagNegation: true
}, async ({ flags, runCommand }) => {
    await runCommand({
        cwd: flags.C,
        pager: !flags.noPager
    })
})
```

```ts
// commands/status.ts (child) — has its OWN flags
type Context = { cwd: string; pager: boolean }

export default ({ cwd, pager }: Context) => cli({
    flags: { short: { type: Boolean, alias: 's' } }
}, (parsed) => {
    runStatus(cwd, parsed.flags.short, pager)
})
```

Invocation: `git -C /tmp --no-pager status --short`. Parent flags (`-C`,
`--no-pager`) come before the subcommand; child flags (`--short`) come after.

The parent's callback acts as middleware: pick which subset of parent state the
child needs, transform it (e.g. `!flags.noPager`), and forward it. The child
doesn't reach back into parent argv it doesn't own.

For deeper nesting, the same pattern composes: each level's callback passes a
context to the next via `runCommand(data)`.

## Choose Strict Or Permissive Parsing

Use strict modes for tools with a known command and flag surface:

```ts
await cli({
    strictFlags: true,
    strictCommands: true,
    commands: {
        build: () => import('./commands/build.ts')
    }
})
```

Leave strict modes off for wrappers that intentionally forward unknown flags or
dynamic command names. In that case, read `argv.unknownFlags` and `argv._`
explicitly so the forwarding behavior is visible in code review.

## Choose Help Customization Level

Start with declarative help:

```ts
cli({
    name: 'tool',
    version: '1.2.3',
    help: {
        description: 'Build project assets.',
        examples: ['tool build --watch']
    }
})
```

Use `help.render` only when the default document cannot express the needed
layout. Prefer extending `defaultHelp(options, { form })` before replacing the
whole document.
