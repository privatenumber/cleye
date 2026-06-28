# Migration guide — cleye v3

This guide covers what changes between `cleye@2.x` (the current `master` release line) and the upcoming v3 (`beta`).

- [Breaking changes](#breaking-changes) — code or config you must update to upgrade
- [New features & behavior changes](#new-features--behavior-changes) — improvements that may need attention

---

## Breaking changes

### `command()` removed — use `commands` object map

`command()` is gone. Commands are now declared as a plain object inside `cli()`.

**Before:**

```ts
import { cli, command } from 'cleye'

cli({
    name: 'npm',
    commands: [
        command({
            name: 'install',
            parameters: ['<package name>'],
            flags: { saveDev: Boolean }
        }, (argv) => {
            console.log(argv._.packageName)
        })
    ]
})
```

**After:**

```ts
import { cli } from 'cleye'

cli({
    name: 'npm',
    commands: {
        install: {
            description: 'Install a package',
            loader: async () => {
                const argv = await cli({
                    parameters: ['<package name>'],
                    flags: { saveDev: Boolean }
                })
                console.log(argv._.packageName)
            }
        }
    }
})
```

The key in the `commands` map is the command name. Nested `cli()` calls inside `loader` inherit `strictFlags`, `booleanFlagNegation`, and the parent command name via `AsyncLocalStorage`. The `Command` type export is also removed.

---

### `cli()` with a callback is async; without a callback it stays sync

`cli()`'s return type now depends on whether you pass a callback:

- **Without a callback**: `cli()` returns `ParsedArgv` synchronously. No migration needed for this case.
- **With a callback**: `cli()` returns `Promise<CallbackReturn>` — the resolved value is whatever the callback returns. Callers must `await` it (or `.then()`).

**Sync:**

```ts
const argv = cli({ /* ... */ })
console.log(argv.flags.verbose)
```

**Async (new):**

```ts
const argv = await cli({ /* ... */ }, parsed => parsed)
console.log(argv.flags.verbose)
```

In sync mode, matched commands are **not** auto-invoked — call `await argv.runCommand()` yourself if you have commands. The async (callback) path still auto-invokes after the callback returns.

The `MaybePromise` type export is also removed.

---

### Help-rendering API rewritten

This is the largest change. The old `Renderers`-class pipeline is replaced by a composable component API.

**Removed exports:**

- `Renderers` class
- `createRenderer()`
- `HelpDocumentNode` type
- `help.renderers` option
- `cleye/renderers/responsive` subpath

**Added:**

- `cleye/help` subpath — `render`, `defaultHelp`, and components: `p`, `usage`, `section`, `cmds`, `flags`, `flagsColumns`, `flagsStacked`, `footer`
- `cleye/formats` subpath — `oneOf`, `commaList`, `integer`, `float`, `range`, `url`

**`help.render` callback signature changed:**

| | Before | After |
| :--- | :--- | :--- |
| Signature | `(nodes: HelpDocumentNode[], renderers: Renderers) => string` | `(options: CliOptions, opts: { form: 'short' \| 'long' }) => string` |

**Before:**

```ts
import { cli } from 'cleye'

cli({
    help: {
        render(nodes, renderers) {
            nodes.push('\nDocs: https://example.com/docs')
            return renderers.render(nodes)
        }
    }
})
```

**After:**

```ts
import { cli } from 'cleye'
import { render, defaultHelp, footer } from 'cleye/help'

cli({
    help: {
        render(options, { form }) {
            return render(
                defaultHelp(options, { form }),
                footer('Docs: https://example.com/docs')
            )
        }
    }
})
```

> [!TIP]
> If you only need the default output unchanged, omit `help.render` entirely — `defaultHelp` is now the default renderer.

---

### `cli()` with a callback resolves to the callback's return value

When you pass a callback, `cli()` now resolves to whatever the callback returns. Previously the return was discarded and `cli()` always resolved to `ParsedArgv`.

If you want `ParsedArgv` from the async path, pass `(parsed) => parsed`. If you want a derived value, return it from the callback. The callback path also auto-invokes matched commands after the callback returns if the callback didn't call `runCommand` itself; that auto-invoke's return value is discarded.

**Before:**

```ts
const argv = await cli(
    { flags: { verbose: Boolean } },
    (parsed) => {
        console.log(parsed.flags.verbose)
    },
    process.argv.slice(2)
)
// argv is ParsedArgv (callback return ignored)
```

**After — callers wanting `ParsedArgv`:**

```ts
const argv = await cli(
    { flags: { verbose: Boolean } },
    parsed => parsed,
    process.argv.slice(2)
)
```

**After — callers wanting a derived value:**

```ts
const port = await cli(
    { flags: { verbose: Boolean } },
    async () => loadConfig().port,
    process.argv.slice(2)
)
```

---

### `parameters` and `commands` are mutually exclusive

You can no longer pass both `parameters` and `commands` at the same level. The leading positional cannot meaningfully be both a parameter value and a command name without violating fail-fast (a typo in a command name would silently become a parameter value).

This is enforced at the type level (TS error if both are passed) and at runtime (synchronous throw).

**To accept arbitrary command names** — e.g., a script runner — keep `commands` defined and inspect `parsed.command === undefined` plus `parsed._[0]` in your callback:

```ts
cli({
    commands: {
        build: () => { /* known */ }
    }
}, (parsed) => {
    if (parsed.command === undefined && parsed._[0]) {
        // wildcard: parsed._[0] is the unknown name, parsed._.slice(1) are its args
    }
})
```

---

### Node.js 22.22.2+ required

`engines.node` is now `>=22.22.2`. Node 18 and Node 20 are no longer supported.

---

### CJS distribution dropped — ESM only

The package no longer ships a CommonJS build. If your project uses `require()`:

- Migrate to ESM (`"type": "module"` in `package.json`, `.mjs` extension, or `import` syntax), or
- Use a dynamic `import()` call from CJS:

  ```ts
  const { cli } = await import('cleye')
  await cli({ /* ... */ })
  ```

---

## New features & behavior changes

### Flag kebab-casing now respects acronyms

Flag names with consecutive uppercase letters are now cased correctly on the CLI. If your users pass the old broken form, they must update.

| Declaration | Before (broken) | After (correct) |
| :--- | :--- | :--- |
| `orgID: String` | `--org-i-d` | `--org-id` |
| `baseURL: String` | `--base-u-r-l` | `--base-url` |

Update any scripts or documentation that referenced the old broken forms.

---

### Single-character flag names (type-flag v5)

`type-flag` v5 enables single-character flag names to be declared directly:

```ts
const _flags = { v: Boolean } // parses -v
```

Previously, single-char flags could only be set as `alias`. With v5, declaring `alias` on a single-character flag name **throws at runtime**. If you were using the `alias` field to register a single-char shorthand for a flag whose key is also one character long, move the declaration to the flag name directly and drop the `alias`.

---

### `NO_COLOR` / `FORCE_COLOR` now respected

Help output previously used `tty.WriteStream.prototype.hasColors()`, which ignores `NO_COLOR` and `FORCE_COLOR=0`.

Color detection is now handled by [`ansis`](https://npm.im/ansis), which respects:

- `NO_COLOR=1` — disables ANSI escapes
- `FORCE_COLOR=1` — forces ANSI escapes even in non-TTY environments
- `TERM=dumb`, `CI`, and other standard signals

This is a **behavior fix**, not an API change — but if your test suite asserts exact help output, you may need to set `FORCE_COLOR=1` to get consistent ANSI output in CI.

---

### Two-tier help: `-h` (short) vs `--help` (long)

`-h` and `--help` are now separate flags producing different output:

- `-h` — cheatsheet: usage line, command names, one-line flag list
- `--help` — full manual: descriptions, defaults, examples

If you have a custom `help.render`, the second argument includes `{ form: 'short' | 'long' }`. You can ignore it to produce the same output for both tiers, or branch on it to implement the two levels:

```ts
import { defaultHelp } from 'cleye/help'

cli({
    help: {
        render(options, { form }) {
            // Delegate entirely to the default — it handles both tiers
            return defaultHelp(options, { form })
        }
    }
})
```

---

### `runCommand` is typed per matched command and mirrors sync/async

The `runCommand` returned to your callback is now typed by the discriminated `parsed.command`. Within a `parsed.command === 'build'` branch, `runCommand`'s parameter and return types match `build`'s handler — including arity, argument types, and Promise-or-sync return shape.

```ts
cli({
    commands: {
        connect: (host: string, port: number) => `${host}:${port}` as const,
        // Async loader:
        serve: { loader: () => import('./serve.ts') }
    }
}, async (parsed) => {
    if (parsed.command === 'connect') {
        // Sync handler → sync return. TypeScript enforces (host: string, port: number).
        const url = parsed.runCommand('localhost', 3000)
    }
    if (parsed.command === 'serve') {
        // Async loader → Promise return.
        await parsed.runCommand()
    }
})
```

`runCommand` invokes the matched command each time you call it, using that call's arguments. When no command matched, it's a callable noop returning `undefined` (sync), so `await argv.runCommand()` works regardless.

---

### `strictCommands` — error on unknown commands

Mirrors `strictFlags`. When `strictCommands: true`, an unrecognized command name errors and exits instead of falling through to the help-on-no-match path. Closest matches within 2 edits are suggested, including aliases (with the canonical name surfaced):

```sh
$ my-cli biuld
Error: Unknown command: "biuld". (Did you mean "build"?)
```

Inherited by nested `cli()` calls via context, like `strictFlags` and `booleanFlagNegation`.

---

### Alias-aware strict-mode suggestions

When the closest match for an unknown flag or command is an alias, the suggestion now surfaces the canonical name too:

```sh
$ my-cli adde
Error: Unknown command: "adde". (Did you mean "add" (alias for "install")?)
```

On a distance tie, the canonical wins. Single-character flag aliases are unaffected because the suggestion threshold filters short tokens.

---

### `throwOnExit` + `CleyeExit` for embedding

By default cleye still calls `process.exit` on `--help`, `--version`, validation failures, and `strictFlags` / `strictCommands` errors. To embed cleye in a host process and recover control, set `throwOnExit: true` and catch the exported `CleyeExit`:

```ts
import { cli, CleyeExit } from 'cleye'

try {
    await cli({ throwOnExit: true /* ... */ })
} catch (error) {
    if (error instanceof CleyeExit) {
        // error.code: 0 for --help / --version, 1 for validation failures
        // error.reason: 'help' | 'version' | 'missing-required-parameter' |
        //               'unknown-flag' | 'unknown-command' | 'no-command-match'
    }
}
```

`throwOnExit` is inherited by nested `cli()` calls — set it once at the top.
