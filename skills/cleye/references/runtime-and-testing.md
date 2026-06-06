# Runtime And Testing

Use this reference when embedding cleye in a host process, writing tests around CLI parsing, passing custom argv, or choosing sync mode.

## Custom Argv

`cli(options, callback?, argv?)` takes raw argv as the third argument. If there is no callback, pass `undefined` in the second slot:

```ts
const argv = cli({
    flags: { verbose: Boolean }
}, undefined, ['--verbose'])
```

Passing the argv array as the second argument is wrong because the second argument is the callback position.

## `throwOnExit`

By default, cleye calls `process.exit` for help, version, missing required parameters, strict flag failures, strict command failures, and no-command-match sync mode. Use `throwOnExit: true` when the host process should stay alive:

```ts
import { CleyeExit, cli } from 'cleye'

try {
    cli({
        throwOnExit: true,
        flags: { verbose: Boolean }
    }, undefined, ['--help'])
} catch (error) {
    if (error instanceof CleyeExit) {
        console.log(error.reason, error.code)
    } else {
        throw error
    }
}
```

`CleyeExit.code` is `0` for help/version and `1` for validation failures. `CleyeExit.reason` identifies the exit cause.

## Sync Mode

Without a callback, `cli()` returns `ParsedArgv` synchronously:

```ts
const argv = cli({
    flags: { verbose: Boolean }
})
```

This is useful for simple parsers and tests. With commands, sync mode does not auto-invoke the matched command:

```ts
const argv = cli({
    commands: {
        greet: () => import('./commands/greet.ts')
    }
})

await argv.runCommand()
```

Handle async errors from `runCommand()` yourself, usually with `try/catch` or an IIFE `.catch()` at the script boundary.

If `commands` is defined and no command matches in sync mode, cleye shows help and exits. With `throwOnExit: true`, this becomes a `CleyeExit` with `reason === 'no-command-match'`.

## Callback Results

With a callback, `cli()` returns a Promise for the callback's return value:

```ts
const result = await cli({
    flags: { json: Boolean }
}, async (argv) => {
    return argv.flags.json ? 'json' : 'text'
})
```

If a command matched and the callback did not call `runCommand()`, cleye auto-invokes the command after the callback resolves. The auto-invoked command's return value is discarded. Call `runCommand()` yourself when the parent needs to capture a command result or handle command errors locally.

## Manual Help And Version

`parsed.showHelp(options?)` prints help with optional content overrides. `parsed.showVersion()` prints the configured version and is a no-op when no version is configured.

When overriding help in middleware, pass only the fields you want to change:

```ts
await cli({
    help: { description: 'Parent help.' },
    commands: {
        build: () => import('./commands/build.ts')
    }
}, async (parsed) => {
    if (!parsed.command) {
        parsed.showHelp({ description: 'Choose a command.' })
    }
})
```

## Errors

Parse-time errors throw during `cli()`. Command errors happen when the command runs:

```ts
try {
    const argv = cli(options)
    await argv.runCommand()
} catch (error) {
    console.error(error)
    process.exit(1)
}
```

In callback mode, `await cli(options, callback)` rejects if the callback or auto-invoked command rejects.
