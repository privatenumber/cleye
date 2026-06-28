# Getting started

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
> **Two ways to call `cli()`.** This example uses the **callback** form: pass a function as the second argument and it runs after argv is parsed, with the parsed `argv` as its argument. The Promise from `cli()` resolves to whatever the callback returns, and a matched command auto-invokes after it — this is the recommended default, especially once you have commands.
>
> Called **without** a callback, `cli()` returns the parsed `argv` synchronously (**sync mode**) — handy for simple parsers or sync helpers, but you invoke commands yourself. See [Sync mode](./sync-mode.md#when-to-use-which) for the full comparison.

> [!TIP]
> Pull `name` and `version` from your `package.json` to keep them in sync:
> ```ts
> import packageJson from './package.json' with { type: 'json' }
>
> cli({
>     name: packageJson.name,
>     version: packageJson.version
> })
> ```
> Do this at your CLI's entry point — subcommands get their name from the command map and don't pull from `package.json`. `name` should be your **bin** name (the command users type): that's `package.json`'s `name` for a single-binary package, but set it explicitly when they differ — a scoped name (`@acme/cli` → bin `cli`), multiple bins, or a deliberately different command (package `grep-app-api` → bin `grep-app`).

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
Browse [`examples/`](../examples) for a numbered, progressive set — start with [`01-minimal`](../examples/01-minimal/index.ts) and follow the order; each step adds one concept. See [`examples/README.md`](../examples/README.md) for the roadmap.

