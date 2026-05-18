# Design Recipes

Use this reference when choosing the shape of a cleye CLI, reviewing generated
code, or resolving ambiguous behavior before implementation.

## Choose Parameters Or Commands

At one `cli()` level, use `parameters` for positional values and `commands` for
dispatch. Do not define both at the same level:

```ts
cli({
    parameters: ['<file>'],
    commands: {
        build: () => import('./commands/build.ts')
    }
})
```

The leading positional token cannot safely be both a command candidate and a
parameter value. If a command typo fell through as a parameter, the CLI would
run the wrong path instead of failing fast.

Use this rule:

| Desired shape | Use |
| --- | --- |
| `tool input.txt --json` | `parameters` |
| `tool build --watch` | `commands` |
| `tool remote add origin` | nested `commands` |
| `tool run any-name -- --flags` | `commands` plus wildcard handling |

For wildcard dispatch, keep a command map and inspect unmatched positionals in
the callback:

```ts
await cli({
    commands: {
        build: () => import('./commands/build.ts')
    }
}, async (parsed) => {
    if (parsed.command === undefined && parsed._[0]) {
        const [commandName, ...commandArgv] = parsed._
        await runDynamicCommand(commandName, commandArgv)
        return
    }

    await parsed.runCommand()
})
```

Enable `strictCommands: true` when unknown commands should be treated as typos
instead of custom wildcard input.

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
