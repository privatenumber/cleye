# Sync mode (no callback)

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

## When to use which

| | Callback (default) | Sync mode |
| - | - | - |
| Return type | `Promise<CallbackReturn>` | `ParsedArgv` (synchronous) |
| Matched command | Auto-invoked after callback | **Caller must invoke** |
| Style | Middleware — async composition | Linear top-level code |
| Top-level await needed | Yes (or `.then()`) | No (until `runCommand`) |
| Errors | Sync throw OR rejected Promise | Sync throw |

For **command-heavy CLIs** the callback form is usually shorter and safer — auto-invoke handles the common case, and unhandled errors surface naturally through the awaited Promise. Reach for sync mode when you genuinely need direct argv access without async coloring (e.g., parsing in a sync helper).

## Sync mode with commands

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

## Returning values from sync mode

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

## Errors in sync mode

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

